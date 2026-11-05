const asyncHandler = require('express-async-handler');
const Manager = require('../models/adminModel');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const { sendEmail } = require("../services/emailservice");
const Cproject = require('../models/cprojectModel');
const { sanitizeForLogging } = require('../Utility/logSanitizer');
const { logUserActivity, getUserActivityStats, getUserDailySummary, getUserActivityTimeline } = require('../Utility/activityLogger');
const SkillModel = require('../models/skillModel');
const UserModel = require('../models/userModel');
const Group = require('../models/groupModel');
const Cregister = require("../models/cregisterModel");
const { generateKansbeEmail } = require("../services/emailTemplate");
const { getManagerWorkloads, getNextAvailableManager } = require("../services/managerAssignmentService");
const { sendNotification } = require('../Utility/notificationUtils');// Get all managers
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../config/s3');
const getManagers = asyncHandler(async (req, res) => {
  const managers = await Manager.find({ role: "manager" }).select("-password");
  res.status(200).json(managers);
});

// Create a new manager
const createManager = asyncHandler(async (req, res) => {
  console.log("Request body received:", sanitizeForLogging(req.body));
  const { usr_name, email, phone, department } = req.body;
  if (!usr_name || !email || !phone || !department) {
    res.status(400);
    throw new Error('Please fill all the required fields');
  }
  const managerExists = await Manager.findOne({ email });
  if (!managerExists) {
    // Auto-generate a secure random password
    const autoPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "@1";
    const hashedPassword = await bcrypt.hash(autoPassword, 10);
    const usr_id = await generateId();
    const manager = await Manager.create({
      usr_id: usr_id,
      usr_name,
      email,
      password: hashedPassword,
      phone,
      role: "manager",
      department,
      createdby: usr_id,
      updatedby: null
    });
    if (manager) {
      // Send login credentials to manager via email
      try {
        const subject = "Your KANSBE Manager Account is Ready";
        const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Manager Account</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .header { background: #ef2f2c; padding: 20px; text-align: center; color: #fff; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
    .content { padding: 30px; text-align: left; line-height: 1.6; }
    .credentials { background: #f8f8f8; border-left: 4px solid #ef2f2c; padding: 15px 20px; border-radius: 6px; margin: 20px 0; }
    .credentials p { margin: 6px 0; font-size: 15px; }
    .footer { text-align: center; font-size: 13px; color: #666; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>
    <div class="content">
      <p>Hi <strong>${usr_name}</strong>,</p>
      <p>Welcome to the KANSBE Manager Portal! Your account has been created by the admin.</p>
      <p>Here are your login credentials:</p>
      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${autoPassword}</p>
        <p><strong>Manager ID:</strong> ${usr_id}</p>
        <p><strong>Department:</strong> ${department}</p>
      </div>
      <p>Please log in and change your password immediately after first login.</p>

<div style="text-align:center;margin:20px 0;">
  <a href="http://kansbe.com/alphalogin" style="display:inline-block;background-color:#ef2f2c;color:#fff;text-decoration:none;padding:10px 20px;border-radius:5px;font-weight:bold;">Login to Kansbe</a>
</div>

<p>With regards,<br/><strong>Team Kansbe</strong></p>
      <p>With regards,<br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer">
      <p>For assistance, reach us at <a href="mailto:kiranc@kansbe.com" style="color:#ef2f2c;">kiranc@kansbe.com</a></p>
      <p>© ${new Date().getFullYear()} KANSBE. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
        await sendEmail(email, subject, message);
      } catch (emailErr) {
        console.error("Email sending failed (non-critical):", emailErr.message);
      }
      res.status(201).json({ message: "Manager created successfully. Login credentials sent to their email.", id: manager.usr_id, email: manager.email });
    } else {
      res.status(400);
      throw new Error('Invalid manager data');
    }
  } else {
    res.status(400).json({ message: "Manager with this email Already Exists" });
  }
});

// Login manager (if needed)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const manager = await Manager.findOne({ email });

  if (!manager) {
    return res.status(400).json({ message: "Invalid email !!!!" });
  }

  const isPasswordMatch = await bcrypt.compare(password, manager.password);

  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Incorrect Password !!!" });
  }

  //ACCESS TOKEN (short-lived)
  const accessToken = jwt.sign(
    {
      admin: {
        usr_id: manager.usr_id,
        email: manager.email,
        role: manager.role
      }
    },
    process.env.ADMIN_ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' } // 🔥 IMPORTANT
  );

  //  REFRESH TOKEN (long-lived)
  const refreshToken = jwt.sign(
    {
      admin: {
        usr_id: manager.usr_id,
        email: manager.email,
        role: manager.role
      }
    },
    process.env.ADMIN_REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  //  SET REFRESH TOKEN COOKIE (THIS IS THE KEY FIX)
  res.cookie('adminRefreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  await logUserActivity(req, 'login', 'admin', manager.usr_id, {
    role: manager.role,
    email: manager.email,
    source: 'admin-panel'
  }, manager.usr_id);

  // ✅SEND ACCESS TOKEN TO FRONTEND
  res.status(200).json({
    message: " login successful",
    accessToken,
    role: manager.role,
    id: manager.usr_id,
    email: manager.email
  });
});

