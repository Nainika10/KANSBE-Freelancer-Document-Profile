const Chat = require("../models/chatModels");
const asyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const Cregister = require("../models/cregisterModel");
const Admin = require("../models/adminModel");
const Group = require("../models/groupModel");
const cproject = require("../models/cprojectModel");
const { sendNotification } = require("../Utility/notificationUtils");
const { redactSensitiveInfo } = require("../Utility/redactUtils");

// Helper function to populate user name
const populateUserName = async (msgObj) => {
    let name = "Unknown User";
    let role = "Unknown";

    // Check Admin
    const admin = await Admin.findOne({ usr_id: msgObj.user });
    if (admin) {
        name = admin.usr_name || "Manager";
        role = "Admin";
    } else {
        // Check Client
        const client = await Cregister.findOne({ c_id: msgObj.user });
        if (client) {
            name = client.fullname || "Client";
            role = "Client";
        } else {
            // Check Freelancer
            const freelancer = await User.findOne({ fl_id: msgObj.user });
            if (freelancer) {
                name = freelancer.fullname || "Freelancer";
                role = "Freelancer";
            }
        }
    }

    // Return a plain object with the populated user name
    return {
        ...msgObj.toObject ? msgObj.toObject() : msgObj,
        user: name,
        userId: msgObj.user, // Keep the original ID just in case
        role: role,
        readBy: msgObj.readBy || []
    };
};

/**
 * Helper to notify group members about new messages
 */
const notifyChatMembers = async (projectId, senderId, text, context, messageId) => {
    try {
        const group = await Group.findOne({ p_id: projectId });
        if (!group) return;

        const project = await cproject.findOne({ p_id: projectId });
        const projectTitle = project ? project.title : projectId;

        // 1. Collect potential recipients
        const recipients = new Set();

        // Managers
        if (group.p_manager && group.p_manager.length > 0) {
            group.p_manager.forEach(id => recipients.add(id));
        }

        // Client
        if (project && project.c_id) {
            recipients.add(project.c_id);
        }

        // Accepted Freelancers
        const acceptedFreelancers = group.members
            .filter(m => m.decision?.toLowerCase() === "accepted" || m.decision === "Accepted")
            .map(m => m.member);
        acceptedFreelancers.forEach(id => recipients.add(id));

        // 2. Filter out sender and empty IDs
        const finalRecipients = [...recipients].filter(id => id && id !== senderId);

        if (finalRecipients.length > 0) {
            const title = `New Message: ${projectTitle}`;
            console.log(`📤 Debouncing chat notification to: ${finalRecipients.join(', ')} for project: ${projectId}`);

            // ─── DEBOUNCE: Collapse rapid messages into ONE notification per recipient ───
            // If 3 messages arrive within 1 second, only ONE sendNotification call fires
            // carrying the total count. This eliminates ALL race conditions at the DB level.
            global.notifDebounce = global.notifDebounce || {};

            const baseProjectId = projectId.split('_')[0];

            for (const recipientId of finalRecipients) {
                // Key MUST match markChatAsRead: UserID_BaseProjectID
                const key = `${recipientId}_${baseProjectId}`;

                if (global.notifDebounce[key]) {
                    clearTimeout(global.notifDebounce[key].timer);
                    global.notifDebounce[key].count += 1;
                } else {
                    global.notifDebounce[key] = { count: 1 };
                }

                const entry = global.notifDebounce[key];

                // ─── 1-MINUTE GRACE PERIOD ───
                entry.timer = setTimeout(async () => {
                    const burstCount = entry.count;
                    delete global.notifDebounce[key];

                    // ✅ FINAL DB CHECK
                    try {
                        const Chat = require("../models/chatModels");
                        const chatDoc = await Chat.findOne({ projectId: projectId }); // Still query by specific room
                        if (chatDoc) {
                            const stillUnread = chatDoc.texts.some(msg => !msg.readBy.includes(recipientId));
                            if (!stillUnread) {
                                console.log(`✅ Skipping notification for ${recipientId} - Already read.`);
                                return;
                            }
                        }
                    } catch (e) { console.error("Error in pre-notif check:", e); }

                    const msg = burstCount === 1
                        ? `You have 1 new message`
                        : `You have ${burstCount} new messages`;

                    await sendNotification([recipientId], title, msg, context, {
                        skipEmail: false,
                        delayEmailMinutes: 1,
                        count: burstCount,
                        chatProjectId: baseProjectId
                    });
                }, 60000); // 1 minute delay
            }

            // 🕒 Schedule Email Check (5 Minutes)
            // Determine if context is req or io for the timeout
            const io = context?.app ? context.app.get("io") : context;

            global.chatEmailTimeouts = global.chatEmailTimeouts || {};

            for (const recipientId of finalRecipients) {
                const timeoutKey = `${projectId}_${recipientId}`;

                // If an email is already scheduled for this user in this project, skip to prevent email spam
                if (global.chatEmailTimeouts[timeoutKey]) {
                    continue;
                }

                global.chatEmailTimeouts[timeoutKey] = setTimeout(async () => {
                    try {
                        // Remove from tracker so future sessions can trigger emails again
                        delete global.chatEmailTimeouts[timeoutKey];

                        // Check if user is currently active in the chat room
                        let isCurrentlyInChat = false;
                        if (io && global.onlineUsers?.[recipientId]) {
                            const socketId = global.onlineUsers[recipientId];
                            const room = io.sockets.adapter.rooms.get(projectId);
                            if (room && room.has(socketId)) {
                                isCurrentlyInChat = true;
                            }
                        }

                        if (isCurrentlyInChat) return; // Skip email if they are looking at it live

                        // Check if they still have unread messages in the CHAT TABLE for this project
                        const latestChat = await Chat.findOne({ projectId });
                        if (!latestChat) return;

                        // Check the last few messages to see if there are any unread by this user
                        const hasUnread = latestChat.texts.slice(-10).some(msg => !msg.readBy.includes(recipientId));

                        if (hasUnread) {
                            const { dispatchEmailForUser } = require('../services/emailservice');
                            const emailMsg = `You have unread messages waiting for you in "${projectTitle}". Login to reply!`;
                            await dispatchEmailForUser(recipientId, title, emailMsg).catch(e => console.error(e));
                        }
                    } catch (e) {
                        console.error("Delayed chat email err:", e);
                    }
                }, 5 * 60 * 1000);
            }
        }
    } catch (error) {
        console.error("Chat notification error:", error);
    }
};

