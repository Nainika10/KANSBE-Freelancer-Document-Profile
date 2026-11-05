const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const cproject = require("../models/cprojectModel");
const User = require("../models/userModel");
const cregister = require("../models/cregisterModel");
const { GetObjectCommand, DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3.js");
const upload = require("../middleware/upload");
const { sanitizeForLogging } = require('../Utility/logSanitizer');
const { sendNotification } = require("../Utility/notificationUtils");
const { sendEmail, dispatchEmailForUser } = require("../services/emailservice");
const Admin = require("../models/adminModel.js");
const Group = require("../models/groupModel");
const mongoose = require("mongoose");

/**
 * Helper to safely extract any available freelancer identifier from req.user
 */
function extractFreelancerId(user) {
    if (!user) return null;
    return user.fl_id || user.id || user._id || user.email || user.username || null;
}

/**
 * Robust helper to verify if a freelancer is assigned to a project or task
 */
async function isFreelancerAssignedToProject(project, freelancerIdentifier, taskId = null) {
    if (!project || !freelancerIdentifier) return false;

    const rawId = String(freelancerIdentifier).trim();
    const rawLower = rawId.toLowerCase();

    // Look up user document to resolve all associated aliases (fl_id, _id, email, username, fullname)
    const userAliases = new Set([rawLower]);
    try {
        const queryOr = [
            { fl_id: rawId },
            { email: rawId },
            { username: rawId }
        ];
        if (mongoose.isValidObjectId(rawId)) {
            queryOr.push({ _id: rawId });
        }
        const userDoc = await User.findOne({ $or: queryOr }).lean();
        if (userDoc) {
            if (userDoc.fl_id) userAliases.add(String(userDoc.fl_id).toLowerCase().trim());
            if (userDoc._id) userAliases.add(String(userDoc._id).toLowerCase().trim());
            if (userDoc.email) userAliases.add(String(userDoc.email).toLowerCase().trim());
            if (userDoc.username) userAliases.add(String(userDoc.username).toLowerCase().trim());
            if (userDoc.fullname) userAliases.add(String(userDoc.fullname).toLowerCase().trim());
        }
    } catch (err) {
        console.warn("[isFreelancerAssignedToProject] User lookup warning:", err.message);
    }

    const matchesAlias = (val) => {
        if (!val) return false;
        return userAliases.has(String(val).toLowerCase().trim());
    };

    // 1. Direct assignment on project
    if (matchesAlias(project.assignedto)) return true;

    // 2. Assigned in assignedFreelancers array
    if (Array.isArray(project.assignedFreelancers) && project.assignedFreelancers.some(f => 
        matchesAlias(f.fl_id) || matchesAlias(f.id) || matchesAlias(f._id) || matchesAlias(f.email)
    )) {
        return true;
    }

    // 3. Assigned in freelancerBreakdown array
    if (Array.isArray(project.freelancerBreakdown) && project.freelancerBreakdown.some(b => 
        matchesAlias(b.assigned_fl_id) || matchesAlias(b.fl_id) || matchesAlias(b.assignedto)
    )) {
        return true;
    }

    // 4. If taskId provided, check if the specific task is assigned to this freelancer
    if (taskId && Array.isArray(project.Tasks)) {
        const targetTask = project.Tasks.find(t => 
            (t._id && t._id.toString() === taskId) || 
            String(t.id) === String(taskId)
        );
        if (targetTask && matchesAlias(targetTask.assignedto)) {
            return true;
        }
    }

    // 5. Check if ANY task in project is assigned to this freelancer
    if (Array.isArray(project.Tasks) && project.Tasks.some(t => matchesAlias(t.assignedto))) {
        return true;
    }

    // 6. Check if freelancer is an accepted/active member of the group assigned to the project
    try {
        const aliasArray = Array.from(userAliases);
        const groupMatch = await Group.findOne({
            p_id: project.p_id,
            "members.member": { $in: aliasArray },
            "members.decision": { $in: ["accepted", "pending"] }
        }).lean();
        if (groupMatch) return true;

        if (project.assignedto && typeof project.assignedto === "string" && project.assignedto.startsWith("grp")) {
            const grpById = await Group.findOne({
                grp_id: project.assignedto,
                "members.member": { $in: aliasArray }
            }).lean();
            if (grpById) return true;
        }
    } catch (err) {
        console.warn("[isFreelancerAssignedToProject] Group query warning:", err.message);
    }

    return false;
}

/**
 * Helper to check if a user is an admin or manager on a project
 */
function isUserAdminOrManager(user, project = null) {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager' || user.usr_id) return true;
    if (project && Array.isArray(project.Pmanager)) {
        const uid = user.usr_id || user.id || user._id;
        if (uid && project.Pmanager.includes(uid)) return true;
    }
    return false;
}

/**
 * Helper to check if user is the client owner of a project
 */
function isProjectClientOwner(user, project) {
    if (!user || !project) return false;
    return !!(user.c_id && project.c_id === user.c_id);
}
const { logUserActivity } = require('../Utility/activityLogger');
const { getNextAvailableManager } = require("../services/managerAssignmentService");
const { findBestMatchesForProject } = require("../services/freelancerMatchService");

//get  all waiting for approval the project data

const getProjects = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'project_check', 'project', 'pending-approval-list', {
      list: 'pending-approval'
    });

    const cprojectdata = await cproject.aggregate([
        { $match: { status: "waiting-for-approval" } },
        {
            $lookup: {
                from: "cregisters",
                localField: "c_id",
                foreignField: "c_id",
                as: "clientDetails"
            }
        },
        { $unwind: { path: "$clientDetails", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                clientname: "$clientDetails.fullname",
                clientemail: "$clientDetails.email"
            }
        },
        { $project: { clientDetails: 0 } },
        { $sort: { createdAt: -1 } }
    ]);
    res.status(200).json(cprojectdata);
});
//get all projects count
const getAllProjects = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'project_check', 'project', 'all-projects', {
      list: 'all-projects'
    });

    const cprojectdatacount = await cproject.find();
    res.status(200).json(cprojectdatacount.length);
});
//  get all available projects and join with group collection to get group members
const availableprojects = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'project_check', 'project', 'available-projects', {
      list: 'available-projects'
    });

    const projects = await cproject.find({ status: { $in: ["available", "assigned", "in-progress", "ready-for-completion", "completed"] } }).sort({ createdAt: -1 }).limit(100);
    if (!projects) {
        res.status(404).json({ message: "No availabe projects found" });
    } else {
        const result = await cproject.aggregate([
            { $match: { p_id: { $in: projects.map(proj => proj.p_id) } } },
            {
                $lookup: {
                    from: "groups",
                    localField: "p_id",
                    foreignField: "p_id",
                    as: "group_members"
                }
            }
        ]);
        res.status(200).json(result);
    }
});


// Get Freelancers assigned projects

const assignedfreelancers = asyncHandler(async (req, res) => {
    const freelancer = await cproject.find({ assignedto: req.params.assignedto });
    res.status(200).json(freelancer);
});



// Get project by Id

const getprojectbyid = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'project_view', 'project', req.params.p_id, {
      view: 'project-details'
    });

    const projectdata = await cproject.aggregate([
        { $match: { p_id: req.params.p_id } },
        {
            $lookup: {
                from: "cregisters",
                localField: "c_id",
                foreignField: "c_id",
                as: "clientDetails"
            }
        },
        { $unwind: { path: "$clientDetails", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "groups",
                localField: "p_id",
                foreignField: "p_id",
                as: "groupDetails"
            }
        },
        { $unwind: { path: "$groupDetails", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                clientname: "$clientDetails.fullname"
            }
        },
        { $project: { clientDetails: 0 } }
    ]);
    res.status(200).json(projectdata)
});

//Get projects by Client Id
const getprojectbycid = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'project_view', 'project', req.params.c_id, {
      view: 'client-projects'
    });

    const projectdata = await cproject.find({
        c_id: req.params.c_id,
    })
    res.status(200).json(projectdata)
});
//get Ongoing Projects
const getOngoingProjects = asyncHandler(async (req, res) => {
    const projectdata = await cproject.find({ status: "assigned" })
    res.status(200).json(projectdata)
});

