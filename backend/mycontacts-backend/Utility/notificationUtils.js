const notification = require('../models/freelancer_notificationModel');
const { dispatchEmailForUser } = require('../services/emailservice');

/**
 * Sends notifications to one or more users.
 * Handles database persistence, real-time socket emission, and email dispatch.
 * 
 * Chat notifications use a fully atomic upsert ($elemMatch + $inc) to prevent
 * race conditions when multiple messages are sent simultaneously.
 *
 * @param {string|string[]} userIds - Single ID or array of user IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {object} context - Express request object OR Socket.io instance
 * @param {object} options - Optional settings (e.g., { delayEmailMinutes: 5, chatProjectId: 'p123' })
 */
async function sendNotification(userIds, title, message, context, options = {}) {
    const { delayEmailMinutes = 0, chatProjectId = null, skipEmail = false, count = 1, p_id = null } = options;
    try {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const io = context?.app ? context.app.get("io") : context;
        const isChatNotification = title.startsWith("New Message: ");

        // In-memory locks to prevent race conditions during "Check-then-Push" operations
        global.notificationLocks = global.notificationLocks || {};

        const notificationPromises = ids.map(async (usrid) => {
            if (!usrid) return null;

            // Acquire lock for this user+title combo
            const lockKey = `${usrid}_${title}`;
            while (global.notificationLocks[lockKey]) {
                await global.notificationLocks[lockKey];
            }
            let resolveLock;
            global.notificationLocks[lockKey] = new Promise(res => resolveLock = res);

            try {
                const time = new Date().toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour12: true,
                    hour: "2-digit",
                    minute: "2-digit",
                });

                let newNotification = null;

                if (isChatNotification) {
                    // ─── STEP 1: Try to Atomic Increment Existing Unread Notification ───
                    const updatedDoc = await notification.findOneAndUpdate(
                        {
                            usr_id: usrid,
                            messages: { $elemMatch: { title: title, isread: false } }
                        },
                        {
                            $inc: { "messages.$.count": count },
                            $set: { "messages.$.time": time }
                        },
                        { new: true }
                    );

                    if (updatedDoc) {
                        // Found and incremented. Now sync the display message to reflect the TOTAL count.
                        const existingMsg = updatedDoc.messages.find(m => m.title === title && !m.isread);
                        if (existingMsg) {
                            const totalCount = existingMsg.count;
                            const syncMsg = `You have ${totalCount} new ${totalCount === 1 ? 'message' : 'messages'}`;
                            
                            // Update the text in the DB
                            await notification.updateOne(
                                { usr_id: usrid, "messages._id": existingMsg._id },
                                { $set: { "messages.$.message": syncMsg } }
                            );
                            
                            // Prepare object for socket emission
                            newNotification = { 
                                ...existingMsg.toObject ? existingMsg.toObject() : existingMsg, 
                                message: syncMsg 
                            };
                        }
                    } else {
                        // ─── STEP 2: No unread found — Push a fresh notification ───
                        const initialMsg = count === 1 ? "You have 1 new message" : `You have ${count} new messages`;
                        const pushResult = await notification.findOneAndUpdate(
                            { usr_id: usrid },
                            {
                                $push: {
                                    messages: {
                                        title,
                                        message: initialMsg,
                                        count: count,
                                        p_id: p_id,
                                        isread: false,
                                        createdby: "System",
                                        time
                                    }
                                }
                            },
                            { new: true, upsert: true }
                        );

                        if (pushResult) {
                            newNotification = pushResult.messages[pushResult.messages.length - 1];
                        }
                    }
                } else {
                    // ─── Non-chat notifications (Standard logic) ───
                    const user = await notification.findOne({ usr_id: usrid });
                    const isDuplicate = user?.messages?.some(msg => msg.message === message && !msg.isread);
                    
                    if (isDuplicate) return null;

                    const pushResult = await notification.findOneAndUpdate(
                        { usr_id: usrid },
                        { $push: { messages: { title, message, count: 1, p_id: p_id, isread: false, createdby: "System", time } } },
                        { new: true, upsert: true }
                    );
                    newNotification = pushResult.messages[pushResult.messages.length - 1];
                }

                if (!newNotification) return null;

                // ─── Emit Socket (Always emit so frontend stays in sync in real-time) ───
                if (io && global.onlineUsers) {
                    const targetId = usrid ? usrid.toString().trim() : '';
                    let emitted = false;
                    for (const [onlineUserId, sId] of Object.entries(global.onlineUsers)) {
                        if (onlineUserId && onlineUserId.trim().toLowerCase() === targetId.toLowerCase()) {
                            io.to(sId).emit("newNotification", newNotification);
                            emitted = true;
                        }
                    }
                    if (!emitted && global.onlineUsers[usrid]) {
                        io.to(global.onlineUsers[usrid]).emit("newNotification", newNotification);
                    }
                }

                // ─── Email Dispatch ───
                if (!skipEmail) {
                    if (delayEmailMinutes > 0) {
                        const notifId = newNotification._id;
                        setTimeout(async () => {
                            try {
                                const checkUser = await notification.findOne({ usr_id: usrid });
                                const targetMsg = checkUser?.messages?.find(m => m._id?.toString() === notifId?.toString());
                                let inChat = false;
                                if (chatProjectId && io && global.onlineUsers?.[usrid]) {
                                    const sId = global.onlineUsers[usrid];
                                    const room = io.sockets.adapter.rooms.get(chatProjectId);
                                    if (room && room.has(sId)) inChat = true;
                                }
                                if (targetMsg && !targetMsg.isread && !inChat) {
                                    await dispatchEmailForUser(usrid, title, message);
                                }
                            } catch (e) { console.error("Delayed email err:", e); }
                        }, delayEmailMinutes * 60 * 1000);
                    } else {
                        await dispatchEmailForUser(usrid, title, message).catch(e => console.error("Email err:", e));
                    }
                }

                return newNotification;
            } catch (err) {
                console.error(`Error processing notification for user ${usrid}:`, err);
                return null;
            } finally {
                // Release lock
                delete global.notificationLocks[lockKey];
                resolveLock();
            }
        });

        const results = await Promise.all(notificationPromises);
        return results.filter(n => n !== null);
    } catch (error) {
        console.error("sendNotification error:", error.message);
        throw error;
    }
}

module.exports = { sendNotification };