// get chat history for a project
const getChatHistory = asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({ projectId: req.params.projectId });

    if (!chat || !chat.texts) {
        return res.status(200).json({ data: [] });
    }

    // Populate user names for all messages and sanitize text
    const populatedTexts = await Promise.all(
        chat.texts.map(async (msg) => {
            const populated = await populateUserName(msg);
            populated.text = redactSensitiveInfo(populated.text, populated.role);
            return populated;
        })
    );

    res.status(200).json({ data: populatedTexts });
});

// create text for user
const createtext = asyncHandler(async (req, res) => {
    const {
        projectId,
        user,
        text,
        replyToText,
        replyToUser } = req.body;
    if (!projectId || !user || !text) {
        return res.status(400).json({ message: "Invalid Body!!" });
    }
    else {
        // Check if the user is a manager (Admin)
        const isAdmin = await Admin.findOne({ usr_id: user });
        const isManager = !!isAdmin;

        // Apply redaction algorithm to block sensitive information
        const sanitizedText = redactSensitiveInfo(text, isManager);

        let existproject = await Chat.findOne({ projectId });
        let newproject;
        if (!existproject) {
            existproject = await Chat.create({
                projectId,
                texts: [{
                    user: user,
                    text: sanitizedText,
                    createdby: user,
                    replyToText: replyToText,
                    replyToUser: replyToUser,
                    readBy: [user] // sender has read it
                }]
            });
            newproject = existproject.texts[0];
        } else {
            const msgObj = {
                user: user,
                text: sanitizedText,
                createdby: user,
                replyToText: replyToText,
                replyToUser: replyToUser,
                readBy: [user] // sender has read it
            };
            existproject.texts.push(msgObj);
            await existproject.save();
            newproject = existproject.texts[existproject.texts.length - 1];
        }

        // Trigger notification
        const io = req.app.get("io");
        notifyChatMembers(projectId, user, sanitizedText, io, newproject._id);

        const populatedMsg = await populateUserName(newproject);

        // 👉 Emit live socket event so other users see the message & unread count instantly
        if (io) {
            io.to(projectId).emit("chatMessage", { ...populatedMsg, projectId });
        }

        res.status(200).json(populatedMsg);
    }
});

