const Meeting = require("../models/meetingModel");
const Chat = require("../models/chatModels");
const Group = require("../models/groupModel");
const User = require("../models/userModel");
const cregister = require("../models/cregisterModel");
const { sendNotification } = require("../Utility/notificationUtils");
const asyncHandler = require("express-async-handler");

/**
 * Helper to extract unique target user IDs for meeting notifications,
 * strictly excluding the user who triggered the action.
 */
const getTargetRecipients = (meetingRequest, triggerUserId, extraGroupManagers = []) => {
    const triggerLower = (triggerUserId || '').trim().toLowerCase();
    const memberIds = (meetingRequest.members || []).map(m => typeof m === 'string' ? m : m.userId);
    const allIds = [meetingRequest.requestedBy, ...memberIds, ...extraGroupManagers];

    return [...new Set(allIds)]
        .filter(Boolean)
        .filter(id => id.trim().toLowerCase() !== triggerLower);
};

/**
 * Helper to emit live socket events to target user IDs using case-insensitive lookup.
 */
const emitTargetedSocket = (io, targetUserIds, eventName, payload) => {
    if (!io || !global.onlineUsers) return;
    targetUserIds.forEach(uid => {
        const targetLower = uid.trim().toLowerCase();
        for (const [onlineUserId, socketId] of Object.entries(global.onlineUsers)) {
            if (onlineUserId && onlineUserId.trim().toLowerCase() === targetLower) {
                io.to(socketId).emit(eventName, payload);
            }
        }
    });
};

// POST /api/meetings/:p_id/request
// Client or Freelancer requests a meeting
const requestMeeting = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const { requestedBy, requesterRole, reason, topic, date, time, members } = req.body;

    if (!requestedBy || !requesterRole || !reason || !date || !time) {
        return res.status(400).json({ message: "requestedBy, requesterRole, reason, date, and time are required." });
    }

    let cleanMembers = [];
    if (members) {
        let tempMembers = [];
        if (Array.isArray(members)) {
            tempMembers = members.flat(Infinity);
        } else if (typeof members === 'string') {
            try {
                tempMembers = JSON.parse(members);
            } catch (e) {
                tempMembers = [members];
            }
            if (!Array.isArray(tempMembers)) tempMembers = [tempMembers];
        }

        cleanMembers = tempMembers.map(m => {
            if (typeof m === 'string') {
                return m.replace(/[[\]'"\\`]/g, '').split(',').map(s => s.trim());
            }
            return m;
        }).flat(Infinity).filter(Boolean);
    }

    let meetingDoc = await Meeting.findOne({ p_id });

    // Fetch group to find managers
    const group = await Group.findOne({ p_id });
    const p_managers = group ? group.p_manager : [];

    let membersData = [];
    for (let mId of cleanMembers) {
        let role = "Unknown";
        const mUpper = (mId || '').trim().toUpperCase();
        if (p_managers.includes(mId) || mUpper.startsWith("ADM") || mUpper.startsWith("MGR")) {
            role = "Manager";
        } else if (await User.findOne({ fl_id: mId })) {
            role = "Freelancer";
        } else if (await cregister.findOne({ c_id: mId })) {
            role = "Client";
        }
        membersData.push({
            userId: mId,
            role: role !== "Unknown" ? role : (mUpper.startsWith("ADM") || mUpper.startsWith("MGR") ? "Manager" : (mUpper.startsWith("CLI") ? "Client" : "Freelancer")),
            status: "pending"
        });
    }

    // Ensure requestedBy is in the list
    let reqM = membersData.find(m => m.userId === requestedBy);
    if (!reqM) {
        membersData.push({
            userId: requestedBy,
            role: requesterRole,
            status: "accepted",
            updatedAt: new Date()
        });
    } else {
        reqM.role = requesterRole;
        reqM.status = "accepted";
        reqM.updatedAt = new Date();
    }

    const newRequest = {
        requestedBy,
        requesterRole,
        reason,
        topic,
        date,
        time,
        members: membersData,
        overallStatus: "pending-approvals"
    };

    if (!meetingDoc) {
        meetingDoc = await Meeting.create({ p_id, requests: [newRequest] });
    } else {
        meetingDoc.requests.push(newRequest);
        await meetingDoc.save();
    }

    const savedRequest = meetingDoc.requests[meetingDoc.requests.length - 1];

    // Target recipients excluding the requester
    const targetRecipients = getTargetRecipients(savedRequest, requestedBy, p_managers);

    const io = req.app.get("io");
    if (io) {
        emitTargetedSocket(io, targetRecipients, "meetingRequested", { p_id, request: savedRequest });
    }

    if (targetRecipients.length > 0) {
        await sendNotification(
            targetRecipients,
            "New Meeting Request",
            `A new meeting has been requested for project ${p_id} regarding "${topic}".`,
            req,
            { p_id }
        ).catch(e => console.error("Notification error:", e));
    }

    res.status(201).json({ success: true, message: "Meeting request submitted.", request: savedRequest });
});

