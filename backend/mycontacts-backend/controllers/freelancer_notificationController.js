const asyncHandler = require("express-async-handler");
const notification = require("../models/freelancer_notificationModel");
const mongoose = require("mongoose");
const { dispatchEmailForUser } = require('../services/emailservice');
const User = require('../models/userModel');

// Creating Notification
const createNotification = asyncHandler(async (req, res) => {
    try {
        const { usr_id, title, message, createdby } = req.body;

        if (!usr_id || !title || !message || !createdby) {
            res.status(400);
            throw new Error("All fields are required");
        }

        let user = await notification.findOne({ usr_id });
        let newNotification;
        let time = new Date().toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });

        if (!user) {
            user = await notification.create({
                usr_id,
                messages: [{
                    id: 0,
                    title,
                    message,
                    isread: false,
                    createdby,
                    time: time
                }]
            });
            newNotification = user.messages[0];
        } else {
            const nextId = user.messages.length > 0
                ? user.messages[user.messages.length - 1].id + 1
                : 0;

            const msgObj = {
                id: nextId,
                title,
                message,
                isread: false,
                createdby,
                time: time
            };

            user.messages.push(msgObj);
            await user.save();
            newNotification = msgObj;
        }

        const io = req.app.get("io");
        if (global.onlineUsers?.[usr_id]) {
            io.to(global.onlineUsers[usr_id]).emit("newNotification", newNotification);
        }

        await dispatchEmailForUser(usr_id, title, message).catch(e => console.error(e));

        res.status(201).json(newNotification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ...existing code...
const sendnotificationtoeveryone = asyncHandler(async (req, res) => {
    try {
        const { title, message, createdby } = req.body;
        if (!title || !message || !createdby) {
            res.status(400);
            throw new Error("title, message and createdby are required");
        }

        // Fetch all existing user notification documents
        const users = await notification.find({});
        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found to send notifications" });
        }

        const io = req.app.get("io");
        const created = [];

        // Create a notification message for each existing usr_id
        for (const user of users) {
            const nextId =
                user.messages && user.messages.length > 0
                    ? user.messages[user.messages.length - 1].id + 1
                    : 0;

            const msgObj = { id: nextId, title, message, isread: false, createdby };

            // ensure messages array exists
            user.messages = user.messages || [];
            user.messages.push(msgObj);
            await user.save();

            // Emit real-time notification if the user is online
            if (global.onlineUsers?.[user.usr_id]) {
                io.to(global.onlineUsers[user.usr_id]).emit("newNotification", msgObj);
            }

            await dispatchEmailForUser(user.usr_id, title, message).catch(e => console.error(e));

            created.push({ usr_id: user.usr_id, message: msgObj });
        }

        res.status(201).json({ createdCount: created.length, created });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ...existing code...
const sendNotificationToFl = asyncHandler(async (req, res) => {
    try {
        const { title, message, createdby } = req.body;

        if (!message || !createdby) {
            res.status(400);
            throw new Error("message and createdby are required");
        }

        const io = req.app.get("io");
        const created = [];

        const users = await notification.find({ usr_id: { $regex: "^fl", $options: "i" } });
        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found with prefix fl" });
        }

        for (const user of users) {
             const nextId =
                 user.messages && user.messages.length > 0
                     ? user.messages[user.messages.length - 1].id + 1
                     : 0;

             const msgObj = { id: nextId, title, message, isread: false, createdby };

             user.messages = user.messages || [];
             user.messages.push(msgObj);
             await user.save();

             if (global.onlineUsers?.[user.usr_id]) {
                 io.to(global.onlineUsers[user.usr_id]).emit("newNotification", msgObj);
             }

             await dispatchEmailForUser(user.usr_id, title, message).catch(e => console.error(e));

             created.push({ usr_id: user.usr_id, message: msgObj });
        }

        res.status(201).json({
            createdCount: created.length,
            created
        });

    } catch (error) {
        console.error("Controller error:", error);
        res.status(500).json({ error: error.message });
    }
});

const sendNotificationToFll = asyncHandler(async (req, res) => {
    try {
        const { title, message, createdby } = req.body;

        if (!message || !createdby) {
            res.status(400);
            throw new Error("message and createdby are required");
        }

        const io = req.app.get("io");
        const created = [];

        // 1️⃣ Fetch ALL freelancers from USERS table
        const allFlUsers = await User.find({ fl_id: { $regex: "^fl" } });

        if (!allFlUsers || allFlUsers.length === 0) {
            return res.status(404).json({ message: "No freelancer users found" });
        }

        for (const user of allFlUsers) {
            // 2️⃣ Find or create notification record for each user
            let notifDoc = await notification.findOne({ usr_id: user.fl_id });

            if (!notifDoc) {
                notifDoc = new notification({
                    usr_id: user.fl_id,
                    messages: []
                });
            }

            // 3️⃣ Create notification message
            const nextId =
                notifDoc.messages?.length > 0
                    ? notifDoc.messages[notifDoc.messages.length - 1].id + 1
                    : 0;

            const msgObj = {
                id: nextId,
                title,
                message,
                isread: false,
                createdby
            };

            notifDoc.messages.push(msgObj);
            await notifDoc.save();

            // 4️⃣ Emit socket notification if user is online
            if (global.onlineUsers?.[user.fl_id]) {
                io.to(global.onlineUsers[user.fl_id]).emit("newNotification", msgObj);
            }

            await dispatchEmailForUser(user.fl_id, title, message).catch(e => console.error(e));

            // 5️⃣ Add to response
            created.push({
                usr_id: user.usr_id,
                message: msgObj
            });
        }

        res.status(201).json({
            createdCount: created.length,
            created
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});



const sendNotificationToCl = asyncHandler(async (req, res) => {
    try {
        const { title = "", message, createdby } = req.body;
        if (!message || !createdby) {
            res.status(400);
            throw new Error("message and createdby are required");
        }

        const io = req.app.get("io");
        const created = [];

        const users = await notification.find({ usr_id: { $regex: `^Cl`, $options: "i" } }); // case-insensitive if needed
        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found with prefix 'Cl'" });
        }

        for (const user of users) {
            const nextId = user.messages && user.messages.length > 0 ? user.messages[user.messages.length - 1].id + 1 : 0;
            const msgObj = { id: nextId, title, message, isread: false, createdby };
            user.messages = user.messages || [];
            user.messages.push(msgObj);
            await user.save();

            if (global.onlineUsers?.[user.usr_id]) {
                io.to(global.onlineUsers[user.usr_id]).emit("newNotification", msgObj);
            }
            
            await dispatchEmailForUser(user.usr_id, title, message).catch(e => console.error(e));

            created.push({ usr_id: user.usr_id, message: msgObj });
        }

        res.status(201).json({ createdCount: created.length, created });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get all notifications of a user - IDOR Protected
const getnotification = asyncHandler(async (req, res) => {
    try {
        // IDOR Fix: Get user ID from token and compare with requested ID
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        if (!tokenUserId) {
            return res.status(403).json({ message: "Forbidden: Authentication required" });
        }
        if (tokenUserId !== req.params.usr_id) {
            return res.status(403).json({ message: "Forbidden: You can only access your own notifications" });
        }

        const exists = await notification.findOne({ usr_id: req.params.usr_id });
        if (!exists) {
            return res.status(200).json([]);
        }
        const clientnotification = await notification.find({ usr_id: req.params.usr_id }).sort({ createdAt: -1 }).limit(100);
        res.status(200).json(clientnotification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get message by user and message ID - IDOR Protected
const getMessageByUserAndMsgId = asyncHandler(async (req, res) => {
    try {
        const { usr_id, id } = req.params;

        // IDOR Fix: Verify user owns this notification
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        if (!tokenUserId) {
            return res.status(403).json({ message: "Forbidden: Authentication required" });
        }
        if (tokenUserId !== usr_id) {
            return res.status(403).json({ message: "Forbidden: You can only access your own notifications" });
        }

        const userMessages = await notification.findOne(
            { usr_id, "messages.id": Number(id) },
            { "messages.$": 1 }
        );

        if (!userMessages) {
            return res.status(404).json({ message: "Message not found" });
        }

        res.json(userMessages.messages[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get notification for particular type
const getbytype = asyncHandler(async (req, res) => {
    try {
        const data = await notification.find({ type: "Project" });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Mark As Notification read - IDOR Protected
const markasread = asyncHandler(async (req, res) => {
    try {
        const { usr_id, id } = req.params;

        // IDOR Fix: Verify user owns this notification
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        if (!tokenUserId) {
            return res.status(403).json({ message: "Forbidden: Authentication required" });
        }
        if (tokenUserId !== usr_id) {
            return res.status(403).json({ message: "Forbidden: You can only modify your own notifications" });
        }

        const exists = await notification.findOne({ usr_id });
        if (!exists) {
            res.status(500);
            throw new Error("Notification not Exists");
        }
        const query = { usr_id };
        if (mongoose.Types.ObjectId.isValid(id)) {
            query["messages._id"] = id;
        } else {
            query["messages.id"] = Number(id);
        }

        const updated = await notification.findOneAndUpdate(
            query,
            { "messages.$.isread": true },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notification as read - IDOR Protected
const markasallread = asyncHandler(async (req, res) => {
    try {
        // IDOR Fix: Verify user owns these notifications
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        if (!tokenUserId) {
            return res.status(403).json({ message: "Forbidden: Authentication required" });
        }
        if (tokenUserId !== req.params.usr_id) {
            return res.status(403).json({ message: "Forbidden: You can only modify your own notifications" });
        }

        // Step 1: Update all notifications for this usr_id
        await notification.updateMany(
            { usr_id: req.params.usr_id, "messages.isread": false },
            { $set: { "messages.$[].isread": true } }
        );

        // Step 2: Fetch the updated list
        const updatedNotifications = await notification.find({ usr_id: req.params.usr_id }).limit(100);

        res.status(200).json(updatedNotifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete Notification - IDOR Protected
const deleteNotification = asyncHandler(async (req, res) => {
    try {
        const { usr_id, id } = req.params;

        // IDOR Fix: Verify user owns this notification
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        if (!tokenUserId) {
            return res.status(403).json({ message: "Forbidden: Authentication required" });
        }
        if (tokenUserId !== usr_id) {
            return res.status(403).json({ message: "Forbidden: You can only delete your own notifications" });
        }

        const pullQuery = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            pullQuery["_id"] = id;
        } else {
            pullQuery["id"] = Number(id);
        }

        const deletedData = await notification.updateOne(
            { usr_id },
            { $pull: { messages: pullQuery } }
        );

        if (deletedData.modifiedCount === 0) {
            return res.status(404).json({ message: "Message not found or already deleted" });
        }

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { createNotification, sendNotificationToCl, sendNotificationToFll, sendNotificationToFl, sendnotificationtoeveryone, getnotification, getMessageByUserAndMsgId, getbytype, markasread, markasallread, deleteNotification }