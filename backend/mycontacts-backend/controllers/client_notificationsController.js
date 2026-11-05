const asyncHandler = require("express-async-handler");
const notification = require("../models/client_notificationModel");

// Creating Notification - IDOR Protected
const createNotification = asyncHandler(async (req, res) => {
    try {
        const {
            c_id,
            message,
            type,
            createdby
        } = req.body;

        // IDOR Fix: Ensure client can only create notifications for themselves
        if (!req.user?.c_id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
        }
        if (req.user.c_id !== c_id) {
            return res.status(403).json({ message: "Forbidden: You can only create notifications for your own account" });
        }

        const newNotification = await notification.create({
            c_id,
            message,
            type,
            createdby: null
        });

        // Emit real-time notification if user is online
        const io = req.app.get("io");
        if (global.onlineUsers?.[c_id]) {
            io.to(global.onlineUsers[c_id]).emit("newNotification", newNotification);
        }
        res.status(201).json(newNotification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all notifications of a client - IDOR Protected
const getclientnotification = asyncHandler(async (req, res) => {
    try {
        // IDOR Fix: Ensure client can only access their own notifications
        if (!req.user?.c_id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
        }
        if (req.user.c_id !== req.params.c_id) {
            return res.status(403).json({ message: "Forbidden: You can only access your own notifications" });
        }

        const exists = await notification.findOne({ c_id: req.params.c_id });
        if (!exists) {
            res.status(500);
            throw new Error("User not Exists");
        }
        const clientnotification = await notification.find({ c_id: req.params.c_id }).limit(100);
        res.status(200).json(clientnotification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

// Mark notification as read - IDOR Protected
const markasread = asyncHandler(async (req, res) => {
    try {
        // IDOR Fix: Ensure client can only mark their own notifications as read
        if (!req.user?.c_id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
        }
        if (req.user.c_id !== req.params.c_id) {
            return res.status(403).json({ message: "Forbidden: You can only modify your own notifications" });
        }

        const updated = await notification.findOneAndUpdate(
            { c_id: req.params.c_id },
            { isread: true },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Notification - IDOR Protected
const deleteNotification = asyncHandler(async (req, res) => {
    try {
        // IDOR Fix: Ensure client can only delete their own notifications
        if (!req.user?.c_id) {
            return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
        }
        if (req.user.c_id !== req.params.c_id) {
            return res.status(403).json({ message: "Forbidden: You can only delete your own notifications" });
        }

        const deleteddata = await notification.findOneAndDelete({ c_id: req.params.c_id });
        res.status(200).json(deleteddata);
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

module.exports = { createNotification, getclientnotification, markasread, deleteNotification }