const respondToMeeting = asyncHandler(async (req, res) => {
    const { p_id, requestId } = req.params;
    const { status, role, meetingLink, respondedBy, rejectionReason } = req.body; // role: Freelancer, Client, Manager

    const meetingDoc = await Meeting.findOne({ p_id });
    if (!meetingDoc) return res.status(404).json({ message: "Meeting not found." });

    const request = meetingDoc.requests.id(requestId);
    if (!request) return res.status(404).json({ message: "Request not found." });

    const respUpper = (respondedBy || '').trim().toUpperCase();
    const isManagerResp = role === "Manager" || role === "Admin" || respUpper.startsWith("ADM") || respUpper.startsWith("MGR");

    const loggedInId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id || req.user?.id;
    if (respondedBy && loggedInId && respondedBy.trim().toLowerCase() !== loggedInId.trim().toLowerCase() && !isManagerResp) {
        return res.status(403).json({ message: "Forbidden: You cannot respond on behalf of another user." });
    }

    const responder = request.members.find(m => {
        const uId = (m.userId || m.id || "").toString().toUpperCase();
        return m.userId === respondedBy || (respUpper && uId === respUpper);
    });

    if (!responder && !isManagerResp) {
        return res.status(400).json({ message: "You are not a member of this meeting request." });
    }

    // Validation: Manager can only accept if ALL OTHER non-manager members have accepted
    if (isManagerResp && status === "accepted") {
        const otherMembers = request.members.filter(m => {
            const uId = (m.userId || m.id || "").toString().toUpperCase();
            const mRole = (m.role || "").toLowerCase();
            const isMgr = mRole.includes("manager") || mRole.includes("admin") || uId.startsWith("ADM") || uId.startsWith("MGR");
            return !isMgr;
        });

        const allOthersAccepted = otherMembers.length === 0 || otherMembers.every(m => m.status === "accepted");
        if (!allOthersAccepted) {
            return res.status(400).json({
                success: false,
                message: "Manager cannot accept or schedule the meeting until everyone else has accepted it."
            });
        }
    }

    if (responder) {
        responder.status = status;
        if (status === 'rejected') responder.reason = rejectionReason || "";
        responder.updatedAt = new Date();
    }

    // Resolve responder name for notification
    let responderName = role;
    try {
        if (role === 'Freelancer') {
            const u = await User.findOne({ fl_id: respondedBy });
            if (u) responderName = u.fullname;
        } else if (role === 'Client') {
            const c = await cregister.findOne({ c_id: respondedBy });
            if (c) responderName = c.fullname;
        } else if (role === 'Manager' || role === 'Admin') {
            responderName = "Project Manager";
        }
    } catch (e) {
        console.error("Name resolve error:", e);
    }

    const group = await Group.findOne({ p_id });
    const groupManagers = group ? (group.p_manager || []) : [];
    const targetRecipients = getTargetRecipients(request, respondedBy, groupManagers);

    if (status === "rejected") {
        request.overallStatus = "rejected";
        request.rejectionReason = rejectionReason || "No reason provided.";
        request.respondedBy = respondedBy || "";
        request.respondedByName = responderName || "";

        try {
            await sendNotification(
                targetRecipients,
                "Meeting Rejected",
                `The meeting for project ${p_id} has been rejected by ${responderName}. Reason: ${request.rejectionReason}`,
                req,
                { p_id }
            );
        } catch (error) {
            console.error("Failed to notify rejection:", error);
        }
    } else if ((role === "Manager" || role === "Admin") && status === "accepted" && meetingLink) {
        request.managerStatus = { status: "scheduled", meetingLink };
        request.overallStatus = "scheduled";
        request.respondedBy = respondedBy || "";

        try {
            await sendNotification(
                targetRecipients,
                "Meeting Scheduled",
                `The meeting for project ${p_id} has been scheduled by ${responderName}. Join Link: ${meetingLink}`,
                req,
                { p_id }
            );
        } catch (e) {
            console.error("Scheduling notify error:", e);
        }
    } else if (status === "accepted") {
        // Check if all non-managers have accepted
        const nonManagers = request.members.filter(m => m.role !== "Manager" && m.role !== "Admin");
        const allAccepted = nonManagers.every(m => m.status === "accepted");

        if (allAccepted && request.overallStatus === "pending-approvals") {
            request.overallStatus = "waiting-for-schedule";

            const managerRecipients = groupManagers.filter(
                id => id && id.trim().toLowerCase() !== (respondedBy || '').trim().toLowerCase()
            );
            if (managerRecipients.length > 0) {
                await sendNotification(
                    managerRecipients,
                    "Meeting Ready to Schedule",
                    `Everyone has accepted the meeting for project ${p_id}. Please provide the join link.`,
                    req,
                    { p_id }
                ).catch(e => console.error("Ready notify error:", e));
            }
        } else {
            // Individual acceptance - notify other members
            if (targetRecipients.length > 0) {
                await sendNotification(
                    targetRecipients,
                    "Meeting Acceptance",
                    `${responderName} has accepted the meeting request for project ${p_id}.`,
                    req,
                    { p_id }
                ).catch(e => console.error("Acceptance notify error:", e));
            }
        }
    }

    await meetingDoc.save();

    // Live socket updates via case-insensitive target lookup
    const io = req.app.get("io");
    if (io) {
        const updatePayload = {
            p_id,
            requestId,
            status: request.overallStatus,
            meetingLink: request.managerStatus?.meetingLink || meetingLink || ''
        };

        // Emit to project room so all active participants in room update live
        io.to(p_id).emit("meetingStatusUpdated", updatePayload);

        // Always emit meetingStatusUpdated to all target recipients (excluding trigger user)
        emitTargetedSocket(io, targetRecipients, "meetingStatusUpdated", updatePayload);

        // If scheduled, also emit meetingScheduled event
        if (request.overallStatus === 'scheduled') {
            io.to(p_id).emit("meetingScheduled", updatePayload);
            emitTargetedSocket(io, targetRecipients, "meetingScheduled", updatePayload);
        }
    }

    res.status(200).json({ success: true, message: "Response submitted.", request });
});