//refresh token function
const adminRefreshToken = asyncHandler(async (req, res) => {
  //  Read refresh token from cookie
  const token = req.cookies.adminRefreshToken;

  if (!token) {
    return res.status(401).json({ message: "No admin refresh token provided" });
  }

  jwt.verify(token, process.env.ADMIN_REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid admin refresh token" });
    }

    // 🔑 Create NEW access token
    const accessToken = jwt.sign(
      {
        admin: {
          usr_id: decoded.admin.usr_id,
          email: decoded.admin.email,
          role: decoded.admin.role
        }
      },
      process.env.ADMIN_ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' } // IMPORTANT
    );

    res.status(200).json({ accessToken });
  });
});



// Send Default Mail to All users in the Database by using sendEmail function
const sendDefaultMail = asyncHandler(async (req, res) => {
  try {
    const users = await Manager.find({});


    for (const user of users) {
      const subject = "A Fresh Start at Sunrise — Wanna Run With Us?";
      const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Community Run Invitation</title>
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
      text-align: left;
      line-height: 1.6;
    }
    .content p {
      margin: 12px 0;
    }
    .button {
      display: inline-block;
      background-color: #ef2f2c;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      transition: background 0.3s ease;
    }
    .button:hover {
      background-color: #d12b29;
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
      <p>Hi ${"there"},</p>

      <p>At Kansbe, we believe freedom begins with the way you feel — not the work you do.</p>
      <p>So we're hosting a small sunrise gathering for our community:</p>

      <h2>“Run for the mind, not just the miles.”</h2>
      <p><strong>Date:</strong> December 13<br/>
      <strong>Time:</strong> 6:30 AM<br/>
      <strong>Location:</strong> Durgam Cheruvu Lake Front Park</p>

      <p>Just 1 km.<br/>
      Just one morning.<br/>
      Just one space to breathe, move, reflect, and connect.</p>

      <p>If you’ve been searching for clarity…<br/>
      If you’ve been wanting to meet people on the same journey…<br/>
      If you want to start your day choosing <strong>you</strong>…</p>

      <p>This morning run is your space.</p>

      <a href="https://luma.com/sij52x7h" class="button">Register Now</a>

      <p><strong>If you're already in, we’ll meet you there!</strong></p>

      <p>With warmth,<br/>
      <strong>Team Kansbe</strong><br/>
      Freedom. Meaning. Possibility.</p>
    </div>

    <div class="footer">
      <p>For any assistance, reach us at
      <a href="mailto:kiranc@kansbe.com" style="color:#ef2f2c; text-decoration:none;">kiranc@kansbe.com</a></p>
      <p>© ${new Date().getFullYear()} KANSBE. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

      await sendEmail(user.email, subject, message);
    }
    res.status(200).json({ message: "Default emails sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending default emails", error: error.message });
  }
});

