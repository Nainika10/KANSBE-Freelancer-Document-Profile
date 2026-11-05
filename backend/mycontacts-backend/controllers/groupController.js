const asyncHandler = require('express-async-handler');
const Group = require('../models/groupModel');
const mongoose = require('mongoose');
const { dispatchEmailForUser } = require('../services/emailservice');
const cproject = require('../models/cprojectModel');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const cregister = require('../models/cregisterModel');
const { sendNotification } = require("../Utility/notificationUtils");

// Generate Id

async function generateId() {
    let grp_id;
    let exists;

    do {
        grp_id = `grp${Math.floor(Math.random() * (99999999 - 10000000)) + 10000000}`;
        exists = await Group.findOne({ grp_id });
    } while (exists);

    return grp_id;
}
// Create a new group
const createGroup = asyncHandler(async (req, res) => {
    const { grp_name, p_id, p_manager, members, createdby } = req.body;

    // 🧩 Validate members array
    if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: "Members must be a non-empty array" });
    }

    // 🟢 Format members
    const formattedMembers = members.map(m =>
        typeof m === "string"
            ? { member: m, category: "General", decision: "pending", updatedby: null }
            : { member: m.member, category: m.category || "General", decision: m.decision || "pending" }
    );

    // 🆔 Generate unique group ID
    const generatedGroupId = await generateId();
    let group = await Group.findOne({ grp_id: generatedGroupId });

    // ✅ Case 1: Group doesn't exist → create new
    if (!group) {
        const newGroup = await Group.create({
            grp_id: generatedGroupId,
            grp_name,
            p_id,
            p_manager: Array.isArray(p_manager) ? p_manager : (p_manager ? [p_manager] : []),
            members: formattedMembers,
            createdby
        });

        // Link project to group
        const updatedProject = await cproject.findOneAndUpdate(
            { $or: [{ p_id: p_id }, { _id: mongoose.Types.ObjectId.isValid(p_id) ? p_id : null }] },
            {
                assignedto: generatedGroupId,
                status: "assigned",
                assignedDate: new Date()
            },
            { new: true }
        );
        console.log("createGroup -> Linked project:", p_id, "to group:", generatedGroupId, "Updated project:", updatedProject ? updatedProject._id : "NOT FOUND");

        // Notify and emit
        const io = req.app.get("io");
        if (io) {
            const memberIds = formattedMembers.map(m => m.member);
            for (let userId of memberIds) {
                if (global.onlineUsers?.[userId]) {
                    io.to(global.onlineUsers[userId]).emit("projectupdated", newGroup);
                }
            }
            // Notify members
            const project = await cproject.findOne({ p_id });
            const projectTitle = project ? project.title : p_id;
            await sendNotification(memberIds, "New Project Assigned", `A new project "${projectTitle}" has been assigned to your group.`, req);
        }

        return res.status(201).json({
            message: "New group created successfully",
            group: newGroup
        });
    }


    // ✅ Case 2: Group exists → add only new members (ignore duplicates)
    const existingMembers = group.members.map(m => m.member);
    const newMembers = formattedMembers.filter(
        m => !existingMembers.includes(m.member)
    );

    if (newMembers.length === 0) {
        return res.status(400).json({ message: "All provided members already exist in the group" });
    }

    group.members.push(...newMembers);
    group.updatedby = createdby;
    await group.save();

    const io = req.app.get("io");
    if (io) {
        const newMemberIds = newMembers.map(m => m.member);
        for (let userId of newMemberIds) {
            if (global.onlineUsers?.[userId]) {
                // Emit so freelancer projects page updates
                io.to(global.onlineUsers[userId]).emit("projectupdated", group);
            }
        }

        // Notify members
        const project = await cproject.findOne({ p_id: group.p_id });
        const projectTitle = project ? project.title : group.p_id;
        await sendNotification(newMemberIds, "New Project Assigned", `A new project "${projectTitle}" has been assigned to your group.`, req);
    }

    res.status(200).json({
        message: "New members added successfully to existing group",
        group
    });
});