// GET /api/meetings/:p_id
// Enhanced to return enriched meeting history with names and participant details
const getMeetingsByProject = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const userId = req.query.userId || req.user?.c_id || req.user?.fl_id || req.user?.id;
    const reqRole = req.query.userRole || req.user?.role || "";

    const group = await Group.findOne({ p_id });
    const p_managers = group ? (group.p_manager || []) : [];

    // Check if requesting user is a Manager or Admin for the project
    const isManagerOrAdmin =
        reqRole === "Manager" ||
        reqRole === "Admin" ||
        (userId && (
            userId.toUpperCase().startsWith("ADM") ||
            p_managers.some(m => m.trim().toLowerCase() === userId.trim().toLowerCase())
        ));

    const pipeline = [
        { $match: { p_id } },
        { $unwind: "$requests" }
    ];

    // Filter requests unless the requesting user is a Manager or Admin
    if (userId && !isManagerOrAdmin) {
        pipeline.push({
            $match: {
                $or: [
                    { "requests.requestedBy": userId },
                    { "requests.members.userId": userId }
                ]
            }
        });
    }

    pipeline.push(
        // Resolve Requester from users (freelancers)
        {
            $lookup: {
                from: "users",
                let: { userId: "$requests.requestedBy" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$fl_id", "$$userId"] } } },
                    { $project: { fullname: 1, avatar: 1 } }
                ],
                as: "requester_f"
            }
        },
        // Resolve Requester from cregisters (clients)
        {
            $lookup: {
                from: "cregisters",
                let: { userId: "$requests.requestedBy" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$c_id", "$$userId"] } } },
                    { $project: { fullname: 1, profile_pic: 1 } }
                ],
                as: "requester_c"
            }
        },
        {
            $addFields: {
                requester_info: { $concatArrays: ["$requester_f", "$requester_c"] }
            }
        },
        { $unwind: { path: "$requester_info", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                requestId: "$requests._id",
                topic: "$requests.topic",
                date: "$requests.date",
                time: "$requests.time",
                status: "$requests.overallStatus",
                reason: "$requests.reason",
                rejectionReason: "$requests.rejectionReason",
                respondedBy: "$requests.respondedBy",
                respondedByName: "$requests.respondedByName",
                updatedAt: "$requests.updatedAt",
                requestedBy: "$requests.requestedBy",
                requesterRole: "$requests.requesterRole",
                requestedBy_name: { $ifNull: ["$requester_info.fullname", "Unknown"] },
                requestedBy_avatar: { $ifNull: ["$requester_info.avatar", "$requester_info.profile_pic"] },
                requestedBy_role: "$requests.requesterRole",
                managerStatus: "$requests.managerStatus",
                meetingLink: "$requests.managerStatus.meetingLink",
                members: "$requests.members",
                createdAt: "$requests.createdAt"
            }
        },
        { $sort: { createdAt: -1 } }
    );

    const enrichedRequests = await Meeting.aggregate(pipeline);

    res.status(200).json({ p_id, requests: enrichedRequests });
});