// 👉 Socket.io helper (no req/res)
const saveMessageSocket = async (msg, io) => {
    const { projectId, user, text, replyToText, replyToUser } = msg;
    if (!projectId || !user || !text) {
        console.log("❌ Invalid socket message:", msg);
        return;
    }
    const isAdmin = await Admin.findOne({ usr_id: user });
    const userRole = isAdmin ? 'Admin' : 'User';
    const sanitizedText = redactSensitiveInfo(text, userRole);

    let existProject = await Chat.findOne({ projectId });
    let newMessage;
    if (!existProject) {
        // Create new chat project
        existProject = await Chat.create({
            projectId,
            texts: [{
                user: user,
                text: sanitizedText,
                createdby: user,
                replyToText: replyToText,
                replyToUser: replyToUser,
                readBy: [user] // sender has read it
            }]
        });
        newMessage = existProject.texts[0];
    } else {
        // Push new message to texts[]
        const msgObj = {
            user: user,
            text: sanitizedText,
            createdby: user,
            replyToText: replyToText,
            replyToUser: replyToUser,
            readBy: [user] // sender has read it
        };
        existProject.texts.push(msgObj);
        await existProject.save();
        newMessage = existProject.texts[existProject.texts.length - 1];
    }

    // Trigger notification
    notifyChatMembers(projectId, user, sanitizedText, io, newMessage._id);

    const populatedMsg = await populateUserName(newMessage);
    // CRITICAL: Attach projectId so frontend can filter real-time messages correctly
    return { ...populatedMsg, projectId };
};

// 👉 Socket.io helper for editing (no req/res)
const editMessageSocket = async (msg) => {
    const { projectId, messageId, newText, userId } = msg;

    try {
        const chat = await Chat.findOne({ projectId });
        if (!chat) return { error: "Chat not found" };

        const textItem = chat.texts.id(messageId);
        if (!textItem) return { error: "Message not found" };

        if (textItem.createdby !== userId) return { error: "Unauthorized to edit this message" };

        const messageTime = textItem.createdAt || textItem._id.getTimestamp();
        const now = new Date();
        const diffInMinutes = (now - messageTime) / 1000 / 60;

        if (diffInMinutes > 10) return { error: "Time limit for editing exceeded (10 minutes)" };

        const isAdmin = await Admin.findOne({ usr_id: userId });
        const userRole = isAdmin ? 'Admin' : 'User';
        const sanitizedText = redactSensitiveInfo(newText, userRole);

        textItem.text = sanitizedText;
        await chat.save();

        const populatedMsg = await populateUserName(textItem);
        return { ...populatedMsg, projectId, messageId }; // Include context for frontend filtering
    } catch (error) {
        console.error("Error editing message:", error);
        return { error: "Internal server error during editing" };
    }
};

// 👉 Mark chat as read for a user
const markChatAsRead = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.body;
    if (!projectId || !userId) {
        return res.status(400).json({ message: "projectId and userId are required" });
    }

    const chat = await Chat.findOne({ projectId });
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    let modified = false;
    chat.texts.forEach(msg => {
        if (!msg.readBy.includes(userId)) {
            msg.readBy.push(userId);
            modified = true;
        }
    });

    if (modified) {
        await chat.save();
    }

    // ✅ CANCEL PENDING NOTIFICATION
    // Handle both raw project IDs and composite Manager Chat IDs (PID_UID)
    const baseProjectId = projectId.split('_')[0];
    const notifKey = `${userId}_${baseProjectId}`;

    if (global.notifDebounce?.[notifKey]) {
        console.log(`🚫 Cancelling pending notification for user ${userId} (Project: ${baseProjectId})`);
        clearTimeout(global.notifDebounce[notifKey].timer);
        delete global.notifDebounce[notifKey];
    }

    res.status(200).json({ success: true, message: "Chat marked as read" });
});

module.exports = { getChatHistory, createtext, saveMessageSocket, editMessageSocket, markChatAsRead };