//get Assinged Projects
const getAssingedProjects = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const filter = { status: { $ne: "waiting-for-approval" } };

    const [projects, total] = await Promise.all([
        cproject.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),

        cproject.countDocuments(filter)
    ]);
    res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        projects
    });
});


//Get freelancer by project_id
// [REMOVED] getWaitingFreelancersByProjectId and getapprovedprojects
// These were broken (handled assignedto as array) and were redundant with groupController.js


const getprojectfile = asyncHandler(async (req, res) => {
    console.log("Download request for p_id:", req.params.p_id);
    try {
        const project = await cproject.findOne({ p_id: req.params.p_id });

        if (!project || !project.filedata?.key) {
            return res.status(404).json({ message: "File not found" });
        }
        if (project.filedata.key.includes('..') || project.filedata.key.includes('\\')) {
            return res.status(400).json({ message: "Invalid key format" });
        }
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || "kansbe-files-storage",
            Key: project.filedata.key,
        });

        // Generate signed URL valid for 1 hour
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return res.json({ url });

    } catch (error) {
        console.error("Error generating signed URL:", error);
        res.status(500).json({ message: "Error generating file link" });
    }
});



// Get project f_id
const getprojectbyfid = asyncHandler(async (req, res) => {
    const projectdata = await cproject.find({ f_id: req.params.f_id })
    res.status(200).json(projectdata)
})



// Generate Project id

async function generateId() {
    let p_Id;
    let exists;

    do {
        p_Id = `P-${crypto.randomUUID()}`;
        exists = await cproject.findOne({ p_id: p_Id });
    } while (exists);

    return p_Id;
}
// Post a project data
// 1 Create Project (by Client)
const createProject = asyncHandler(async (req, res) => {
    console.log("Project body received:", sanitizeForLogging(req.body));
    console.log("Project file metadata:", req.file ? sanitizeForLogging({
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    }) : null);

    const {
        p_id,
        c_id,
        title,
        category,
        budget,
        startDate,
        endDate,
        skills,
        description,
        createdby,
        updatedby,
        freelancersNeeded
    } = req.body;


    try {

        // If skills come as an array or comma-separated string, parse and deduplicate case-insensitively
        let rawSkillList = [];
        if (Array.isArray(skills)) {
            rawSkillList = skills.flatMap(s => typeof s === 'string' ? s.split(',') : [s]);
        } else if (typeof skills === "string") {
            rawSkillList = skills.split(",");
        }

        const seenSkills = new Set();
        let skillArray = [];
        for (const item of rawSkillList) {
            const sName = String(item || '').trim();
            const norm = sName.toLowerCase();
            if (sName && !seenSkills.has(norm)) {
                seenSkills.add(norm);
                skillArray.push(sName);
            }
        }
        if (!title || !category || !budget || !startDate || !endDate || !description) {
            return res.status(400).json({ message: "Please fill all required fields" });
        }

        // ðŸ“… Date Validation
        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: "End date must be after Start date" });
        }

        let freelancerBreakdownArray = [];
        if (req.body.freelancerBreakdown) {
            try {
                freelancerBreakdownArray = typeof req.body.freelancerBreakdown === 'string' 
                    ? JSON.parse(req.body.freelancerBreakdown) 
                    : req.body.freelancerBreakdown;

                if (Array.isArray(freelancerBreakdownArray)) {
                    freelancerBreakdownArray = freelancerBreakdownArray.map(role => {
                        let roleSkills = [];
                        if (Array.isArray(role.skills)) {
                            roleSkills = role.skills;
                        } else if (typeof role.skills === 'string') {
                            roleSkills = role.skills.split(',').map(s => s.trim()).filter(Boolean);
                        }
                        return {
                            ...role,
                            skills: roleSkills
                        };
                    });

                    // If multi-freelancer and top-level skills are not provided, auto-aggregate
                    if (skillArray.length === 0 && freelancerBreakdownArray.length > 0) {
                        const combined = freelancerBreakdownArray.flatMap(r => r.skills || []);
                        skillArray = Array.from(new Set(combined));
                    }
                }
            } catch (e) {
                console.error("Error parsing freelancerBreakdown:", e);
            }
        }

        // Security check: ensure client can only create projects for their own authenticated account
        if (req.user?.c_id && c_id && req.user.c_id !== c_id) {
            return res.status(403).json({ message: "Forbidden: Cannot create project on behalf of another client" });
        }
        const effectiveCId = req.user?.c_id || c_id;

        const cprojectdata = await cproject.create({
            p_id: req.generated_p_id || await generateId(),
            Pmanager: [],
            c_id: effectiveCId,
            assignedto: null,
            title,
            category,
            budget: Number(budget),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            description,
            status: "waiting-for-approval",
            skills: skillArray,
            filedata: req.file
                ? {
                    key: req.file.key,
                    url: req.file.location,
                    contentType: req.file.mimetype,
                }
                : null,
            assignedDate: null,
            responseDate: null,
            decision: null,
            tasks: [],
            createdby,
            updatedby: null,
            freelancersNeeded: Number(freelancersNeeded) || 1,
            freelancerBreakdown: freelancerBreakdownArray
        });
        const message = `A New Project With Title:${title} Is Waiting to approve and Assign Manager!!`;
        const admin = await Admin.find({}); // Assuming you have an Admin model and at least one admin exists
        for (let a of admin) {
            await sendNotification(a.usr_id, "New project", message, req);
        }
        // Fetch client data to include in socket emission
        const client = await cregister.findOne({ c_id });
        const projectWithClient = {
            ...cprojectdata.toObject(),
            clientname: client ? client.fullname : 'Unknown Client',
            clientemail: client ? client.email : 'No Email'
        };

        // Get io instance
        const io = req.app.get("io");
        // send to all online admins
        for (let adminId in global.adminUsers) {
            const adminSocketId = global.adminUsers[adminId];
            if (adminSocketId) {
                io.to(adminSocketId).emit("projectcreated", projectWithClient);
            }
        }
        await sendDefaultMail(c_id, p_id, title);

        // Use existing client data to send confirmation email
        if (client && client.email) {
            await sendProjectPostToClientEmail(client.email, client.fullname, cprojectdata.p_id, title);

            // Send 'Under Review' email after 1 minute (60000ms)
            setTimeout(async () => {
                await sendProjectUnderReviewEmail(client.email, client.fullname, cprojectdata.p_id, title);
            }, 60000);
        }

        // Send notification to client
        const clientNotificationMsg = `Your project "${title}" (ID: ${cprojectdata.p_id}) has been successfully posted and is currently under review.`;
        await sendNotification(c_id, "Project Posted", clientNotificationMsg, req, { skipEmail: true, p_id: cprojectdata.p_id });

        res.status(200).json(cprojectdata);
    } catch (error) {
        console.error("Mongoose create error:", error);
        res.status(500).json({ message: "Internal server error while creating project", error: error.message });
    }
});