// @desc   Get all accepted members
// @route  GET /api/groups/members/accepted
// @access Public / Protected
const getAcceptedMembersByProject = asyncHandler(async (req, res) => {
    const { p_id } = req.params;

    if (!p_id) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    let cleanPid = p_id;
    if (typeof cleanPid === 'string' && cleanPid.includes('_')) {
        const parts = cleanPid.split('_');
        if (parts[0].toUpperCase() === 'PRJ' && parts.length > 2) {
            cleanPid = parts[0] + '_' + parts[1];
        } else if (parts[0].toUpperCase() !== 'PRJ' && parts.length >= 2) {
            cleanPid = parts[0];
        }
    }

    const queryConditions = [
        { p_id: p_id },
        { p_id: cleanPid },
        { grp_id: p_id },
        { grp_id: cleanPid }
    ];
    if (typeof p_id === 'string') {
        queryConditions.push({ p_id: new RegExp('^' + p_id + '$', 'i') });
        queryConditions.push({ p_id: new RegExp('^' + cleanPid + '$', 'i') });
    }
    if (mongoose.Types.ObjectId.isValid(p_id)) {
        queryConditions.push({ _id: new mongoose.Types.ObjectId(p_id) });
    }

    let groups = await Group.find({ $or: queryConditions });
    if (!groups || groups.length === 0) {
        const prj = await cproject.findOne({
            $or: [
                { p_id: p_id },
                { p_id: cleanPid },
                ...(mongoose.Types.ObjectId.isValid(p_id) ? [{ _id: new mongoose.Types.ObjectId(p_id) }] : [])
            ]
        });
        if (prj && prj.assignedto) {
            const grp = await Group.findOne({
                $or: [
                    { grp_id: prj.assignedto },
                    { p_id: prj.p_id },
                    ...(mongoose.Types.ObjectId.isValid(prj.assignedto) ? [{ _id: new mongoose.Types.ObjectId(prj.assignedto) }] : [])
                ]
            });
            if (grp) groups = [grp];
        }
    }

    const acceptedMembers = [];
    const seenMemberIds = new Set();

    (groups || []).forEach(group => {
        if (Array.isArray(group.members)) {
            group.members.forEach(m => {
                const dec = (m.decision || '').toLowerCase();
                if (dec === 'accepted') {
                    const mId = (m.member || '').trim();
                    if (mId && !seenMemberIds.has(mId.toLowerCase())) {
                        seenMemberIds.add(mId.toLowerCase());
                        acceptedMembers.push({
                            member: mId,
                            decision: m.decision || 'accepted',
                            category: m.category || 'General'
                        });
                    }
                }
            });
        }
    });

    if (acceptedMembers.length === 0) {
        return res.status(200).json({
            success: true,
            count: 0,
            members: []
        });
    }

    const idList = acceptedMembers.map(m => m.member);
    const regexList = idList.map(id => new RegExp('^' + id + '$', 'i'));
    const users = await User.find({
        $or: [
            { fl_id: { $in: regexList } },
            { username: { $in: regexList } }
        ]
    }).select('fl_id fullname username profile_pic skillTitle email');

    const userMap = new Map();
    users.forEach(u => {
        if (u.fl_id) userMap.set(u.fl_id.toLowerCase(), u);
        if (u.username) userMap.set(u.username.toLowerCase(), u);
    });

    const membersResult = acceptedMembers.map(m => {
        const u = userMap.get(m.member.toLowerCase());
        const rawName = u?.fullname || u?.username;
        const displayName = (rawName && rawName.toLowerCase() !== 'user') ? rawName : (u?.username || m.member);
        return {
            member: m.member,
            fullname: displayName,
            usr_name: displayName,
            username: u?.username || null,
            name: displayName,
            avatar: u?.profile_pic || 'assets/profile-placeholder.png',
            profile_pic: u?.profile_pic || 'assets/profile-placeholder.png',
            skillTitle: u?.skillTitle || null,
            role: (m.category && m.category !== 'General') ? m.category : (u?.skillTitle || 'Team Member'),
            decision: m.decision,
            category: m.category || 'General'
        };
    });

    res.status(200).json({
        success: true,
        count: membersResult.length,
        members: membersResult
    });
});