// Get manager by ID
const getManagerById = asyncHandler(async (req, res) => {
  const manager = await Manager.findOne({ usr_id: req.params.usr_id }).select("-password");
  if (!manager) {
    res.status(404);
    throw new Error('Manager not found');
  }

  // Calculate project statistics for this manager (supports multiple managers per project)
  const projects = await Cproject.find({ Pmanager: req.params.usr_id });

  const stats = {
    ongoing: projects.filter(p => ['in-progress', 'pending', 'accepted', 'waiting-for-approval'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    total: projects.length
  };

  const managerData = manager.toObject();
  delete managerData.password;

  res.status(200).json({
    ...managerData,
    stats
  });
});

// Function to Generate Manager Id
async function generateId() {
  let manager_id;
  let exists;

  do {
    manager_id = `kn${Math.floor(Math.random() * (99999999 - 10000000)) + 10000000}`;
    exists = await Manager.findOne({ usr_id: manager_id });
  } while (exists);

  return manager_id;
}

// Update manager
const updateManager = asyncHandler(async (req, res) => {
  const manager = await Manager.findOne({ usr_id: req.params.usr_id });
  if (!manager) {
    res.status(404);
    throw new Error('Manager not found');
  }
  if (req.body.password) {
    delete req.body.password;
  }
  const updatedManager = await Manager.findOneAndUpdate(
    { usr_id: req.params.usr_id },
    req.body,
    { new: true }
  ).select("-password");
  res.status(200).json(updatedManager);
});
// Delete manager
const deleteManager = asyncHandler(async (req, res) => {
  const managerId = req.params.usr_id;
  const manager = await Manager.findOne({ usr_id: managerId });
  if (!manager) {
    res.status(404);
    throw new Error('Manager not found');
  }

  // Find all projects assigned to this manager that are not completed
  const activeProjects = await Cproject.find({
    Pmanager: managerId,
    status: { $in: ["assigned", "in-progress", "ready-for-completion"] }
  });

  for (const project of activeProjects) {
    let nextManagerIds = [];
    const nextManager = await getNextAvailableManager();
    if (nextManager) {
      nextManagerIds = [nextManager.usr_id];

      // Update project manager
      await Cproject.findByIdAndUpdate(project._id, {
        Pmanager: nextManagerIds
      });

      // Update groups assigned to this project
      await Group.updateMany(
        { p_id: project.p_id },
        { p_manager: nextManagerIds }
      );

      // Notify the new manager
      const managerMsg = `You have been automatically reassigned as manager for project: "${project.title}" (ID: ${project.p_id}) because the previous manager was removed.`;
      await sendNotification(nextManagerIds, "Project Reassignment", managerMsg, req, { p_id: project.p_id });

      // Notify the client
      if (project.client_details && project.client_details.c_id) {
        const clientMsg = `Your project "${project.title}" has been automatically assigned to a new manager: ${nextManager.usr_name} due to staff changes.`;
        await sendNotification([project.client_details.c_id], "Manager Update", clientMsg, req, { p_id: project.p_id });
      }
    } else {
      // If no manager is available, remove the manager from the project (set to empty array)
      await Cproject.findByIdAndUpdate(project._id, {
        Pmanager: []
      });
      await Group.updateMany(
        { p_id: project.p_id },
        { p_manager: [] }
      );
    }
  }

  await Manager.deleteOne({ usr_id: managerId });
  res.status(200).json({ message: 'Manager removed and active projects reassigned' });
});

const adminLogout = asyncHandler(async (req, res) => {
  //  Clear admin refresh token cookie
  res.clearCookie('adminRefreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None'
  });

  res.status(200).json({
    message: "Admin logged out successfully"
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currpassword, updatedpassword } = req.body;
  const adminId = req.params.usr_id;

  const admin = await Manager.findOne({ usr_id: adminId });
  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  const isPasswordMatch = await bcrypt.compare(currpassword, admin.password);
  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Incorrect current password" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(updatedpassword, salt);

  await Manager.findOneAndUpdate(
    { usr_id: adminId },
    { password: hashedPassword }
  );

  res.status(200).json({ message: "Password updated successfully" });
});

// Admin Forgot Password
const getUserActivitySummary = asyncHandler(async (req, res) => {
  const { userId, userType, action, startDate, endDate } = req.query;

  const stats = await getUserActivityStats({
    userId,
    userType,
    action,
    startDate,
    endDate,
  });

  const totalEvents = stats.reduce((sum, item) => sum + item.count, 0);

  res.status(200).json({ totalEvents, stats });
});

const getUserDailyActivitySummary = asyncHandler(async (req, res) => {
  const { userId, userType, action, startDate, endDate } = req.query;

  const summary = await getUserDailySummary({
    userId,
    userType,
    action,
    startDate,
    endDate,
  });

  res.status(200).json({ totalDays: summary.length, summary });
});

const getUserActivityTimelineReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { userType, action, limit, startDate, endDate } = req.query;

  const timeline = await getUserActivityTimeline({
    userId: userId || req.query.userId,
    userType,
    action,
    limit,
    startDate,
    endDate,
  });

  res.status(200).json({ totalItems: timeline.length, timeline });
});

const forgotpassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "@1";

  try {
    const exists = await Manager.findOne({ email });
    if (exists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await Manager.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );

      const subject = 'Admin Password Recovery';
      const message = `
            <p>Your new Admin password has been created successfully. Here are your credentials:</p>
            <p>Your email is: <strong>${email}</strong></p>
            <p>Your new password is: <strong>${password}</strong></p>
            <p>Please Login With Above Credentials</p>
            <a
    href="http://kansbe.com/alphalogin"
    style="
      display:inline-block;
      background-color:#ef2f2c;
      color:#ffffff;
      text-decoration:none;
      padding:12px 28px;
      border-radius:6px;
      font-size:15px;
      font-weight:600;
      margin:0 0 15px 0;
    "
  >
    Login
  </a>
            <p>Regards,<br/>KANSBE Admin Team</p>
            <p><small>This is an automated message, please do not reply.</small></p>
        `;

      await sendEmail(email, subject, message);

      res.status(200).json({ message: 'Password Recovery email sent successfully.' });
    } else {
      res.status(400).json({ message: 'Email Not Found!!' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update manager availability status
const updateManagerStatus = asyncHandler(async (req, res) => {
  const { usr_id } = req.params;
  const { status } = req.body;

  if (!["active", "on-leave", "inactive"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Must be: active, on-leave, or inactive"
    });
  }

  const manager = await Manager.findOneAndUpdate(
    { usr_id, role: "manager" },
    { status },
    { new: true }
  );

  if (!manager) {
    return res.status(404).json({ message: "Manager not found" });
  }

  res.status(200).json({
    message: `Manager ${manager.usr_name} status updated to "${status}"`,
    manager
  });
});

// Get all manager workloads for admin dashboard
const getManagerWorkloadSummary = asyncHandler(async (req, res) => {
  const workloads = await getManagerWorkloads();
  res.status(200).json({
    total: workloads.length,
    available: workloads.filter(w => w.isAvailable).length,
    workloads
  });
});

// -------------------------------------------------------------
// SEND BULK EMAIL
// -------------------------------------------------------------

const sendBulkEmail = asyncHandler(async (req, res) => {
  try {
    const {
      audience,
      verified,
      notVerified,
      selectedFreelancerIds = [],
      selectedClientIds = [],
      subject,
      message,
      buttons = []
    } = req.body;

    if (!audience || !subject || !message) {
      return res.status(400).json({ message: "Audience, subject and message are required" });
    }

    if (!["freelancers", "clients", "both"].includes(audience)) {
      return res.status(400).json({ message: "Invalid audience" });
    }

    if (!verified && !notVerified) {
      return res.status(400).json({ message: "Please select at least one account status" });
    }

    if (!Array.isArray(buttons)) {
      return res.status(400).json({ message: "Buttons must be an array" });
    }

    if (buttons.length > 10) {
      return res.status(400).json({ message: "Maximum 10 buttons are allowed" });
    }

    for (const button of buttons) {
      if (!button.text || !button.url) {
        return res.status(400).json({ message: "Each button must have text and URL" });
      }
    }

    let freelancerVerificationFilter = {};
    let clientVerificationFilter = {};

    if (verified && !notVerified) {
      freelancerVerificationFilter = { isverified: true };
      clientVerificationFilter = { isverfied: true };
    } else if (!verified && notVerified) {
      freelancerVerificationFilter = { isverified: false };
      clientVerificationFilter = { isverfied: false };
    }

    const htmlMessage = generateKansbeEmail(message, buttons);
    let users = [];

    if (audience === "freelancers") {
      if (selectedFreelancerIds.length > 0) {
        users = await UserModel.find({ fl_id: { $in: selectedFreelancerIds }, ...freelancerVerificationFilter }).select("fl_id email fullname isverified");
      } else {
        users = await UserModel.find(freelancerVerificationFilter).select("fl_id email fullname isverified");
      }
    } else if (audience === "clients") {
      if (selectedClientIds.length > 0) {
        users = await Cregister.find({ c_id: { $in: selectedClientIds }, ...clientVerificationFilter }).select("c_id email fullname isverfied");
      } else {
        users = await Cregister.find(clientVerificationFilter).select("c_id email fullname isverfied");
      }
    } else if (audience === "both") {
      let freelancers = [];
      if (selectedFreelancerIds.length > 0) {
        freelancers = await UserModel.find({ fl_id: { $in: selectedFreelancerIds }, ...freelancerVerificationFilter }).select("fl_id email fullname isverified");
      } else {
        freelancers = await UserModel.find(freelancerVerificationFilter).select("fl_id email fullname isverified");
      }
      
      let clients = [];
      if (selectedClientIds.length > 0) {
        clients = await Cregister.find({ c_id: { $in: selectedClientIds }, ...clientVerificationFilter }).select("c_id email fullname isverfied");
      } else {
        clients = await Cregister.find(clientVerificationFilter).select("c_id email fullname isverfied");
      }
      users = [...freelancers, ...clients];
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found for the selected filters" });
    }

    let sentCount = 0;
    for (const user of users) {
      if (user.email) {
        await sendEmail(user.email, subject, htmlMessage);
        sentCount++;
      }
    }

    return res.status(200).json({
      message: `Email sent successfully to ${sentCount} users`,
      count: sentCount,
      audience: audience,
      verified: verified,
      notVerified: notVerified
    });

  } catch (error) {
    console.error("Bulk email error:", error);
    return res.status(500).json({ message: "Error sending bulk emails", error: error.message });
  }
});

// ===============================
// GET ALL FREELANCERS FOR EMAIL
// ===============================

const getEmailFreelancers = asyncHandler(async (req, res) => {
  try {
    const freelancers = await UserModel.find({})
      .select("fl_id fullname email isverified")
      .sort({ fullname: 1 });

    return res.status(200).json({
      count: freelancers.length,
      freelancers
    });
  } catch (error) {
    console.error("Error fetching freelancers:", error);
    return res.status(500).json({ message: "Error fetching freelancers", error: error.message });
  }
});

// ===============================
// GET ALL CLIENTS FOR EMAIL
// ===============================

const getEmailClients = asyncHandler(async (req, res) => {
  try {
    const clients = await Cregister.find({})
      .select("c_id fullname email isverfied")
      .sort({ fullname: 1 });

    return res.status(200).json({
      count: clients.length,
      clients
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: "Error fetching clients", error: error.message });
  }
});

function getMimeTypeFromS3Key(s3Key) {
  if (!s3Key) return 'application/octet-stream';
  const cleanKey = s3Key.split('?')[0];
  const ext = cleanKey.split('.').pop().toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg':
    case 'ogv': return 'video/ogg';
    case 'mov': return 'video/mp4';
    case 'm4v': return 'video/mp4';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

// @desc Get presigned view URL for a portfolio asset from S3 portfolio folder
// @route GET /api/admin/portfolio-file-url
// @access Private (Admin / Manager)
const getPortfolioFileUrl = asyncHandler(async (req, res) => {
  let { key, url } = req.query;
  if (!key && !url) {
    return res.status(400).json({ message: "S3 key or URL is required" });
  }

  let s3Key = key;
  if (!s3Key && url) {
    const match = url.match(/(portfolio(?:-temp)?\/[^\s?#]+)/);
    if (match) s3Key = match[1];
  }

  if (!s3Key) {
    return res.status(400).json({ message: "Invalid S3 key" });
  }

  if (s3Key.includes('..') || s3Key.includes('\\')) {
    return res.status(400).json({ message: "Invalid key format" });
  }

  // Security check: only allow access to portfolio and portfolio-temp objects
  if (!s3Key.startsWith('portfolio/') && !s3Key.startsWith('portfolio-temp/')) {
    return res.status(403).json({ message: "Access restricted to portfolio media files" });
  }

  try {
    const mimeType = getMimeTypeFromS3Key(s3Key);
    const commandParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ResponseContentDisposition: 'inline'
    };
    if (mimeType !== 'application/octet-stream') {
      commandParams.ResponseContentType = mimeType;
    }

    const command = new GetObjectCommand(commandParams);
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 86400 });
    res.status(200).json({ url: presignedUrl, key: s3Key, mimeType, expiresIn: 86400 });
  } catch (error) {
    console.error("Error generating portfolio presigned URL:", error);
    res.status(500).json({ message: "Failed to fetch media from S3 portfolio", error: error.message });
  }
});

module.exports = {
  getManagers,
  createManager,
  login,
  getManagerById,
  updateManager,
  deleteManager,
  sendDefaultMail,
  adminRefreshToken,
  adminLogout,
  changePassword,
  forgotpassword,
  getUserActivitySummary,
  getUserDailyActivitySummary,
  getUserActivityTimelineReport,
  updateManagerStatus,
  getManagerWorkloadSummary,
  sendBulkEmail,
  getEmailFreelancers,
  getEmailClients,
  getPortfolioFileUrl
}