async function sendDefaultMail(c_id, p_id, title) {
    // âœ… FIX #4: Dynamic lookup instead of hardcoded emails
    const admins = await Admin.find({});
    const emails = admins.map(a => a.email).filter(Boolean);

    for (const email of emails) {
        const subject = "New Project Title: " + title + " - Notification from KANSBE";
        const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KANSBE | New Project Match</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; }
        .header { background: #ef2f2c; padding: 20px; text-align: center; color: #fff; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
        .content { padding: 30px; line-height: 1.6; }
        .content p { margin: 12px 0; }
        .footer { text-align: center; font-size: 13px; color: #666; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">KANSBE</div>
        <div class="content">
          <p>Dear Team,</p>
          <p>The client with Id ${c_id} has successfully posted the project of Id ${p_id} along with the required details.</p>
          <p>For more information, please log in to your Kansbe account.</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="http://kansbe.com/alphalogin" style="display:inline-block;background-color:#ef2f2c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">Login to Kansbe</a>
          </div>
          <p>Please Contact to Admin Team for any clarification.</p>
          <p>Warm regards,<br/><strong>Team Kansbe</strong></p>
        </div>
      </div>
    </body>
    </html>`;
        await sendEmail(email, subject, message);
    }
}

async function sendProjectPostToClientEmail(email, fullname, p_id, title) {
    const subject = "Project Posted Successfully â€“ KANSBE";
    const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Project Submission Confirmed</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: #ef2f2c;
      padding: 20px;
      text-align: center;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 14px 0;
    }
    .box {
      background: #fff5f5;
      border: 1px solid #ef2f2c;
      border-left: 6px solid #ef2f2c;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .highlight {
      font-weight: 600;
      color: #ef2f2c;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      color: #666;
      padding: 20px;
      background: #f9f9f9;
      border-top: 1px solid #eee;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>

    <div class="content">
      <p>Hi ${fullname || "Client"},</p>

      <p class="highlight">
        Project successfully posted!
      </p>

      <p>
        Thank you for submitting your project <strong>"${title}"</strong> (Project ID: ${p_id}).
      </p>

      <div class="box">
        <p style="margin-top:0;">
          <strong>Next Steps</strong>
        </p>
        <p>
          We have successfully received all your requirements. Our system has logged the details and securely passed them to our team.
        </p>
        <p style="margin-bottom:0;">
          Please look out for further updates via email as we begin processing your project request.
        </p>
      </div>

      <p>
        You can review your project details anytime by logging into your dashboard.
      </p>
      <div style="text-align:center; margin:30px 0;">
  <a
    href="https://kansbe.com/clientlogin"
    style="
      display:inline-block;
      background-color:#ef2f2c;
      color:#ffffff;
      text-decoration:none;
      padding:12px 28px;
      border-radius:6px;
      font-size:15px;
      font-weight:600;
    "
  >
    View Project
  </a>
</div>

      <p style="margin-top: 24px;">
        With you in every project,<br/><br/>
        <strong>Team Kansbe</strong>
      </p>
    </div>

    <div class="footer">
      <p>
        Questions? Contact us at
        <a href="mailto:support@kansbe.com" style="color:#ef2f2c; text-decoration:none;">
          support@kansbe.com
        </a>
      </p>
      <p>
        Â© ${new Date().getFullYear()} KANSBE Â· Freedom Â· Meaning Â· Possibility
      </p>
    </div>
  </div>
</body>
</html>
`;
    try {
        await sendEmail(email, subject, message);
        console.log("Project confirmation email sent to client:", sanitizeForLogging({ email }));
    } catch (error) {
        console.error("Error sending project confirmation email:", error.message);
    }
}

async function sendProjectUnderReviewEmail(email, fullname, p_id, title) {
    const subject = "Update: Your Project is Under Review â€“ KANSBE";
    const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Project Under Review</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .header { background: #ef2f2c; padding: 20px; text-align: center; color: #fff; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
    .content { padding: 30px; line-height: 1.6; }
    .content p { margin: 14px 0; }
    .box { background: #fff5f5; border: 1px solid #ef2f2c; border-left: 6px solid #ef2f2c; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .highlight { font-weight: 600; color: #ef2f2c; }
    .footer { text-align: center; font-size: 13px; color: #666; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>
    <div class="content">
      <p>Hi ${fullname || "Client"},</p>
      <p class="highlight">Update on your project: "${title}"</p>
      <div class="box">
        <p style="margin-top:0;"><strong>Project Status: Under Review</strong></p>
        <p>Our talent acquisition and matching team has started evaluating the requirements for your project "${title}". We are currently analyzing the required skills and project scope to assign the perfect manager and freelancers to get this job done right.</p>
        <p style="margin-bottom:0;">Once our evaluation is complete, the project will be approved and you will receive another update from us.</p>
      </div>
      <p>We appreciate your patience while we ensure the best matches for your business goals.</p>
      <p style="margin-top: 24px;">Warm regards,<br/><br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer">
      <p>Questions? Contact us at <a href="mailto:support@kansbe.com" style="color:#ef2f2c; text-decoration:none;">support@kansbe.com</a></p>
      <p>Â© ${new Date().getFullYear()} KANSBE Â· Freedom Â· Meaning Â· Possibility</p>
    </div>
  </div>
</body>
</html>
`;
    try {
        await sendEmail(email, subject, message);
        console.log("Project under review email sent to client:", sanitizeForLogging({ email }));
    } catch (error) {
        console.error("Error sending project under review email:", error.message);
    }
}

// ... 2ï¸ Approve/Reject Project (by Admin)
const reviewProject = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const { decision, Pmanager } = req.body; // 'accepted' or 'rejected'

    try {
        // âœ… FIX #5: Race condition guard â€” prevent double review
        const existingProject = await cproject.findOne({ p_id });
        if (!existingProject) {
            return res.status(404).json({ message: "Project not found" });
        }
        if (existingProject.status !== "waiting-for-approval") {
            return res.status(409).json({
                message: "This project has already been reviewed",
                currentStatus: existingProject.status
            });
        }

        let assignedManagerIds = [];

        if (decision !== "rejected") {
            // âœ… ROUND-ROBIN: Auto-assign if admin didn't manually pick manager(s)
            if (!Pmanager || (Array.isArray(Pmanager) && Pmanager.length === 0)) {
                const nextManager = await getNextAvailableManager();
                if (!nextManager) {
                    return res.status(503).json({
                        message: "No managers are currently available. All managers are either inactive, on leave, or at full capacity."
                    });
                }
                assignedManagerIds = [nextManager.usr_id];
            } else {
                // Admin manually selected â€” use their choice
                assignedManagerIds = Array.isArray(Pmanager)
                    ? (Array.isArray(Pmanager[0]) ? Pmanager.flat() : Pmanager)
                    : [Pmanager];
            }
        }

        // âœ… FIX #5: Atomic update with status check to prevent race condition
        const cprojectdata = await cproject.findOneAndUpdate(
            { p_id, status: "waiting-for-approval" },
            {
                status: decision === "rejected" ? "rejected" : "available",
                Pmanager: decision === "rejected" ? [] : assignedManagerIds,
                updatedby: req.user?.usr_id || null  // âœ… FIX #6: Audit trail
            },
            { new: true }
        );

        if (!cprojectdata) {
            return res.status(409).json({ message: "Project was already reviewed by another admin" });
        }

        // âœ… FIX #7: Scoped socket â€” emit to admins only, not broadcast
        const io = req.app.get("io");
        if (io) {
            for (let adminId in global.adminUsers) {
                const adminSocketId = global.adminUsers[adminId];
                if (adminSocketId) {
                    io.to(adminSocketId).emit("projectupdated", cprojectdata);
                }
            }

            // Emit status change to specific client only
            if (cprojectdata.c_id && global.onlineUsers) {
                const clientSocketId = global.onlineUsers[cprojectdata.c_id];
                if (clientSocketId) {
                    io.to(clientSocketId).emit("projectStatusChanged", {
                        p_id: cprojectdata.p_id,
                        c_id: cprojectdata.c_id,
                        status: cprojectdata.status,
                        project: cprojectdata
                    });
                }
            }
        }

        if (decision === "rejected") {
            // Notify client about rejection
            const rejectionMsg = `We regret to inform you that your project "${cprojectdata.title}" (ID: ${cprojectdata.p_id}) has been reviewed and could not be accepted at this time. Please contact support for more details.`;
            await sendNotification(cprojectdata.c_id, "Project Rejected", rejectionMsg, req, { p_id: cprojectdata.p_id });
        } else {
            // Notify client about approval + manager assignment
            const managers = await Admin.find({ usr_id: { $in: assignedManagerIds } });
            const managerNames = managers.map(m => m.usr_name || 'Manager');

            const clientMsg = `Your project "${cprojectdata.title}" (ID: ${cprojectdata.p_id}) has been approved and assigned to manager(s): ${managerNames.join(', ')}.`;
            await sendNotification(cprojectdata.c_id, "Project Approved", clientMsg, req, { p_id: cprojectdata.p_id });

            // âœ… Notify all assigned managers (in-app notification + email via SES)
            const managerMsg = `You have been assigned as manager for project: "${cprojectdata.title}" (ID: ${cprojectdata.p_id}). Please log in to review the project details.`;
            await sendNotification(assignedManagerIds, "Project Assignment", managerMsg, req, { p_id: cprojectdata.p_id });
        }

        res.status(200).json(cprojectdata);
    } catch (error) {
        console.error("Review Project Error:", error);
        res.status(500).json({ message: "Failed to review project", error: error.message });
    }
});

// Note: Using shared sendNotification from Utility/notificationUtils.js



// 3 Assign Project to Freelancer (by Admin)

const assignProject = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const { assignedto } = req.body;

    try {
        const cprojectdata = await cproject.findOneAndUpdate(
            { p_id },
            {
                assignedto,
                status: "assigned",
                assignedDate: new Date(),
            },
            { new: true }
        );

        if (!cprojectdata) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Fetch members from joined table
        const getmembers = await cproject.aggregate([
            { $match: { p_id: p_id } },
            {
                $lookup: {
                    from: "groups",
                    localField: "p_id",
                    foreignField: "p_id",
                    as: "group_members"
                }
            }
        ]);

        // Extract user IDs from group_members.members[]
        const group = getmembers[0]?.group_members?.[0];

        const userIds = group?.members?.map(m => m.member) || [];

        // If no users found
        if (userIds.length === 0) {
            console.log("âš ï¸ No members found to notify");
        }

        const message = `A new Project has been assigned to you: "${cprojectdata.title}". For more details check your project container`;
        const io = req.app.get("io");
        for (let userId of userIds) {
            const socketId = global.onlineUsers[userId.toString()];
            if (socketId) {
                io.to(socketId).emit("projectupdated", cprojectdata);
            }
        }
        // Send notification only to member IDs
        await sendNotification(userIds, "New Project", message, req);

        res.status(200).json(cprojectdata);

    } catch (error) {
        console.error("Assign Project Error:", error);
        res.status(500).json({ message: "Failed to assign project", error: error.message });
    }
});


// [REMOVED] freelancerResponse - redundant with groupController.updatememberdecision






// Updating the Data

const updateProject = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const cprojectdata = await cproject.findOne({ p_id });
    if (!cprojectdata) {
        res.status(400);
        throw new Error("Project Not Found With Provided Id");
    }

    if (cprojectdata.status === "completed") {
        return res.status(400).json({ message: "Completed projects cannot be updated" });
    }

    // Authorization check: only the client owner of the project or an admin/manager can update the project
    const isOwner = req.user && req.user.c_id && cprojectdata.c_id === req.user.c_id;
    const isAdminOrManager = req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.usr_id);
    if (!isOwner && !isAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update this project" });
    }

    let updateData = { ...req.body };

    // Format fields correctly
    if (updateData.budget) {
        updateData.budget = Number(updateData.budget);
    }
    if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
    }

    // Parse new Actuals if provided
    if (updateData.actualBudget) {
        updateData.actualBudget = Number(updateData.actualBudget);
    }
    if (updateData.freelancersNeeded) {
        updateData.freelancersNeeded = Number(updateData.freelancersNeeded);
    }
    if (updateData.actualStartDate) {
        updateData.actualStartDate = new Date(updateData.actualStartDate);
    }
    if (updateData.actualEndDate) {
        updateData.actualEndDate = new Date(updateData.actualEndDate);
    }

    // Parse skills if they come as string or array and deduplicate case-insensitively
    if (updateData.skills) {
        let rawUpdateSkills = [];
        if (typeof updateData.skills === "string") {
            rawUpdateSkills = updateData.skills.split(",");
        } else if (Array.isArray(updateData.skills)) {
            rawUpdateSkills = updateData.skills.flatMap(s => typeof s === 'string' ? s.split(',') : [s]);
        }
        const seenUpdateSkills = new Set();
        updateData.skills = [];
        for (const item of rawUpdateSkills) {
            const sName = String(item || '').trim();
            const norm = sName.toLowerCase();
            if (sName && !seenUpdateSkills.has(norm)) {
                seenUpdateSkills.add(norm);
                updateData.skills.push(sName);
            }
        }
    }

    if (updateData.freelancerBreakdown) {
        try {
            updateData.freelancerBreakdown = typeof updateData.freelancerBreakdown === 'string' 
                ? JSON.parse(updateData.freelancerBreakdown) 
                : updateData.freelancerBreakdown;

            if (Array.isArray(updateData.freelancerBreakdown)) {
                updateData.freelancerBreakdown = updateData.freelancerBreakdown.map(role => {
                    let roleSkills = [];
                    if (Array.isArray(role.skills)) {
                        roleSkills = role.skills;
                    } else if (typeof role.skills === 'string') {
                        roleSkills = role.skills.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    return {
                        ...role,
                        skills: roleSkills
                    };
                });
            }
        } catch (e) {
            console.error("Error parsing freelancerBreakdown during update:", e);
        }
    }

    // Handle file update â€” archive old version instead of deleting from S3
    if (req.file) {
        if (cprojectdata.filedata && cprojectdata.filedata.key) {
            const currentVersionCount = cprojectdata.fileVersions ? cprojectdata.fileVersions.length : 0;
            // Push the current file into the versions array before replacing it
            await cproject.updateOne(
                { p_id },
                {
                    $push: {
                        fileVersions: {
                            version: currentVersionCount + 1,
                            key: cprojectdata.filedata.key,
                            url: cprojectdata.filedata.url,
                            contentType: cprojectdata.filedata.contentType,
                            uploadedBy: req.body.updatedby || "unknown",
                            uploadedAt: cprojectdata.updatedAt || new Date(),
                            note: req.body.fileNote || ""
                        }
                    }
                }
            );
        }
        updateData.filedata = {
            key: req.file.key,
            url: req.file.location,
            contentType: req.file.mimetype,
        };
    }

    const updatedproject = await cproject.findOneAndUpdate(
        { p_id },
        updateData,
        { new: true }
    );

    // Notify admins live
    const io = req.app.get("io");
    if (io) {
        for (let adminId in global.adminUsers) {
            const adminSocketId = global.adminUsers[adminId];
            if (adminSocketId) {
                io.to(adminSocketId).emit("projectupdated", updatedproject);
            }
        }
    }

    res.status(200).json(updatedproject);
});


// [REMOVED] updatefreelancerDecision - redundant with groupController.updatememberdecision


// Delete project
const deletecproject = asyncHandler(async (req, res) => {
    const cprojectdata = await cproject.findOne({ p_id: req.params.p_id });
    if (!cprojectdata) {
        res.status(400)
        throw new Error("Project not Found");
    }
    if (cprojectdata.status === "completed") {
        return res.status(400).json({ message: "Completed projects cannot be deleted" });
    }
    const deleteproject = await cproject.findOneAndDelete({ p_id: req.params.p_id });
    if (deleteproject && deleteproject.filedata && deleteproject.filedata.key) {
        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: deleteproject.filedata.key
            }));
        } catch (err) {
            console.error("Failed to delete project file from S3 on project deletion:", err);
        }
    }
    const io = req.app.get("io");
    for (let adminId in global.adminUsers) {
        const adminSocketId = global.adminUsers[adminId];
        if (adminSocketId) {
            io.to(adminSocketId).emit("projectdeleted", deleteproject.p_id);
        }
    }
    res.status(200).json(deleteproject);
})


/**
 * @desc Add Task to Project
 * @route POST /api/projects/:p_id/tasks
 * @access Manager / Admin
 */
const addTask = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const {
        title,
        status,
        assignedto,
        summary,
        startdate,
        duedate,
        createdby
    } = req.body;

    if (!title) {
        return res.status(400).json({ message: "Task title is required" });
    }

    const project = await cproject.findOne({ p_id });

    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "completed") {
        return res.status(400).json({ message: "Cannot add tasks to a completed project" });
    }

    const nextTaskId =
        project.Tasks.length > 0
            ? Math.max(...project.Tasks.map(t => t.id || 0)) + 1
            : 1;

    project.Tasks.push({
        id: nextTaskId,
        title,
        status: "pending-client-approval", // Force client approval first
        assignedto,
        summary,
        startdate,
        duedate,
        createdby
    });

    await project.save();

    const newTask = project.Tasks.at(-1);

    await logUserActivity(req, 'task_create', 'task', newTask?._id?.toString?.() || String(nextTaskId), {
      p_id,
      title,
      assignedto,
      status
    });

    // Emit live task update ONLY to client and manager (NOT freelancer â€” task not yet approved)
    const io = req.app.get("io");
    if (io) {
        const emitToUser = (userId, event, payload) => {
            const socketId = global.onlineUsers?.[userId];
            if (socketId) io.to(socketId).emit(event, payload);
        };
        // Emit to manager(s)
        if (project.Pmanager && project.Pmanager.length > 0) {
            project.Pmanager.forEach((managerId) => emitToUser(managerId, "taskCreated", { p_id, task: newTask }));
        }
        // Emit to client
        if (project.c_id) {
            emitToUser(project.c_id, "taskCreated", { p_id, task: newTask });
        }
    }

    // Notify the client for approval
    if (project.c_id) {
        await sendNotification(
            project.c_id,
            "Task Approval Required",
            `A new task "${title}" has been drafted by the manager for project ${p_id} and requires your approval.`,
            req
        ).catch(e => console.error("Task client notify error:", e));
    }

    // Always notify the manager(s) when a task is created
    if (project.Pmanager && project.Pmanager.length > 0) {
        await sendNotification(
            project.Pmanager,
            "Task Created",
            `A new task "${title}" has been successfully drafted for project ${p_id} and sent to the client for approval.`,
            req
        ).catch(e => console.error("Task manager notify error:", e));
    }

    res.status(201).json({
        message: "Task created successfully",
        task: newTask
    });
});



/**
 * @desc Get all tasks of a project
 * @route GET /api/projects/:p_id/tasks
 * @access Authenticated
 */
const getTasks = asyncHandler(async (req, res) => {
    await logUserActivity(req, 'task_check', 'task', req.params.p_id, {
      view: 'project-tasks'
    });

    const project = await cproject.findOne(
        { p_id: req.params.p_id },
        { Tasks: 1, _id: 0 }
    ).lean();

    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ tasks: project.Tasks || [] });
});
/**
 * @desc Update a task
 * @route PUT /api/projects/:p_id/tasks/:taskId
 * @access Manager / Admin
 */
const updateTask = asyncHandler(async (req, res) => {
    const { p_id, taskId } = req.params;

    const project = await cproject.findOne({ p_id });

    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "completed") {
        return res.status(400).json({ message: "Cannot update tasks of a completed project" });
    }

    const targetTask = (project.Tasks || []).find(t => 
        (t._id && t._id.toString() === taskId) ||
        String(t.id) === String(taskId)
    );

    if (!targetTask) {
        return res.status(404).json({ message: "Task not found" });
    }

    const allowedFields = [
        "title",
        "status",
        "assignedto",
        "summary",
        "startdate",
        "duedate",
        "updatedby",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            updates[`Tasks.$.${field}`] = req.body[field];
        }
    });

    const updatedProject = await cproject.findOneAndUpdate(
        { p_id, "Tasks._id": targetTask._id },
        { $set: updates },
        { new: true }
    );

    await logUserActivity(req, 'task_update', 'task', taskId, {
      p_id,
      updatedFields: Object.keys(updates),
      status: req.body.status || null
    });

    if (!updatedProject) {
        return res.status(404).json({ message: "Task not found" });
    }

    // Emit live task update â€” only broadcast to freelancer if task is client-approved
    const io = req.app.get("io");
    const updatedTask = updatedProject.Tasks.find(t => 
        (t._id && t._id.toString() === targetTask._id.toString()) ||
        String(t.id) === String(taskId)
    );
    const clientBlockedStatuses = ['pending-client-approval', 'client-rejected'];
    const emitToUser = (userId, event, payload) => {
        const socketId = global.onlineUsers?.[userId];
        if (socketId) io.to(socketId).emit(event, payload);
    };
    if (io && updatedTask) {
        if (clientBlockedStatuses.includes(updatedTask.status)) {
            // Only notify client and manager â€” freelancer should not know yet
            if (updatedProject.c_id) {
                emitToUser(updatedProject.c_id, "taskUpdated", { p_id, task: updatedTask });
            }
            if (updatedProject.Pmanager && updatedProject.Pmanager.length > 0) {
                updatedProject.Pmanager.forEach((managerId) => {
                    emitToUser(managerId, "taskUpdated", { p_id, task: updatedTask });
                });
            }
        } else {
            // Task is approved â€” broadcast to everyone in the project room
            io.to(p_id).emit("taskUpdated", { p_id, task: updatedTask });
        }
    }

    const updatedBy = req.user?.id;

    // Notify assigned freelancer ONLY if task is not in client review (pending or rejected)
    if (updatedTask && updatedTask.assignedto && updatedTask.assignedto !== updatedBy && !clientBlockedStatuses.includes(updatedTask.status)) {
        await sendNotification(
            updatedTask.assignedto,
            "Task Updated",
            `Your assigned task "${updatedTask.title}" has been updated.`,
            req
        ).catch(e => console.error("Task update notify error:", e));
    }

    // Notify all managers (always notify them as receipt)
    if (updatedProject.Pmanager && updatedProject.Pmanager.length > 0) {
        await sendNotification(
            updatedProject.Pmanager,
            "Task Updated",
            `The task "${updatedTask.title}" in project ${p_id} has been updated.`,
            req
        ).catch(e => console.error("Task update notify error for managers:", e));
    }

    // If status was changed back to pending-client-approval, notify the client
    if (req.body.status === "pending-client-approval" && updatedProject.c_id) {
        await sendNotification(
            updatedProject.c_id,
            "Task Approval Required",
            `The task "${updatedTask.title}" has been updated by the manager and requires your approval.`,
            req
        ).catch(e => console.error("Task update notify error for client:", e));
    }

    res.json({ message: "Task updated successfully", task: updatedTask });
});

/**
 * @desc Update task status only
 * @route put /api/cprojects/:p_id/tasks/:taskId/status
 * @access Assigned Freelancer
 */
const updateTaskStatus = asyncHandler(async (req, res) => {
    const { p_id, taskId } = req.params;
    const { status, approval_reject_reason, completion_reject_reason, submission_url, submission_note, submission_media } = req.body;

    if (!status) {
        return res.status(400).json({ message: "Status is required" });
    }

    const projectCheck = await cproject.findOne({ p_id });
    if (!projectCheck) {
        return res.status(404).json({ message: "Project not found" });
    }
    if (projectCheck.status === "completed") {
        return res.status(400).json({ message: "Cannot update task status of a completed project" });
    }

    const targetTask = (projectCheck.Tasks || []).find(t => 
        (t._id && t._id.toString() === taskId) ||
        String(t.id) === String(taskId)
    );

    if (!targetTask) {
        return res.status(404).json({ message: "Task not found" });
    }

    const effectiveTaskId = targetTask._id?.toString() || (targetTask.id !== undefined ? String(targetTask.id) : taskId);

    // Authorization check: Only client owner, assigned freelancer, or admin/manager can update task status
    const isTaskClientOwner = isProjectClientOwner(req.user, projectCheck);
    const isTaskAdminOrManager = isUserAdminOrManager(req.user, projectCheck);
    const freelancerId = extractFreelancerId(req.user);
    const isTaskAssignedFreelancer = freelancerId ? await isFreelancerAssignedToProject(projectCheck, freelancerId, effectiveTaskId) : false;

    if (!isTaskClientOwner && !isTaskAssignedFreelancer && !isTaskAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update tasks for this project" });
    }

    const updateFields = {
        "Tasks.$.status": status,
        "Tasks.$.updatedby": req.user?.id,
    };
    
    // Handle specific reject reasons
    if (approval_reject_reason !== undefined) {
        updateFields["Tasks.$.approval_reject_reason"] = approval_reject_reason;
    }
    if (completion_reject_reason !== undefined) {
        updateFields["Tasks.$.completion_reject_reason"] = completion_reject_reason;
    }
    if (submission_url !== undefined) {
        updateFields["Tasks.$.submission_url"] = submission_url ? submission_url.trim() : null;
    }
    if (submission_note !== undefined) {
        updateFields["Tasks.$.submission_note"] = submission_note ? submission_note.trim() : null;
    }
    if (submission_media !== undefined) {
        updateFields["Tasks.$.submission_media"] = Array.isArray(submission_media) ? submission_media : [];
    }
    if (status === 'pending-client-completion-approval') {
        updateFields["Tasks.$.submitted_at"] = new Date();
    }

    const project = await cproject.findOneAndUpdate(
        { p_id, "Tasks._id": targetTask._id },
        {
            $set: updateFields,
        },
        { new: true }
    );

    if (!project) {
        return res.status(404).json({ message: "Task not found" });
    }

    await logUserActivity(req, 'task_status_update', 'task', taskId, {
      p_id,
      status,
      approval_reject_reason: approval_reject_reason || null,
      completion_reject_reason: completion_reject_reason || null
    });

    // --- TRIGGER TASK MEDIA WORKER FOR NEW PROCESSING FILES ---
    if (Array.isArray(submission_media) && submission_media.length > 0) {
        try {
            const { taskMediaWorkerQueue } = require('../queues/taskMediaQueue');
            submission_media.forEach((item, idx) => {
                if (item && item.tempS3Key && item.mediaStatus === 'processing') {
                    taskMediaWorkerQueue.add('process-task-media', {
                        p_id,
                        taskId: effectiveTaskId,
                        tempS3Key: item.tempS3Key,
                        fileName: item.originalName,
                        fileType: item.mimeType || item.mediaType,
                        mediaIndex: idx
                    });
                    console.log(`[Task Media Queue] Enqueued media processing for ${p_id} task ${taskId} [${idx}]`);
                }
            });
        } catch (queueErr) {
            console.error('[Task Media Queue] Failed to enqueue task media processing:', queueErr.message);
        }
    }

    // Emit live task status update â€” if still in client review, only notify client+manager, NOT freelancer
    const io = req.app.get("io");
    const emitToUser = (userId, event, payload) => {
        const socketId = global.onlineUsers?.[userId];
        if (socketId) io.to(socketId).emit(event, payload);
    };
    const clientOnlyStatuses = ['pending-client-approval', 'client-rejected'];
    if (clientOnlyStatuses.includes(status)) {
        if (project.c_id) {
            emitToUser(project.c_id, "taskStatusUpdated", { p_id, taskId, status, approval_reject_reason, completion_reject_reason });
        }
        if (project.Pmanager && project.Pmanager.length > 0) {
            project.Pmanager.forEach((managerId) => {
                emitToUser(managerId, "taskStatusUpdated", { p_id, taskId, status, approval_reject_reason, completion_reject_reason });
            });
        }
    } else {
        // Approved or freelancer-relevant status — broadcast to all in room
        const foundTask = project.Tasks.find(t => t._id.toString() === targetTask._id.toString());
        if (io) {
            io.to(p_id).emit("taskStatusUpdated", { p_id, taskId, status, approval_reject_reason, completion_reject_reason, task: foundTask });
            if (foundTask) {
                io.to(p_id).emit("taskUpdated", { p_id, task: foundTask });
            }
        }
    }


    const updatedBy = req.user?.id;
    const updatedTask = project.Tasks.find(t => t._id.toString() === targetTask._id.toString());

    // Notify all managers that task status changed (always notify them as receipt)
    if (project.Pmanager && project.Pmanager.length > 0) {
        await sendNotification(
            project.Pmanager,
            "Task Status Update",
            `The status for task "${updatedTask?.title || taskId}" in project ${p_id} has been updated to "${status}".`,
            req
        ).catch(e => console.error("Task status notify error for managers:", e));
    }

    // Notify client if task requires their approval for completion
    if (status === 'pending-client-completion-approval' && project.c_id && project.c_id !== updatedBy) {
        await sendNotification(
            project.c_id,
            "Task Completion Approval Required",
            `The task "${updatedTask?.title || taskId}" in project ${p_id} has been submitted for your approval.`,
            req
        ).catch(e => console.error("Task status notify error for client:", e));
    }

    // Notify assigned freelancer ONLY if task is approved (not pending or rejected by client)
    const clientBlockedStatuses = ['pending-client-approval', 'client-rejected'];
    if (updatedTask && updatedTask.assignedto && updatedTask.assignedto !== updatedBy && !clientBlockedStatuses.includes(status)) {
        await sendNotification(
            updatedTask.assignedto,
            "Task Status Updated",
            `The status for your assigned task "${updatedTask.title}" has been updated to "${status}".`,
            req
        ).catch(e => console.error("Task status notify error for freelancer:", e));
    }

    // 🔔 Auto-notify managers when 100% of tasks are completed
    const allTasksCompleted = (project.Tasks || []).length > 0 &&
        project.Tasks.every(t => (t.status || '').toLowerCase() === 'completed');

    if (allTasksCompleted && project.status === 'in-progress') {
        if (project.Pmanager && project.Pmanager.length > 0) {
            await sendNotification(
                project.Pmanager,
                "All Tasks Completed",
                `All tasks for project "${project.title || p_id}" are now complete! Please review deliverables and forward completion to the client.`,
                req
            ).catch(e => console.error("All tasks completion notify error:", e));
        }
        if (io) {
            io.to(p_id).emit("allTasksCompleted", { p_id, title: project.title });
        }
    }

    res.json({ message: "Task status updated" });
});

/**
 * @desc Delete a task
 * @route DELETE /api/projects/:p_id/tasks/:taskId
 * @access Manager / Admin
 */
const deleteTask = asyncHandler(async (req, res) => {
    const { p_id, taskId } = req.params;

    const projectCheck = await cproject.findOne({ p_id });
    if (projectCheck && projectCheck.status === "completed") {
        return res.status(400).json({ message: "Cannot delete tasks of a completed project" });
    }

    const targetTask = projectCheck?.Tasks?.find(t => 
        (t._id && t._id.toString() === taskId) ||
        String(t.id) === String(taskId)
    );

    if (!targetTask) {
        return res.status(404).json({ message: "Task not found" });
    }

    const project = await cproject.findOneAndUpdate(
        { p_id },
        { $pull: { Tasks: { _id: targetTask._id } } },
        { new: true }
    );

    await logUserActivity(req, 'task_delete', 'task', taskId, {
      p_id,
      deleted: true
    });

    if (!project) {
        return res.status(404).json({ message: "Project or task not found" });
    }

    res.json({ message: "Task deleted successfully" });
});



// Get all projects with pagination and filtering for the super admin portal
const getAllProjectsAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    let match = {};

    // 1. Status Filter
    if (req.query.status) {
        const reqStat = req.query.status.toLowerCase();
        if (reqStat === "active project") {
            match.status = { $in: ["available", "assigned", "in-progress"] };
        } else if (reqStat === "inactive") {
            match.status = "rejected";
        } else if (reqStat === "completed") {
            match.status = "completed";
        } else if (reqStat === "assigned") {
            match.status = "assigned";
        } else if (reqStat === "not assigned") {
            match.$and = [
                { status: { $ne: "assigned" } },
                { status: { $ne: "in-progress" } },
                { status: { $ne: "completed" } }
            ];
        } else {
            match.status = reqStat;
        }
    }

    // 2. Search filter
    if (req.query.search) {
        const regex = new RegExp(req.query.search, "i");
        if (match.$or) {
            match.$and = match.$and || [];
            match.$and.push({ $or: [{ p_id: regex }, { title: regex }, { category: regex }, { c_id: regex }] });
        } else {
            match.$or = [
                { p_id: regex },
                { title: regex },
                { category: regex },
                { c_id: regex }
            ];
        }
    }

    // 3. Aggregate query
    const projects = await cproject.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "groups",
                localField: "p_id",
                foreignField: "p_id",
                as: "group_members"
            }
        },
        {
            $lookup: {
                from: "cregisters",
                localField: "c_id",
                foreignField: "c_id",
                as: "clientDetails"
            }
        },
        { $unwind: { path: "$clientDetails", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                clientname: "$clientDetails.fullname",
                clientemail: "$clientDetails.email"
            }
        },
        { $project: { clientDetails: 0 } }
    ]);

    const total = await cproject.countDocuments(match);

    res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        projects
    });
});

/**
 * @desc Update project status (Unified Workflow)
 * @route PUT /api/cproject/:p_id/update-status
 * @access Authenticated (Freelancer, Manager, Client)
 */
const updateProjectStatus = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ message: "Status is required" });
    }

    const project = await cproject.findOne({ p_id });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Authorization checks: Verify caller identity and role
    const isClientOwner = isProjectClientOwner(req.user, project);
    const isAdminOrManager = isUserAdminOrManager(req.user, project);
    const freelancerIdProj = extractFreelancerId(req.user);
    const isAssignedFreelancer = freelancerIdProj ? await isFreelancerAssignedToProject(project, freelancerIdProj) : false;

    if (!isClientOwner && !isAssignedFreelancer && !isAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update this project's status" });
    }

    if (status === "freelancer-completion-request" && !isAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: Only managers or admins can request project completion" });
    }
    if (status === "ready-for-completion" && !isAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: Only managers or admins can forward projects for completion" });
    }
    if (status === "completed" && !isClientOwner && !isAdminOrManager) {
        return res.status(403).json({ message: "Forbidden: Only the project owner or admin can finalize completion" });
    }

    // Status Validations
    if (status === "freelancer-completion-request" && project.status !== "in-progress") {
        return res.status(400).json({ message: "Only in-progress projects can be requested for completion" });
    }
    if (status === "ready-for-completion" && project.status !== "freelancer-completion-request" && project.status !== "in-progress") {
        return res.status(400).json({ message: "Only in-progress or requested projects can be forwarded to client" });
    }
    if (status === "completed" && project.status !== "ready-for-completion") {
        return res.status(400).json({ message: "Only projects ready-for-completion can be finalized" });
    }

    project.status = status;
    if (status === "completed") {
        project.actualEndDate = new Date();

        // Handle Client Feedback
        const clientFeedback = req.body.clientFeedback;
        if (clientFeedback && typeof clientFeedback === "object") {
            try {
                for (const freelancer_id of Object.keys(clientFeedback)) {
                    const fb = clientFeedback[freelancer_id];
                    
                    // Save backup to project
                    if (!project.feedback) {
                        project.feedback = { clientFeedback: {}, freelancerFeedback: {} };
                    }
                    
                    // Fallback to object assignment if .set is not a function (common Mongoose Map issue)
                    if (project.feedback.clientFeedback && typeof project.feedback.clientFeedback.set === 'function') {
                        project.feedback.clientFeedback.set(freelancer_id, {
                            rating: fb.rating,
                            description: fb.description,
                            submittedAt: new Date()
                        });
                    } else {
                        if (!project.feedback.clientFeedback) project.feedback.clientFeedback = {};
                        project.feedback.clientFeedback[freelancer_id] = {
                            rating: fb.rating,
                            description: fb.description,
                            submittedAt: new Date()
                        };
                    }

                    // Update freelancer (userModel)
                    const freelancer = await User.findOne({ fl_id: freelancer_id });
                    if (freelancer) {
                        let totalRating = (freelancer.averageRating || 0) * (freelancer.totalReviews || 0);
                        let newTotalReviews = (freelancer.totalReviews || 0);

                        if (!freelancer.reviews) freelancer.reviews = {};

                        // Check if review exists (handles both Map and Object)
                        const hasReview = typeof freelancer.reviews.has === 'function' 
                            ? freelancer.reviews.has(p_id) 
                            : !!freelancer.reviews[p_id];

                        if (!hasReview) {
                            newTotalReviews += 1;
                            totalRating += fb.rating;
                            freelancer.averageRating = parseFloat((totalRating / newTotalReviews).toFixed(1));
                            freelancer.totalReviews = newTotalReviews;
                        }

                        if (typeof freelancer.reviews.set === 'function') {
                            freelancer.reviews.set(p_id, {
                                reviewer_id: project.c_id,
                                rating: fb.rating,
                                description: fb.description,
                                createdAt: new Date()
                            });
                        } else {
                            freelancer.reviews[p_id] = {
                                reviewer_id: project.c_id,
                                rating: fb.rating,
                                description: fb.description,
                                createdAt: new Date()
                            };
                        }

                        // Mark modified so Mongoose saves mixed/object types properly
                        freelancer.markModified('reviews');
                        await freelancer.save();
                    }
                }
                
                project.markModified('feedback');
            } catch (fbErr) {
                console.error("Error updating feedback: ", fbErr);
                return res.status(500).json({ message: "Failed to save feedback data: " + (fbErr.message || fbErr.toString()) });
            }
        }
    }
    await project.save();

    // Emit live update
    const io = req.app.get("io");
    if (io) {
        io.to(p_id).emit("projectStatusUpdated", { p_id, status });
    }

    // Notifications
    if (status === "freelancer-completion-request" && project.Pmanager && project.Pmanager.length > 0) {
        await sendNotification(
            project.Pmanager,
            "Project Completion Requested",
            "Freelancer has requested completion for project '" + project.title + "'. Please review.",
            req
        ).catch(e => console.error("Notify error:", e));
    } 
    else if (status === "ready-for-completion" && project.c_id) {
        await sendNotification(
            project.c_id,
            "Project Completion Request",
            "Manager has requested to mark project '" + project.title + "' as completed. Please review and finalize.",
            req
        ).catch(e => console.error("Notify error:", e));
    }
    else if (status === "completed") {
        const members = await cproject.aggregate([
            { $match: { p_id } },
            {
                $lookup: {
                    from: "groups",
                    localField: "p_id",
                    foreignField: "p_id",
                    as: "group"
                }
            }
        ]);
        const group = members[0]?.group?.[0];
        const userIds = group?.members?.map(m => m.member) || [];
        
        if (project.Pmanager && project.Pmanager.length > 0) {
            project.Pmanager.forEach(id => {
                if (!userIds.includes(id)) userIds.push(id);
            });
        }
        if (project.c_id && !userIds.includes(project.c_id)) {
            userIds.push(project.c_id);
        }

        await sendNotification(
            userIds,
            "Project Completed",
            "The project '" + project.title + "' has been officially marked as completed by the client.",
            req
        ).catch(e => console.error("Final completion notify error:", e));
    }

    res.json({ message: "Project status updated to " + status, project });
});

// Get approved projects by client ID
const getapprovedprojects = asyncHandler(async (req, res) => {
    const projectdata = await cproject.find({
        c_id: req.params.c_id,
        status: { $in: ["available", "assigned", "in-progress", "ready-for-completion", "completed"] }
    });
    res.status(200).json(projectdata);
});

// â”€â”€â”€ File Version History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @desc Get all file versions for a project
 * @route GET /api/cproject/:p_id/file-versions
 * @access Authenticated
 */
const getFileVersions = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const project = await cproject.findOne({ p_id }, { filedata: 1, fileVersions: 1, title: 1 });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json({
        current: project.filedata || null,
        versions: (project.fileVersions || []).sort((a, b) => b.version - a.version)
    });
});

/**
 * @desc Get a signed download URL for a specific file version
 * @route GET /api/cproject/:p_id/file-versions/:versionIndex/download
 * @access Authenticated
 */
const getFileVersionUrl = asyncHandler(async (req, res) => {
    const { p_id, versionIndex } = req.params;
    const project = await cproject.findOne({ p_id });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }
    const version = project.fileVersions?.[Number(versionIndex)];
    if (!version || !version.key) {
        return res.status(404).json({ message: "File version not found" });
    }
    const command = new GetObjectCommand({
        Bucket: "kansbe-files-storage",
        Key: version.key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url, version });
});

// â”€â”€â”€ Freelancer Feedback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const submitFreelancerFeedback = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    const { clientRating, clientDescription, kansbeRating, kansbeDescription } = req.body;
    // Enforce authenticated freelancer identity to prevent IDOR / review spoofing
    const freelancer_id = req.user?.fl_id || (req.user?.role === 'admin' ? req.body.freelancer_id : null);

    if (!freelancer_id) {
        return res.status(403).json({ message: "Forbidden: Only authenticated freelancers can submit feedback" });
    }

    const project = await cproject.findOne({ p_id });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isAssigned = await isFreelancerAssignedToProject(project, freelancer_id);
    const isAdmin = isUserAdminOrManager(req.user, project);

    if (!isAssigned && !isAdmin) {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this project" });
    }

    // Store in project
    if (!project.feedback) project.feedback = { clientFeedback: new Map(), freelancerFeedback: new Map() };
    project.feedback.freelancerFeedback.set(freelancer_id, {
        clientRating, clientDescription, kansbeRating, kansbeDescription, submittedAt: new Date()
    });
    await project.save();

    // Store client rating in cregisterModel
    if (project.c_id && clientRating) {
        const client = await cregister.findOne({ c_id: project.c_id });
        if (client) {
            let totalRating = (client.averageRating || 0) * (client.totalReviews || 0);
            let newTotalReviews = (client.totalReviews || 0);
            if (!client.reviews) client.reviews = new Map();

            // Prevent duplicate averages
            const reviewKey = p_id + "_" + freelancer_id;
            if (!client.reviews.has(reviewKey)) {
                newTotalReviews += 1;
                totalRating += clientRating;
                client.averageRating = parseFloat((totalRating / newTotalReviews).toFixed(1));
                client.totalReviews = newTotalReviews;
            }

            client.reviews.set(reviewKey, {
                reviewer_id: freelancer_id,
                rating: clientRating,
                description: clientDescription,
                createdAt: new Date()
            });

            await client.save();
        }
    }

    res.json({ message: "Feedback submitted successfully" });
});


/**
 * @desc Get AI/Deterministic matched freelancers for a project
 * @route GET /api/cproject/:p_id/matched-freelancers
 * @access Private (Admin)
 */
const getMatchedFreelancers = asyncHandler(async (req, res) => {
    const { p_id } = req.params;
    if (!p_id) {
        return res.status(400).json({ message: "Project ID (p_id) is required" });
    }

    try {
        const matchResults = await findBestMatchesForProject(p_id);
        res.status(200).json(matchResults);
    } catch (error) {
        console.error(`[cprojectController] Match error for ${p_id}:`, error);
        res.status(error.message.includes("not found") ? 404 : 500).json({
            message: error.message || "Failed to calculate freelancer matches"
        });
    }
});

/**
 * @desc Get S3 presigned URL for direct browser-to-S3 task media upload
 * @route GET /api/cproject/:p_id/tasks/:taskId/upload-url
 * @access Assigned Freelancer / Manager / Admin
 */
const getTaskUploadUrl = asyncHandler(async (req, res) => {
    const { p_id, taskId } = req.params;
    const { fileName, fileType } = req.query;

    if (!fileName || !fileType) {
        return res.status(400).json({ message: "fileName and fileType are required query parameters" });
    }

    const project = await cproject.findOne({ p_id });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    const targetTask = (project.Tasks || []).find(t => 
        (t._id && t._id.toString() === taskId) ||
        String(t.id) === String(taskId)
    );

    if (!targetTask) {
        return res.status(404).json({ message: "Task not found" });
    }

    const effectiveTaskId = targetTask._id?.toString() || (targetTask.id !== undefined ? String(targetTask.id) : taskId);

    const freelancerId = extractFreelancerId(req.user);
    const isTaskAssigned = freelancerId ? await isFreelancerAssignedToProject(project, freelancerId, effectiveTaskId) : false;
    const isManagerOrAdmin = isUserAdminOrManager(req.user, project);
    const isClientOwner = isProjectClientOwner(req.user, project);

    if (!isTaskAssigned && !isManagerOrAdmin && !isClientOwner) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to upload task media for this project" });
    }

    const lowerType = fileType.toLowerCase().trim();
    const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
    const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const ALLOWED_DOC_EXTS = ['.pdf'];

    const lastDotIndex = fileName.lastIndexOf('.');
    const ext = (lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '').toLowerCase();

    const isVideo = lowerType.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);
    const isImage = lowerType.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);
    const isPdf = lowerType === 'application/pdf' || ALLOWED_DOC_EXTS.includes(ext);

    if (!isVideo && !isImage && !isPdf) {
        return res.status(400).json({
            message: "Unsupported file format. Only Images (JPG, PNG, WebP, GIF), Videos (MP4, WebM, MOV), and PDFs are allowed."
        });
    }

    let contentType = fileType;
    if (isPdf) {
        contentType = 'application/pdf';
    } else if (isImage) {
        contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : (lowerType.startsWith('image/') ? fileType : `image/${ext.replace('.', '')}`);
    } else if (isVideo) {
        contentType = lowerType.startsWith('video/') ? fileType : `video/${ext.replace('.', '')}`;
    }

    const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const cleanBaseName = baseName
        .replace(/[^\w.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100) || 'file';
    const cleanFileName = `${cleanBaseName}${ext}`;

    // Extract task schema 'id' column value (e.g. 1, 2, 3)
    const taskSchemaId = (targetTask.id !== undefined && targetTask.id !== null)
        ? String(targetTask.id)
        : effectiveTaskId;

    // Form unique filename starting with id column value (e.g. 1-1730193400-Dalapathy.mp4)
    const uniqueFileName = `${taskSchemaId}-${Date.now()}-${cleanFileName}`;

    // Direct files inside project p_id folder in task-temp/
    const s3Key = `task-temp/${p_id}/${uniqueFileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 900
    });

    res.status(200).json({ uploadUrl, s3Key, contentType, taskId: effectiveTaskId });
});

/**
 * @desc Get S3 presigned view/download URL for submitted task media
 * @route GET /api/cproject/:p_id/tasks/:taskId/media-url
 * @access Authenticated project participants (Client Owner / Assigned Freelancer / Manager / Admin)
 */
const getTaskMediaUrl = asyncHandler(async (req, res) => {
    const { p_id, taskId } = req.params;
    let { key, url } = req.query;

    if (!key && !url) {
        return res.status(400).json({ message: "S3 key or URL is required" });
    }

    let s3Key = key;
    if (!s3Key && url) {
        const match = url.match(/((?:[^/]+\/tasks|tasks|tasks-temp|task-temp)\/[^\s?#]+)/);
        if (match) s3Key = match[1];
    }

    if (!s3Key) {
        return res.status(400).json({ message: "Invalid S3 key" });
    }

    if (s3Key.includes('..') || s3Key.includes('\\')) {
        return res.status(400).json({ message: "Invalid key format" });
    }

    const allowedPrefix1 = `tasks/${p_id}/`;
    const allowedPrefix2 = `task-temp/${p_id}/`;
    const allowedPrefix3 = `tasks-temp/${p_id}/`;
    const legacyPrefix = `${p_id}/tasks/`;
    if (!s3Key.startsWith(allowedPrefix1) && !s3Key.startsWith(allowedPrefix2) && !s3Key.startsWith(allowedPrefix3) && !s3Key.startsWith(legacyPrefix)) {
        return res.status(403).json({ message: "Access restricted to this project's task deliverables" });
    }

    const project = await cproject.findOne({ p_id });
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    const targetTask = (project.Tasks || []).find(t => 
        (t._id && t._id.toString() === taskId) ||
        String(t.id) === String(taskId)
    );

    const effectiveTaskId = targetTask ? (targetTask._id?.toString() || (targetTask.id !== undefined ? String(targetTask.id) : taskId)) : taskId;

    const freelancerId = extractFreelancerId(req.user);
    const isTaskAssigned = freelancerId ? await isFreelancerAssignedToProject(project, freelancerId, effectiveTaskId) : false;
    const isManagerOrAdmin = isUserAdminOrManager(req.user, project);
    const isClientOwner = isProjectClientOwner(req.user, project);

    if (!isTaskAssigned && !isManagerOrAdmin && !isClientOwner) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to access task media for this project" });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        res.status(200).json({ url: presignedUrl, key: s3Key });
    } catch (err) {
        console.error('[cprojectController] Error generating presigned task media URL:', err);
        res.status(500).json({ message: "Failed to generate media download URL" });
    }
});

module.exports = { getTaskUploadUrl, getTaskMediaUrl, getMatchedFreelancers, getProjects, availableprojects, assignedfreelancers, getprojectbyid, getprojectbyfid, createProject, reviewProject, assignProject, updateProject, deletecproject, generateId, getprojectbycid, getprojectfile, addTask, getTasks, updateTask, updateTaskStatus, deleteTask, getAllProjects, getAssingedProjects, getOngoingProjects, getAllProjectsAdmin, updateProjectStatus, getapprovedprojects, getFileVersions, getFileVersionUrl, submitFreelancerFeedback };