//  API: Get all project details where any member decision = accepted (for a specific client)
const getProjectsWithAcceptedMembersByClient = async (req, res) => {
    try {
        const { c_id } = req.params; //  client id from URL

        if (!c_id) {
            return res.status(400).json({
                success: false,
                message: "Client ID (c_id) is required"
            });
        }

        const projects = await Group.aggregate([
            // 1️⃣ Filter only groups that have at least one accepted member
            { $match: { "members.decision": "accepted" } },

            // 2️⃣ Filter projects for this specific client
            {
                $lookup: {
                    from: "cprojects",
                    localField: "p_id",
                    foreignField: "p_id",
                    as: "project_details"
                }
            },
            { $unwind: "$project_details" },
            { $match: { "project_details.c_id": c_id } },

            // 3️⃣ Filter only accepted members within this group
            {
                $addFields: {
                    acceptedMembers: {
                        $filter: {
                            input: "$members",
                            as: "m",
                            cond: { $eq: ["$$m.decision", "accepted"] }
                        }
                    }
                }
            },

            // 4️⃣ Join with Users collection to get member details
            {
                $lookup: {
                    from: "users",
                    localField: "acceptedMembers.member",
                    foreignField: "fl_id",
                    as: "teamMemberDetails"
                }
            },

            // 5️⃣ Construct final project object with member info
            {
                $project: {
                    _id: 0,
                    p_id: "$project_details.p_id",
                    title: "$project_details.title",
                    category: "$project_details.category",
                    status: "$project_details.status",
                    freelancersNeeded: "$project_details.freelancersNeeded",
                    members_accepted: { $size: "$acceptedMembers" },
                    budget: "$project_details.budget",
                    startDate: "$project_details.startDate",
                    endDate: "$project_details.endDate",
                    description: "$project_details.description",
                    skills: "$project_details.skills",
                    Tasks: "$project_details.Tasks",
                    p_manager: 1, // Include manager ID
                    teamMembers: {
                        $map: {
                            input: "$teamMemberDetails",
                            as: "user",
                            in: {
                                fl_id: "$$user.fl_id",
                                fullname: "$$user.fullname",
                                skillTitle: "$$user.skillTitle",
                                email: "$$user.email"
                            }
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });
    } catch (error) {
        console.error("Error fetching accepted member projects:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching accepted member projects",
            error: error.message
        });
    }
};

// Get group by group_id
const getGroupbyid = asyncHandler(async (req, res) => {
    const { grp_id } = req.body;
    const group = await Group.findOne({ grp_id });
    if (!group) {
        res.status(404).json({ message: "Group not found" });
    } else {
        res.status(200).json(group);
    }
});

// Get group by member and join project table which matches p_id and get project details
const getGroupbyMember = asyncHandler(async (req, res) => {
    const { member } = req.params;

    const group = await Group.findOne({
        members: { $elemMatch: { member } }
    });

    if (!group) {
        return res.status(200).json({ message: "No groups found for the specified member" });
    }

    const result = await Group.aggregate([
        {
            $match: {
                members: { $elemMatch: { member } }
            }
        },

        // Lookup project details
        {
            $lookup: {
                from: "cprojects",
                localField: "p_id",
                foreignField: "p_id",
                as: "project_details"
            }
        },

        // Filter projects where assignedto == grp_id
        {
            $addFields: {
                project_details: {
                    $let: {
                        vars: { grpId: "$grp_id" },
                        in: {
                            $filter: {
                                input: "$project_details",
                                as: "p",
                                cond: {
                                    $eq: ["$$p.assignedto", "$$grpId"]
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "members.member",
                foreignField: "fl_id",
                as: "user_details"
            }
        },
        {
            $lookup: {
                from: "admins",
                localField: "p_manager",
                foreignField: "usr_id",
                as: "manager_info"
            }
        },
        { $unwind: { path: "$manager_info", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "cregisters",
                localField: "project_details.c_id",
                foreignField: "c_id",
                as: "client_info"
            }
        },
        { $unwind: { path: "$client_info", preserveNullAndEmptyArrays: true } }
    ]);

    // -----------------------
    // 🔥 New Condition Added
    // -----------------------
    // if (!result.length || result[0].project_details.length === 0) {
    //     return res.status(200).json({ message: "No Data Found!!" });
    // }

    res.status(200).json(result);
});




// Get group by project_id and only decision accepted member and join users table which matches member and get user details
const getbydecisionaccepted = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const decision = "Waiting-for-client"
    const group = await Group.findOne({ p_id, members: { $elemMatch: { decision: decision } } });
    if (!group) {
        res.status(200).json({ message: "No Groups found for the specified project with decision" });
    } else {
        const result = await Group.aggregate([
            { $match: { p_id: p_id, members: { $elemMatch: { decision: decision } } } },
            {
                $lookup: {
                    from: "cprojects",
                    localField: "p_id",
                    foreignField: "p_id",
                    as: "project_details"
                }
            },
            {
                $addFields: {
                    p_name: { $arrayElemAt: ["$project_details.title", 0] },
                    freelancersNeeded: { $ifNull: [{ $arrayElemAt: ["$project_details.freelancersNeeded", 0] }, 1] },
                    members_accepted: {
                        $size: {
                            $filter: {
                                input: "$members",
                                as: "m",
                                cond: { $eq: ["$$m.decision", "accepted"] }
                            }
                        }
                    },
                    members: {
                        $filter: {
                            input: "$members",
                            as: "m",
                            cond: { $eq: ["$$m.decision", decision] }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "members.member",
                    foreignField: "fl_id",
                    as: "user_details"
                }
            },
            {
                $lookup: {
                    from: "skills",
                    localField: "members.member",
                    foreignField: "fl_id",
                    as: "skills"
                }
            }
        ]);
        res.status(200).json(result);
    }
});

// Note: sendNotification function is defined below (after updatememberdecision)

// update member decision in group by member
const updatememberdecision = asyncHandler(async (req, res) => {
    const { grp_id, member, decision, updatedby, reject_reason, terms } = req.body;
    const group = await Group.findOne({ grp_id, members: { $elemMatch: { member: member } } });
    if (!group) {
        return res.status(404).json({ message: "member not found in any group" });
    }

    // 1. Fetch project details to get freelancersNeeded limit & verify ownership
    let projectDoc = await cproject.findOne({ p_id: group.p_id });
    if (!projectDoc && group.p_id) {
        projectDoc = await cproject.findOne({ p_id: new RegExp(`^${group.p_id}$`, 'i') });
    }
    const freelancersNeeded = projectDoc?.freelancersNeeded || 1;

    // Authorization check:
    // A) Admins or Managers can manage all member decisions
    const isAdminOrManager = req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.usr_id);

    // B) Freelancers can accept ('Waiting-for-client') or decline ('f_rejected') invitations assigned to themselves
    const userFlid = (req.user?.fl_id || '').trim().toLowerCase();
    const targetMember = (member || '').trim().toLowerCase();
    const isFreelancerAction = ['waiting-for-client', 'f_rejected'].includes((decision || '').toLowerCase());
    const isFreelancerSelf = userFlid && targetMember && userFlid === targetMember && isFreelancerAction;

    // C) The Client who owns the project can hire ('accepted') or reject ('rejected') candidate freelancers
    const clientCid = (req.user?.c_id || '').trim().toLowerCase();
    const projectCid = (projectDoc?.c_id || '').trim().toLowerCase();
    const isClientAction = ['accepted', 'rejected'].includes((decision || '').toLowerCase());
    const isClientOwner = clientCid && projectCid && clientCid === projectCid && isClientAction;

    if (!isAdminOrManager && !isFreelancerSelf && !isClientOwner) {
        return res.status(403).json({
            message: "Forbidden: You are not authorized to decide on members for this project"
        });
    }

    // 2. Check current member decision before update
    const existingMember = group.members.find(m => m.member === member);
    const oldDecision = existingMember?.decision;

    // 2b. Prevent taking on multiple active projects:
    // A freelancer can only have 1 active project at a time until completed or rejected.
    // Only check projects where the freelancer has ALREADY been accepted (is actively working).
    const isAccepting = (decision || '').toLowerCase() === 'waiting-for-client' || (decision || '').toLowerCase() === 'accepted';
    if (isAccepting && oldDecision !== 'accepted' && oldDecision !== 'Waiting-for-client') {
        const ACTIVE_STATUSES = ['assigned', 'in-progress', 'freelancer-completion-request', 'ready-for-completion'];
        
        // Find other groups where this freelancer's decision is strictly "accepted"
        const acceptedOtherGroups = await Group.find({
            p_id: { $ne: group.p_id },
            members: { $elemMatch: { member: member, decision: "accepted" } }
        });
        const acceptedOtherPids = acceptedOtherGroups.map(g => g.p_id).filter(Boolean);

        if (acceptedOtherPids.length > 0) {
            const activeProject = await cproject.findOne({
                p_id: { $in: acceptedOtherPids },
                status: { $in: ACTIVE_STATUSES }
            });

            if (activeProject) {
                const projectTitle = activeProject.title || activeProject.p_id;
                return res.status(400).json({
                    message: `Freelancer already has an active project in progress ("${projectTitle}"). The existing project must be completed or finished before accepting a new one.`
                });
            }
        }
    }

    // 3. Limit enforcement pre-check when accepting a new member
    if (decision === "accepted" && oldDecision !== "accepted") {
        const allProjectGroups = await Group.find({ p_id: group.p_id });
        const currentAcceptedCount = allProjectGroups.reduce((acc, g) => {
            return acc + (g.members ? g.members.filter(m => m.decision === "accepted").length : 0);
        }, 0);

        if (currentAcceptedCount >= freelancersNeeded) {
            return res.status(400).json({
                message: "Required freelancers already selected",
                members_accepted: currentAcceptedCount,
                freelancersNeeded: freelancersNeeded
            });
        }
    }

    const updateFields = {
        "members.$.decision": decision,
        "members.$.updatedby": updatedby || member
    };
    if (reject_reason !== undefined) {
        updateFields["members.$.reject_reason"] = reject_reason;
    }
    if (terms !== undefined) {
        updateFields["members.$.terms"] = terms;
    }

    const updatedGroup = await Group.findOneAndUpdate(
        { grp_id: grp_id, members: { $elemMatch: { member: member } } },
        { $set: updateFields },
        { new: true }
    );

    // 4. Update members_accepted count for the group and calculate total project-wide accepted count
    const groupAcceptedCount = updatedGroup.members ? updatedGroup.members.filter(m => m.decision === "accepted").length : 0;
    updatedGroup.members_accepted = groupAcceptedCount;
    await updatedGroup.save();

    const latestProjectGroups = await Group.find({ p_id: group.p_id });
    const projectAcceptedTotal = latestProjectGroups.reduce((acc, g) => {
        return acc + (g.members ? g.members.filter(m => m.decision === "accepted").length : 0);
    }, 0);

    const socketPayload = {
        updatedGroup,
        members_accepted: projectAcceptedTotal,
        freelancersNeeded
    };

    const io = req.app.get("io");

    const socketId = global.onlineUsers[member?.toString()];
    if (socketId) {
        io.to(socketId).emit("groupdecisionupdated", socketPayload);
    }
    const getprojectdetails = await Group.aggregate([
        { $match: { p_id: group.p_id } },
        {
            $lookup: {
                from: "cprojects",
                localField: "p_id",
                foreignField: "p_id",
                as: "project_details"
            }
        }
    ]);
    const c_id = getprojectdetails?.[0]?.project_details?.[0]?.c_id;

    // Emit live update to client for any decision change
    if (c_id && global.onlineUsers?.[c_id]) {
        io.to(global.onlineUsers[c_id]).emit("groupdecisionupdated", socketPayload);
    }

    // Emit live update to all connected admins
    if (global.adminUsers) {
        for (const adminId in global.adminUsers) {
            io.to(global.adminUsers[adminId]).emit("groupdecisionupdated", socketPayload);
        }
    }

    const freelancerUser = await User.findOne({ fl_id: member });
    const freelancerName = freelancerUser?.fullname || member;
    const projectTitle = getprojectdetails?.[0]?.project_details?.[0]?.title || group.p_id;

    if (decision === "Waiting-for-client") {
        // client needs to approve
        if (c_id) {
            const message = `Freelancer "${freelancerName}" is waiting for your Approval of project: "${projectTitle}". Please select your freelancer accordingly who matches your skills!`;
            await sendNotification(c_id, "Project Response", message, req);
        }

        // Send to manager(s)
        const adminMsg = `Freelancer "${freelancerName}" updated their decision to "${decision}" for Project: "${projectTitle}".`;
        if (group.p_manager && group.p_manager.length > 0) {
            await sendNotification(group.p_manager, "Freelancer Decision Update", adminMsg, req);
        }

    } else if (decision === "f_rejected") {

        let managerMsg = `Freelancer "${freelancerName}" rejected the project "${projectTitle}".`;
        if (reject_reason) {
            managerMsg += ` Reason: ${reject_reason}`;
        }
        if (group.p_manager && group.p_manager.length > 0) {
            await sendNotification(group.p_manager, "Project Response", managerMsg, req);
        }

    } else if (decision === "accepted") {
        const message = `Client accepted you for Project: "${projectTitle}". Please check your project portal.`;
        await sendNotification(member, "Project Response", message, req);

        const adminMsg = `Client accepted freelancer "${freelancerName}" for Project: "${projectTitle}"`;
        if (group.p_manager && group.p_manager.length > 0) {
            await sendNotification(group.p_manager, "Project Response", adminMsg, req);
        }

        // Assign freelancer to their category in the project breakdown
        const memberObj = updatedGroup.members.find(m => m.member === member);
        const category = memberObj?.category;

        if (category && category !== 'General') {
            await cproject.findOneAndUpdate(
                { p_id: group.p_id, "freelancerBreakdown.category": category },
                { $set: { "freelancerBreakdown.$.assigned_fl_id": member } }
            );
        } else {
            // Fallback: assign to first available slot if no specific category matched
            await cproject.findOneAndUpdate(
                { p_id: group.p_id, "freelancerBreakdown.assigned_fl_id": { $in: [null, "", undefined] } },
                { $set: { "freelancerBreakdown.$.assigned_fl_id": member } }
            );
        }

        // ✅ Update project status to in-progress when client accepts a freelancer
        // Only transition if it's currently 'assigned' or 'available'
        const updatedProject = await cproject.findOneAndUpdate(
            { p_id: group.p_id, status: { $in: ["assigned", "available"] } },
            { status: "in-progress" },
            { new: true }
        );

        // Notify all admins of the project status change
        if (updatedProject && global.adminUsers) {
            for (const adminId in global.adminUsers) {
                io.to(global.adminUsers[adminId]).emit("projectupdated", updatedProject);
            }
        }

    } else {

        // client rejected freelancer
        const managerMsg = `Client rejected freelancer "${freelancerName}" for Project: "${projectTitle}"`;
        if (group.p_manager && group.p_manager.length > 0) {
            await sendNotification(group.p_manager, "Project Response", managerMsg, req);
        }

        // Notify the client that their rejection was successful
        if (c_id) {
            const clientMsg = `You have successfully rejected freelancer "${freelancerName}" for the project "${projectTitle}".`;
            await sendNotification(c_id, "Project Response", clientMsg, req);
        }

        // Notify the freelancer that they were rejected
        const freelancerMsg = `The client has rejected your application for the project "${projectTitle}".`;
        await sendNotification(member, "Project Response", freelancerMsg, req);

    }

    res.status(200).json({
        message: "Member decision updated successfully",
        updatedGroup,
        members_accepted: projectAcceptedTotal,
        freelancersNeeded: freelancersNeeded
    });
});

//update 

// update group by grp_id only new members can be added but no change in existing members
const updategroup = asyncHandler(async (req, res) => {
    const { grp_id, grp_name, members, updatedby } = req.body;

    const group = await Group.findOne({ grp_id });
    if (!group) {
        return res.status(404).json({ message: "Group not found" });
    }

    // Update group name if provided
    if (grp_name) {
        group.grp_name = grp_name;
    }

    // Add ONLY new members
    let actuallyAdded = [];
    if (Array.isArray(members) && members.length > 0) {
        const existingMembers = group.members.map(m =>
            m.member.toString()
        );

        const newMembers = members.filter(
            m => {
                const memberId = typeof m === 'string' ? m : m.member;
                return !existingMembers.includes(memberId.toString());
            }
        );

        newMembers.forEach(m => {
            group.members.push({
                member: typeof m === 'string' ? m : m.member,
                category: typeof m === 'string' ? 'General' : (m.category || 'General'),
                decision: "pending",
                updatedby
            });
        });

        actuallyAdded = newMembers.map(m => typeof m === 'string' ? m : m.member);
    }

    // Update updatedby field
    if (updatedby) {
        group.updatedby = updatedby;
    }

    await group.save();

    if (actuallyAdded.length > 0) {
        const io = req.app.get("io");
        if (io) {
            for (let userId of actuallyAdded) {
                if (global.onlineUsers?.[userId]) {
                    io.to(global.onlineUsers[userId]).emit("projectupdated", group);
                }
            }
            const project = await cproject.findOne({ p_id: group.p_id });
            const projectTitle = project ? project.title : group.p_id;
            await sendNotification(actuallyAdded, "New Project Assigned", `A new project "${projectTitle}" has been assigned to your group.`, req);
        }
    }

    return res.status(200).json({
        message: "Group updated successfully",
        group
    });
});



// delete member from group by member
const deletemember = asyncHandler(async (req, res) => {
    const { member } = req.body;
    const group = await Group.findOne({ members: { $elemMatch: { member: member } } });
    if (!group) {
        res.status(404).json({ message: "Member not found in any group" });
    } else {
        const deletedGroup = await Group.findOneAndDelete({ members: { $elemMatch: { member: member } } });
        res.status(200).json({ message: "Member deleted successfully", deletedGroup });
    }
})


// Note: Shared sendNotification used from Utility/notificationUtils.js through higher-level import

// Get all project team members (Manager + Client + Accepted Freelancers)
const getProjectTeamMembers = asyncHandler(async (req, res) => {
    const { p_id } = req.params;

    if (!p_id) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    let cleanPid = p_id;
    if (typeof cleanPid === 'string' && cleanPid.includes('_')) {
        const parts = cleanPid.split('_');
        if (parts[0].toUpperCase() === 'PRJ' && parts.length > 2) {
            cleanPid = parts[0] + '_' + parts[1];
        } else if (parts[0].toUpperCase() !== 'PRJ' && parts.length >= 2) {
            cleanPid = parts[0];
        }
    }

    const queryConditions = [
        { p_id: p_id },
        { p_id: cleanPid },
        { grp_id: p_id },
        { grp_id: cleanPid }
    ];
    if (typeof p_id === 'string') {
        queryConditions.push({ p_id: new RegExp('^' + p_id + '$', 'i') });
        queryConditions.push({ p_id: new RegExp('^' + cleanPid + '$', 'i') });
    }
    if (mongoose.Types.ObjectId.isValid(p_id)) {
        queryConditions.push({ _id: new mongoose.Types.ObjectId(p_id) });
    }

    let group = await Group.findOne({ $or: queryConditions });
    if (!group) {
        const prj = await cproject.findOne({
            $or: [
                { p_id: p_id },
                { p_id: cleanPid },
                ...(mongoose.Types.ObjectId.isValid(p_id) ? [{ _id: new mongoose.Types.ObjectId(p_id) }] : [])
            ]
        });
        if (prj && prj.assignedto) {
            group = await Group.findOne({
                $or: [
                    { grp_id: prj.assignedto },
                    { p_id: prj.p_id },
                    ...(mongoose.Types.ObjectId.isValid(prj.assignedto) ? [{ _id: new mongoose.Types.ObjectId(prj.assignedto) }] : [])
                ]
            });
        }
    }

    if (!group) {
        return res.status(404).json({ success: false, message: "Project group not found." });
    }

    // 1. Fetch Manager(s) Info
    const fullTeam = [];
    if (group.p_manager && group.p_manager.length > 0) {
        const managers = await Admin.find({ usr_id: { $in: group.p_manager } });
        managers.forEach(admin => {
            fullTeam.push({
                id: admin.usr_id,
                name: admin.usr_name,
                role: "Project Manager",
                avatar: "assets/profile-placeholder.png",
                type: "Manager"
            });
        });
    }

    // 2. Fetch Client Info (From Project Owner)
    let clientInfo = null;
    const project = await cproject.findOne({
        $or: [
            { p_id: group.p_id || p_id },
            { p_id: cleanPid }
        ]
    });
    if (project && project.c_id) {
        const client = await cregister.findOne({ c_id: project.c_id });
        if (client) {
            clientInfo = {
                id: client.c_id,
                name: client.fullname || client.c_name,
                role: "Project Client",
                avatar: client.profile_pic || "assets/profile-placeholder.png",
                type: "Client"
            };
        }
    }

    // 3. Fetch Accepted Freelancers Info
    const acceptedMemberIds = (group.members || [])
        .filter(m => m.decision?.toLowerCase() === "accepted" || m.decision === "Accepted")
        .map(m => m.member);

    const regexIds = acceptedMemberIds.map(id => new RegExp('^' + id + '$', 'i'));
    const freelancers = await User.find({
        $or: [
            { fl_id: { $in: regexIds } },
            { username: { $in: regexIds } }
        ]
    });

    const teamMembers = freelancers.map(f => {
        const memberObj = (group.members || []).find(m =>
            (m.member || '').toLowerCase() === (f.fl_id || '').toLowerCase() ||
            (m.member || '').toLowerCase() === (f.username || '').toLowerCase()
        );
        const memberCategory = memberObj?.category && memberObj.category !== 'General' ? memberObj.category : null;
        const rawName = f.fullname || f.username;
        const displayName = (rawName && rawName.toLowerCase() !== 'user') ? rawName : (f.username || f.fl_id);
        return {
            id: f.fl_id,
            name: displayName,
            fullname: displayName,
            role: memberCategory || f.skillTitle || "Lead Freelancer",
            category: memberObj?.category || "General",
            avatar: f.profile_pic || "assets/profile-placeholder.png",
            type: "Freelancer"
        };
    });

    // Combine
    if (clientInfo) fullTeam.push(clientInfo);
    fullTeam.push(...teamMembers);

    res.status(200).json({
        success: true,
        count: fullTeam.length,
        members: fullTeam
    });
});

// Get projects for a client that have freelancers waiting for approval
const getPendingApprovalProjectsByClient = asyncHandler(async (req, res) => {
    const { c_id } = req.params;

    const projects = await Group.aggregate([
        // 1. Find groups with pending client approval
        { $match: { "members.decision": "Waiting-for-client" } },

        // 2. Join with cprojects to filter by client ID
        {
            $lookup: {
                from: "cprojects",
                localField: "p_id",
                foreignField: "p_id",
                as: "project"
            }
        },
        { $unwind: "$project" },
        { $match: { "project.c_id": c_id } },

        // 3. Project only necessary info
        {
            $project: {
                p_id: 1,
                waitingCount: {
                    $size: {
                        $filter: {
                            input: "$members",
                            as: "m",
                            cond: { $eq: ["$$m.decision", "Waiting-for-client"] }
                        }
                    }
                }
            }
        }
    ]);

    res.status(200).json({ success: true, count: projects.length, projects });
});

module.exports = {
    createGroup,
    getGroupbyMember,
    getbydecisionaccepted,
    updategroup,
    updatememberdecision,
    deletemember,
    getProjectsWithAcceptedMembersByClient,
    getAcceptedMembersByProject,
    getGroupbyid,
    getProjectTeamMembers,
    getPendingApprovalProjectsByClient
};