// GET /api/meetings/:p_id/mine/:userId
// Requester: get their own meeting requests for a project
const getMyMeetings = asyncHandler(async (req, res) => {
    const { p_id, userId } = req.params;
    const meetingDoc = await Meeting.findOne({ p_id });

    if (!meetingDoc) {
        return res.status(200).json({ requests: [] });
    }

    const myRequests = meetingDoc.requests.filter(r => r.requestedBy === userId);
    res.status(200).json({ requests: myRequests });
});

// PUT /api/meetings/:p_id/complete/:requestId
// Manager marks a meeting as completed after the meeting is done
const markMeetingCompleted = asyncHandler(async (req, res) => {
    const { p_id, requestId } = req.params;
    const triggerUserId = req.user?.c_id || req.user?.fl_id || req.user?.id || req.body?.userId || "";

    try {
        const meetingDoc = await Meeting.findOne({ p_id });
        if (!meetingDoc) {
            return res.status(404).json({ message: "No meetings found for this project." });
        }

        const request = meetingDoc.requests.id(requestId);
        if (!request) {
            return res.status(404).json({ message: "Meeting request not found." });
        }

        // Checking against the new overallStatus field
        if (request.overallStatus !== "scheduled") {
            return res.status(400).json({ message: "Only scheduled meetings can be marked as completed." });
        }

        request.overallStatus = "completed";
        if (request.managerStatus) {
            request.managerStatus.status = "scheduled"; // Ensure it stays scheduled
        }

        await meetingDoc.save();

        const group = await Group.findOne({ p_id });
        const groupManagers = group ? (group.p_manager || []) : [];
        const targetRecipients = getTargetRecipients(request, triggerUserId, groupManagers);

        // Send persistent DB notification
        if (targetRecipients.length > 0) {
            await sendNotification(
                targetRecipients,
                "Meeting Completed",
                `The meeting for project ${p_id} regarding "${request.topic || 'Meeting'}" has been marked as completed.`,
                req,
                { p_id }
            ).catch(e => console.error("Completion notify error:", e));
        }

        // Emit live socket update to project room and targeted user sockets
        const io = req.app.get("io");
        if (io) {
            const completedPayload = { p_id, requestId, status: "completed" };
            io.to(p_id).emit("meetingStatusUpdated", completedPayload);
            io.to(p_id).emit("meetingCompleted", completedPayload);
            emitTargetedSocket(io, targetRecipients, "meetingStatusUpdated", completedPayload);
            emitTargetedSocket(io, targetRecipients, "meetingCompleted", completedPayload);
        }

        res.status(200).json({ success: true, message: "Meeting marked as completed.", request });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// GET /api/meetings/global/history/:userId
// Get all meeting requests involving the user across all projects
const getGlobalHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const authRole = (req.user?.role || "").toLowerCase();
    const isManagerOrAdmin = authRole === "manager" || authRole === "admin";

    // Ownership check: non-admin users can only view their own meeting history
    const loggedInId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id || req.user?.id;
    if (!isManagerOrAdmin && loggedInId && userId && loggedInId.trim().toLowerCase() !== userId.trim().toLowerCase()) {
        return res.status(403).json({ message: "Forbidden: You can only view your own meeting history." });
    }

    let matchCondition = {
        $or: [
            { "requests.requestedBy": userId },
            { "requests.members.userId": userId }
        ]
    };

    if (isManagerOrAdmin) {
        const managedGroups = await Group.find({ p_manager: userId }).select("p_id");
        const managedPids = managedGroups.map(g => g.p_id);
        if (managedPids.length > 0) {
            matchCondition = {
                $or: [
                    { "p_id": { $in: managedPids } },
                    { "requests.requestedBy": userId },
                    { "requests.members.userId": userId }
                ]
            };
        } else {
            matchCondition = {};
        }
    }

    const pipeline = [
        { $unwind: "$requests" }
    ];

    if (Object.keys(matchCondition).length > 0) {
        pipeline.push({ $match: matchCondition });
    }

    pipeline.push(
        {
            $lookup: {
                from: "cprojects",
                localField: "p_id",
                foreignField: "p_id",
                as: "project"
            }
        },
        { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users",
                let: { userId: "$requests.requestedBy" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$fl_id", "$$userId"] } } },
                    { $project: { fullname: 1, avatar: 1 } }
                ],
                as: "requester_f"
            }
        },
        {
            $lookup: {
                from: "cregisters",
                let: { userId: "$requests.requestedBy" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$c_id", "$$userId"] } } },
                    { $project: { fullname: 1, profile_pic: 1 } }
                ],
                as: "requester_c"
            }
        },
        {
            $addFields: {
                requester_info: { $concatArrays: ["$requester_f", "$requester_c"] }
            }
        },
        { $unwind: { path: "$requester_info", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                p_id: 1,
                projectTitle: { $ifNull: ["$project.title", "Unknown Project"] },
                requestId: "$requests._id",
                topic: "$requests.topic",
                date: "$requests.date",
                time: "$requests.time",
                status: "$requests.overallStatus",
                meetingLink: "$requests.managerStatus.meetingLink",
                requestedBy: "$requests.requestedBy",
                requestedBy_name: { $ifNull: ["$requester_info.fullname", "Unknown"] },
                requestedBy_avatar: { $ifNull: ["$requester_info.avatar", "$requester_info.profile_pic"] },
                requestedBy_role: "$requests.requesterRole",
                members: "$requests.members",
                reason: "$requests.reason",
                rejectionReason: "$requests.rejectionReason",
                overallStatus: "$requests.overallStatus",
                createdAt: "$requests.createdAt"
            }
        },
        { $sort: { createdAt: -1 } }
    );

    const meetings = await Meeting.aggregate(pipeline);

    res.status(200).json(meetings);
});

module.exports = { requestMeeting, getMeetingsByProject, respondToMeeting, getMyMeetings, markMeetingCompleted, getGlobalHistory };

