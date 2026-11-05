const axios = require("axios");
const asyncHandler = require("express-async-handler");
const User = require('../models/userModel');
const Cregister = require('../models/cregisterModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const s3 = require("../config/s3.js");
const upload = require("../middleware/upload");
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const notification = require('../models/freelancer_notificationModel');
const { sendEmail } = require("../services/emailservice");
const PDFDocument = require("pdfkit");
const Skill = require('../models/skillModel');
const { calculateFreelancerCompletion } = require('../services/profileService');
const cacheService = require('../services/cacheService');
const FreelancerDuration = require('../models/freelancerDurationModel');
const crypto = require('crypto');
const { verifyGoogleToken } = require("../services/googleAuthService");
const { sanitizeForLogging } = require('../Utility/logSanitizer');
const { logUserActivity } = require('../Utility/activityLogger');
const FBankModel = require('../models/fbankmodel');
const LearningProgress = require('../models/learningProgressModel');
const UserActivity = require('../models/userActivityModel');
const SupportModel = require('../models/supportModel');
const Group = require('../models/groupModel');
const Cproject = require('../models/cprojectModel');
const { syncFreelancerVector } = require('../services/freelancerMatchService');

// ============================================================
// PORTFOLIO S3 CLEANUP HELPERS
// ============================================================
function extractS3KeysFromProject(project) {
  if (!project || typeof project !== 'object') return [];
  const keys = [];

  const addKeyIfValid = (rawKey) => {
    if (!rawKey || typeof rawKey !== 'string') return;
    if (!keys.includes(rawKey)) keys.push(rawKey);
  };

  const addKeyFromUrl = (url) => {
    if (!url || typeof url !== 'string') return;
    try {
      const parsed = new URL(url);
      let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      if (process.env.S3_BUCKET_NAME && pathname.startsWith(process.env.S3_BUCKET_NAME + '/')) {
        pathname = pathname.substring(process.env.S3_BUCKET_NAME.length + 1);
      }
      if (pathname && (pathname.startsWith('portfolio/') || pathname.startsWith('portfolio-temp/'))) {
        addKeyIfValid(pathname);
      }
    } catch (e) {
      const match = url.match(/(portfolio(?:-temp)?\/[^\s?#]+)/);
      if (match) addKeyIfValid(match[1]);
    }
  };

  // 1. Direct project level keys
  if (project.mediaKey) addKeyIfValid(project.mediaKey);
  if (project.tempS3Key) addKeyIfValid(project.tempS3Key);
  if (project.mediaUrl) addKeyFromUrl(project.mediaUrl);

  // 2. Multi-file items in mediaFiles array
  if (Array.isArray(project.mediaFiles)) {
    for (const item of project.mediaFiles) {
      if (!item) continue;
      if (item.mediaKey) addKeyIfValid(item.mediaKey);
      if (item.tempS3Key) addKeyIfValid(item.tempS3Key);
      if (item.mediaUrl) addKeyFromUrl(item.mediaUrl);
    }
  }

  return keys;
}

// Counts total images and videos across a freelancer's external_projects
function countMediaTypes(externalProjects) {
  let images = 0;
  let videos = 0;
  if (!externalProjects || typeof externalProjects !== 'object') return { images, videos };

  for (const proj of Object.values(externalProjects)) {
    if (!proj) continue;
    if (Array.isArray(proj.mediaFiles) && proj.mediaFiles.length > 0) {
      for (const item of proj.mediaFiles) {
        if (!item) continue;
        const type = (item.mediaType || '').toLowerCase();
        if (type.startsWith('image/')) images++;
        else if (type.startsWith('video/')) videos++;
      }
    } else if (proj.mediaType) {
      const type = (proj.mediaType || '').toLowerCase();
      if (type.startsWith('image/')) images++;
      else if (type.startsWith('video/')) videos++;
    }
  }
  return { images, videos };
}

async function deleteS3Objects(keys) {
  if (!keys || !Array.isArray(keys) || keys.length === 0) return;
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    console.warn("S3_BUCKET_NAME not configured; skipping S3 deletion");
    return;
  }
  for (const key of keys) {
    if (!key) continue;
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      }));
      console.log(`Deleted S3 portfolio object: ${key}`);
    } catch (err) {
      console.error(`Failed to delete S3 portfolio object: ${key}`, err.message);
    }
  }
}

// ============================================================
// SEND FREELANCER VERIFICATION OTP
// ============================================================
async function generateAndSendFreelancerOtp(user) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 60 * 1000);

  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.isverified = false;
  await user.save();

  // Enqueue OTP email to background worker
  try {
    const { queueOtpEmail } = require('../queues/emailQueue');
    queueOtpEmail({ userId: user.fl_id, fullname: user.fullname, email: user.email, otp, userType: 'freelancer' }).catch(err => console.error('Queue otp email error', err));
    console.log('Freelancer OTP enqueued for:', sanitizeForLogging({ email: user.email }));
  } catch (err) {
    console.error('Failed to enqueue freelancer OTP email', err);
  }

  return otpExpiresAt;
}

//@desc Register the user
//@route POST /api/user/register
//@access Public
const registerUser = asyncHandler(async (req, res) => {
  const {
    fl_id,
    fullname,
    username,
    email,
    password,
    country,
    contact,
    gender,
    dob,
    nationality,
    languages,
    experience,
    external_projects,
    skillTitle,
    description,
    isStudent,
    agree,
    instagram,
    facebook,
    twitter,
    linkedin,
    portfolio,
    status } = req.body
  const isAgreed = agree === true || agree === 'true';
  let missingfields = [];
  if (!fullname) missingfields.push("Full Name");
  if (!email) missingfields.push("Email");
  if (!password) missingfields.push("Password");
  if (!isAgreed) missingfields.push("Terms and Conditions Agreement");
  if (missingfields.length > 0) {
    if (missingfields.length === 4) {
      return res.status(400).json({
        message: "All fields are Mandatory!!"
      });
    }
    return res.status(400).json({ message: `${missingfields.join(", ")} is Mandatory!! ` });
  }

  const fullNameRegex = /^[a-zA-Z][a-zA-Z ]*$/;
  const lettersOnlyRegex = /^[a-zA-Z\s]*$/;
  if (!fullNameRegex.test(fullname)) {
    return res.status(400).json({ message: "Full name must start with a letter and contain only letters and spaces." });
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9\._]*$/;
  if (username && !usernameRegex.test(username)) {
    return res.status(400).json({ message: "Username must start with a letter and can contain numbers, dots, and underscores." });
  }

  const startWithLetterRegex = /^[a-zA-Z]/;
  if (description && !startWithLetterRegex.test(description)) {
    return res.status(400).json({ message: "Description must start with a letter." });
  }

  // Enforce strong password policy
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number and one special character."
    });
  }

  const userAvailable = await User.findOne({ email });
  if (!userAvailable) {
    //Hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hash generated for new freelancer registration:", Boolean(hashedPassword));
    const fl_Id = await generateId();
    const user = await User.create({
      fl_id: fl_Id,
      fullname,
      username,
      email,
      password: hashedPassword,
      country,
      contact,
      gender,
      dob,
      nationality,
      languages,
      experience,
      external_projects: external_projects || {},
      skillTitle,
      description,
      isStudent,
      agree,
      instagram,
      facebook,
      twitter,
      linkedin,
      portfolio,
      status,
      createdby: fl_Id,
      updatedby: null
    });
      if (user) {
        // Send notification (quick DB write) synchronously
        await sendNotification(user.fl_id, req);

        // Generate OTP synchronously and save hash+expiry so it's available in response
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 60 * 1000);
        user.otpHash = otpHash;
        user.otpExpiresAt = otpExpiresAt;
        user.isverified = false;
        await user.save();

        // Enqueue welcome and otp emails to BullMQ for background delivery
        const { queueWelcomeEmail, queueOtpEmail } = require('../queues/emailQueue');
        queueWelcomeEmail({ userId: user.fl_id, fullname: user.fullname, email: user.email, userType: 'freelancer' }).catch(err => console.error('Queue welcome email error', err));
        queueOtpEmail({ userId: user.fl_id, fullname: user.fullname, email: user.email, otp, userType: 'freelancer' }).catch(err => console.error('Queue otp email error', err));

      // Emit socket event for live freelancer list update in admin dashboard
      const io = req.app.get("io");
      if (io) {
        io.emit("newFreelancerRegistered", {
          fl_id: user.fl_id,
          fullname: user.fullname,
          email: user.email
        });
      }

      return res.status(201).json({
        message: "Registration successful. OTP sent to your email.",
        id: user.fl_id,
        email: user.email,
        otpExpiresAt: otpExpiresAt
      });
    }
    else {
      res.status(400);
      throw new Error('Invalid user data')
    }
  } else {
    if (!userAvailable.isverified) {
      return res.status(400).json({
        message: "Email already exists but is not verified.",
        isverified: false,
        email: email
      });
    }
    return res.status(400).json({ message: "Email already in use" });
  }

  // res.json({message: "Register the user"})
});

// ============================================================
// GOOGLE FREELANCER SIGNUP
// ============================================================
const googleSignup = asyncHandler(async (req, res) => {
  const { idToken, agree } = req.body;

  if (!idToken) {
    return res.status(400).json({
      message: "Google ID token is required"
    });
  }

  try {
    // 1. Verify Google ID token
    const googleUser = await verifyGoogleToken(idToken);

    const {
      fl_id,
      name,
      googleId,
      email,
      email_verified
    } = googleUser;

    // 2. Make sure Google email is verified
    if (!email_verified) {
      return res.status(400).json({
        message: "Google email is not verified"
      });
    }

    // 3. Check whether Google account already exists
    const existingGoogleUser = await User.findOne({ googleId });

    if (existingGoogleUser) {
      return res.status(409).json({
        message: "This Google account is already registered. Please login with Google."
      });
    }

    // 4. Check whether email already exists
    const existingEmailUser = await User.findOne({ email });

    if (existingEmailUser) {
      return res.status(409).json({
        message: "An account with this email already exists. Please login using your existing account."
      });
    }

    // 5. Generate freelancer ID
    const fl_Id = await generateId();

    // 6. Create freelancer
    const user = await User.create({
      fl_id: fl_Id,
      fullname: name || "",
      email: email,
      googleId: googleId,
      username: null,
      password: null,
      country: null,
      contact: null,
      location: null,
      terms: true,
      isverified: true,
      dob: null,
      nationality: null,
      gender: null,
      bio: null,
      linkedin: null,
      twitter: null,
      instagram: null,
      facebook: null,
      companyname: null,
      companytype: null,
      companyregno: null,
      companywebsite: null,
      companyaddress: null,
      city: null,
      state: null,
      pincode: null,
      companydescrptn: null,
      profile: false,
      createdby: fl_Id,
      updatedby: null
    });

    // 7. Send welcome notification
    await sendNotification(user.fl_id, req);

    // 8. Enqueue welcome email to be sent in background
    try {
      const { queueWelcomeEmail } = require('../queues/emailQueue');
      queueWelcomeEmail({ userId: user.fl_id, fullname: user.fullname, email: user.email, userType: 'freelancer' }).catch(err => console.error('Queue welcome email error', err));
    } catch (err) {
      console.error('Failed to enqueue welcome email', err);
    }

    // 9. Generate KANSBE access token
    const accessToken = jwt.sign(
      {
        user: {
          email: user.email,
          fl_id: user.fl_id
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1h"
      }
    );

    // 10. Generate refresh token
    const refreshToken = jwt.sign(
      {
        user: {
          email: user.email,
          fl_id: user.fl_id
        }
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d"
      }
    );

    // 11. Store refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      message: "Google freelancer signup successful",
      id: user.fl_id,
      email: user.email,
      fullname: user.fullname,
      isverified: user.isverified,
      accessToken
    });

  } catch (error) {
    console.error("Google freelancer signup error:", error);
    return res.status(500).json({
      message: "Google signup failed",
      error: error.message
    });
  }
});


// ============================================================
// VERIFY FREELANCER OTP
// ============================================================
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isverified) {
    return res.status(400).json({ message: "User is already verified" });
  }

  // Check if OTP is expired
  if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  // Verify OTP hash
  if (!user.otpHash) {
    return res.status(400).json({ message: "Invalid OTP state. Please request a new OTP." });
  }

  const isMatch = await bcrypt.compare(otp, user.otpHash);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // OTP is valid. Update user.
  user.isverified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const accessToken = jwt.sign(
    {
      user: {
        email: user.email,
        fl_id: user.fl_id,
      }
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { user: { email: user.email, fl_id: user.fl_id } },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.status(200).json({
    message: "Email verified successfully",
    isverified: true,
    accessToken
  });
});
async function sendWelcomeEmail(fullname, email) {
   ;

  const time = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const subject = "Greetings";
  const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Welcome</title>
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
      <p>Hi ${fullname || "Freelancer"},</p>

      <p class="highlight">
        Kansbe welcomes you!
      </p>

      <p>
        Wishing you great beginnings and success ahead.
      </p>

      <div class="box">
        <p style="margin-top:0;">
          <strong>Your journey starts here</strong>
        </p>

        <p>
          Discover opportunities,
        </p>

        <p>
          Build meaningful work,
        </p>

        <p style="margin-bottom:0;">
          And grow at your own pace.
        </p>
      </div>

      <p>
        You joined at ${time}, and this is just the beginning.
      </p>

      <p>
        We’re here to support you at every step as you build your freelance journey.
      </p>

      <p style="margin-top: 24px;">
        With you in every step,<br/><br/>
        <strong>Team Kansbe</strong>
      </p>
    </div>

    <div class="footer">
      <p>
        Need help? Contact us at
        <a href="mailto:support@kansbe.com" style="color:#ef2f2c; text-decoration:none;">
          support@kansbe.com
        </a>
      </p>
      <p>
        © ${new Date().getFullYear()} KANSBE · Freedom · Meaning · Possibility
      </p>
    </div>
  </div>
</body>
</html>
`;
  await sendEmail(email, subject, message);
}
// Function to create welcome Notification on registration
async function sendNotification(usrid, req) {
  try {
    console.log("Sending welcome notification to:", usrid);
    const welcomeTitle = "Greetings";
    const welcomeMessage = "Kansbe Welcomes You! Wishing you Great Beginnings and success ahead.";

    const time = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Fix: use correct field name usr_id in query
    let user = await notification.findOne({ usr_id: usrid });
    let newNotification;

    if (!user) {
      user = await notification.create({
        usr_id: usrid,
        messages: [{
          id: 0,
          title: welcomeTitle,
          message: welcomeMessage,
          isread: false,
          createdby: usrid,
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
        title: welcomeTitle,
        message: welcomeMessage,
        isread: false,
        createdby: usrid,
        time: time
      };

      user.messages.push(msgObj);
      await user.save();
      newNotification = msgObj;
    }

    // Emit real-time socket notification if user is online and req is available
    if (req && global.onlineUsers?.[usrid]) {
      const io = req.app.get("io");
      if (io) {
        io.to(global.onlineUsers[usrid]).emit("newNotification", newNotification);
      }
    }

    return newNotification;
  } catch (error) {
    console.error("sendNotification error:", error.message);
    return error.message;
  }
}
//@desc login the user
//@route POST /api/user/login
//@access Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('All fields are mandatory');
  }

  // Strict type checking to prevent NoSQL Injection
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Invalid input type. Strings are required' });
  }

  // Strict email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const sanitizedEmail = email.trim();

  const user = await User.findOne({ email: sanitizedEmail });
  const isverified = user ? (user.isverified !== false) : false;

  // Check if this is a Google-created account
  if (user && (user.password === null || !user.password)) {
    return res.status(400).json({
      message: "This email is registered with Google. Please login with Google instead."
    });
  }

  if (!user) {
    // Check if the user exists in the Client (Cregister) model
    const client = await Cregister.findOne({ email: sanitizedEmail });
    if (client) {
      return res.status(401).json({ message: "User Not Found (This email is registered as a Client)" });
    }
    return res.status(401).json({ message: 'Email not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  console.log("Password verification result:", Boolean(isMatch));
  if (!isMatch) {
    return res.status(400).json({ message: 'Wrong password, please try again' });
  }

  if (isMatch && isverified) {
    const accessToken = jwt.sign(
      {
        user: {
          email: user.email,
          fl_id: user.fl_id,
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { user: { email: user.email, fl_id: user.fl_id } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // ----- RECORD LOGIN DURATION IMMEDIATELY -----
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      let durationDoc = await FreelancerDuration.findOne({ usr_id: user.fl_id });

      if (!durationDoc) {
        durationDoc = new FreelancerDuration({
          usr_id: user.fl_id,
          dailyRecords: [{
            date: todayDate,
            loginAt: new Date(),
            lastActivityAt: new Date(),
            modules: {}
          }]
        });
      } else {
        let todayRecord = durationDoc.dailyRecords.find(record => record.date === todayDate);
        if (todayRecord) {
          // Only set loginAt if it's the first login of the day, or always update?
          // Usually we might want to preserve the very first login time, but updating it is fine too. Let's just update lastActivityAt.
          if (!todayRecord.loginAt) todayRecord.loginAt = new Date();
          todayRecord.lastActivityAt = new Date();
        } else {
          durationDoc.dailyRecords.push({
            date: todayDate,
            loginAt: new Date(),
            lastActivityAt: new Date(),
            modules: {}
          });
        }
      }
      await durationDoc.save();
    } catch (error) {
      console.error("Failed to record login duration:", error);
    }
    // ---------------------------------------------

    await logUserActivity(req, 'login', 'auth', user.fl_id, {
      source: 'freelancer-login',
      email: user.email
    }, user.fl_id);

    return res.status(200).json({ accessToken });
  }
  else if (isMatch && !isverified) {
    return res.status(403).json({
      message: 'Email is not verified.',
      requiresEmailVerification: true,
      email: user.email
    });
  }
  else {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

// ============================================================
// GOOGLE FREELANCER LOGIN
// ============================================================
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      message: "Google ID token is required"
    });
  }

  try {
    // 1. Verify Google ID token
    const googleUser = await verifyGoogleToken(idToken);

    const {
      googleId,
      email_verified
    } = googleUser;

    // 2. Make sure Google email is verified
    if (!email_verified) {
      return res.status(400).json({
        message: "Google email is not verified"
      });
    }

    // 3. Find freelancer using Google ID
    const user = await User.findOne({ googleId });

    // 4. Google account has not signed up with KANSBE
    if (!user) {
      return res.status(404).json({
        message: "No KANSBE freelancer account is associated with this Google account. Please sign up first."
      });
    }

    // 5. Check KANSBE verification
    if (!user.isverified) {
      return res.status(403).json({
        message: "Your KANSBE freelancer account is not verified."
      });
    }

    // 6. Generate KANSBE access token
    const accessToken = jwt.sign(
      {
        user: {
          email: user.email,
          fl_id: user.fl_id
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1h"
      }
    );

    // 7. Generate refresh token
    const refreshToken = jwt.sign(
      {
        user: {
          email: user.email,
          fl_id: user.fl_id
        }
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d"
      }
    );

    // 8. Store refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 9. Record login duration
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      let durationDoc = await FreelancerDuration.findOne({
        usr_id: user.fl_id
      });

      if (!durationDoc) {
        durationDoc = new FreelancerDuration({
          usr_id: user.fl_id,
          dailyRecords: [{
            date: todayDate,
            loginAt: new Date(),
            lastActivityAt: new Date(),
            modules: {}
          }]
        });
      } else {
        let todayRecord = durationDoc.dailyRecords.find(
          record => record.date === todayDate
        );

        if (todayRecord) {
          if (!todayRecord.loginAt) {
            todayRecord.loginAt = new Date();
          }
          todayRecord.lastActivityAt = new Date();
        } else {
          durationDoc.dailyRecords.push({
            date: todayDate,
            loginAt: new Date(),
            lastActivityAt: new Date(),
            modules: {}
          });
        }
      }

      await durationDoc.save();
    } catch (error) {
      console.error("Failed to record Google login duration:", error);
    }

    return res.status(200).json({
      message: "Google freelancer login successful",
      id: user.fl_id,
      email: user.email,
      fullname: user.fullname,
      isverified: user.isverified,
      accessToken
    });

  } catch (error) {
    console.error("Google freelancer login error:", error);
    return res.status(500).json({
      message: "Google login failed",
      error: error.message
    });
  }
});

//@desc Refresh Access Token
//@route POST /api/user/refresh-token
//@access Public - because access token has expired
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    const accessToken = jwt.sign(
      {
        user: { email: decoded.user.email, fl_id: decoded.user.fl_id }
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ accessToken });
  });
});

//@desc Logout User
//@route POST /api/user/logout
//@access Public
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/"

  });
  res.status(200).json({ message: "Logged out successfully" });
});

//@desc current user info
//@route POST /api/user/current
//@access Private
const currentUser = asyncHandler(async (req, res) => {
  res.json(req.user)
});

// Send Default Mail to All users in the Database by using sendEmail function
const sendDefaultMail = asyncHandler(async (req, res) => {
  try {
    // const ids = ["fl74538959"];
    const users = await User.find({});


    for (const user of users) {
      const subject = "Kansbe | Sweet, bitter, sour just like your journey";
      const message = `

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Ugadi Wishes</title>
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
      <p>Hi ${user.fullname || "Freelancer"},</p>

      <p>
        You know what Ugadi reminds us?
      </p>

      <p class="highlight">
        Life isn’t just sweet. It’s a mix of everything sweet, bitter, sour, and more.
      </p>

      <p>
        Just like your journey as a freelancer.
      </p>

      <div class="box">
        <p style="margin-top:0;">
          <strong>Every step you take matters</strong>
        </p>

        <p>
          Every project you take on,
        </p>

        <p>
          Every challenge you overcome,
        </p>

        <p style="margin-bottom:0;">
          Every small win you celebrate it’s all part of something meaningful.
        </p>
      </div>

      <p>
        This Ugadi, we wish you the strength to embrace every phase and
        keep building a life you truly want.
      </p>

      <p>
        We’re building stronger every day and as we grow,
        so will the opportunities for you.
      </p>

      <p style="margin-top: 24px;">
        With you in every step,<br/><br/>
        <strong>Team Kansbe</strong>
      </p>
    </div>

    <div class="footer">
      <p>
        Need help? Contact us at
        <a href="mailto:support@kansbe.com" style="color:#ef2f2c; text-decoration:none;">
          support@kansbe.com
        </a>
      </p>
      <p>
        © ${new Date().getFullYear()} KANSBE · Freedom · Meaning · Possibility
      </p>
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

// Get User details

const getdetails = asyncHandler(async (req, res) => {
  const userdetails = await User.find({ status: "Active" }).select("-password");
  res.status(200).json(userdetails);
});

// Get By Id

const getbyid = asyncHandler(async (req, res) => {
  const userdata = await User.findOne({ fl_id: req.params.fl_id }).select("-password");
  res.status(200).json(userdata);
});

// Generate Emp Id

async function generateId() {
  let fl_Id;
  let exists;

  do {
    fl_Id = `fl${Math.floor(Math.random() * (99999999 - 10000000)) + 10000000}`;
    exists = await User.findOne({ fl_id: fl_Id });
  } while (exists);

  return fl_Id;
}


//resume upload to s3 and save the file data in user collection
const saveResume = asyncHandler(async (req, res) => {
  const { fl_id, resumeData } = req.body;

  try {
    // 🔹 Validation
    if (!fl_id || !resumeData) {
      return res.status(400).json({ message: "Missing required data" });
    }

    if (!resumeData.title || !resumeData.summary) {
      return res.status(400).json({ message: "Incomplete resume data" });
    }

    // 🔹 Create PDF
    const doc = new PDFDocument({ margin: 40 });

    // 🔥 GENERATE PDF BUFFER
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("error", (err) => reject(err));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(18).text(resumeData.title, { align: "center" });
      doc.moveDown();

      // Summary
      doc.fontSize(12).text("Profile Summary:", { underline: true });
      doc.text(resumeData.summary);
      doc.moveDown();

      // Skills
      if (resumeData.skills?.length) {
        doc.text("Skills:", { underline: true });
        resumeData.skills.forEach((skill) => doc.text(`• ${skill}`));
        doc.moveDown();
      }

      // Experience
      if (resumeData.experience?.length) {
        doc.text("Experience:", { underline: true });
        resumeData.experience.forEach((exp) => {
          doc.text(`${exp.degree || ""} - ${exp.company || ""}`);
          doc.text(`${exp.startDate || ""} to ${exp.endDate || "Present"}`);
          if (exp.description) doc.text(exp.description);
          doc.moveDown();
        });
      }

      // Education
      if (resumeData.education?.length) {
        doc.text("Education:", { underline: true });
        resumeData.education.forEach((edu) => {
          doc.text(`${edu.degree} - ${edu.institution}`);
          doc.text(`${edu.startDate} to ${edu.endDate}`);
          doc.moveDown();
        });
      }

      // Projects
      if (resumeData.projects?.length) {
        doc.text("Projects:", { underline: true });
        resumeData.projects.forEach((proj) => {
          doc.text(proj.title);
          if (proj.description) doc.text(proj.description);
          doc.moveDown();
        });
      }

      // Certifications
      if (resumeData.certificates?.length) {
        doc.text("Certifications:", { underline: true });
        resumeData.certificates.forEach((cert) => {
          doc.text(`${cert.title} (${cert.year})`);
          doc.text(cert.issuer);
          if (cert.description) doc.text(cert.description);
          doc.moveDown();
        });
      }

      doc.end();
    });

    const fileName = `resume/${Date.now()}_${fl_id}.pdf`;

    // 🔹 Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

    // 🔹 Save to DB
    const updatedUser = await User.findOneAndUpdate(
      { fl_id },
      {
        resume_data: {
          key: fileName,
          url: fileUrl,
          contentType: "application/pdf",
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Resume generated and saved successfully",
      data: updatedUser,
    });

  } catch (error) {
    console.error("Resume error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


//get Resume
// userController.js
const getResume = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  const user = await User.findOne({ fl_id });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    resume_data: user.resume_data
  });
});

// Update Data

const updatedata = asyncHandler(async (req, res) => {
  const {
    fullname,
    username,
    email,
    contact,
    gender,
    dob,
    nationality,
    languages,
    experience,
    external_projects,
    skillTitle,
    description,
    isStudent,
    linkedin,
    facebook,
    instagram,
    twitter,
    portfolio,
    profile_pic
  } = req.body;

  const userdata = await User.findOne({ fl_id: req.params.fl_id });
  if (!userdata) {
    return res.status(400).json({ errors: { general: "User ID not found!" } });
  }

  // Support direct avatar update without enforcing full-profile mandatory field validation
  const bodyKeys = Object.keys(req.body).filter(k => k !== 'updatedby');
  const isAvatarOnly = bodyKeys.length > 0 && bodyKeys.every(k => k === 'profile_pic' || k === 'p_pic');
  if (isAvatarOnly) {
    const newPic = req.body.profile_pic || req.body.p_pic || '';
    const updateddata = await User.findOneAndUpdate(
      { fl_id: req.params.fl_id },
      { $set: { profile_pic: newPic } },
      { new: true }
    );
    try {
      const skillDocs = await Skill.find({ fl_id: req.params.fl_id }).lean();
      const completion = calculateFreelancerCompletion(updateddata, skillDocs);
      await User.updateOne(
        { fl_id: req.params.fl_id },
        { $set: { profile_completion: completion.percentage } }
      );
      cacheService.invalidateUser(req.params.fl_id);
    } catch (err) {
      console.error('Profile completion recalc error on avatar update:', err.message);
    }
    return res.status(200).json(updateddata);
  }

  const errors = {};

  // Mandatory fields
  if (!fullname) errors.fullname = "Full name is required";
  if (!email) errors.email = "Email is required";
  if (!contact) errors.contact = "Contact number is required";
  if (!nationality) errors.nationality = "Nationality is required";
  if (!languages || !Array.isArray(languages) || languages.length === 0) errors.languages = "At least one language is required";
  if (experience === undefined || experience === null) errors.experience = "Experience is required";

  // Full name validation
  const fullNameRegex = /^[a-zA-Z][a-zA-Z\s]*$/;

  if (fullname) {
    if (!fullNameRegex.test(fullname)) {
      errors.fullname = "Full name must start with a letter and contain only letters and spaces";
    } else if (fullname.length < 3 || fullname.length > 30) {
      errors.fullname = "Full name must be between 3 and 30 characters long";
    }
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9\._]*$/;
  if (username) {
    if (!usernameRegex.test(username)) {
      errors.username = "Username must start with a letter and can contain numbers, dots, and underscores";
    } else if (username.length < 3 || username.length > 30) {
      errors.username = "Username must be between 3 and 30 characters long";
    }
  }

  const startWithLetterRegex = /^[a-zA-Z]/;
  const lettersOnlyRegex = /^[a-zA-Z\s]*$/;
  if (description && !startWithLetterRegex.test(description)) {
    errors.description = "Description must start with a letter";
  }

  if (nationality && !lettersOnlyRegex.test(nationality)) {
    errors.nationality = "Nationality must contain letters only";
  }

  // Email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
  if (email && !emailRegex.test(email)) {
    errors.email = "Email must be valid and end with .com";
  }

  // Contact validation
  const contactRegex = /^[0-9]{1,10}$/;
  if (contact && !contactRegex.test(contact)) {
    errors.contact = "Contact number must be numeric and max 10 digits";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  // --- VALIDATE MEDIA QUOTA (MAX 5 IMAGES, MAX 3 VIDEOS) ---
  if (req.body.external_projects) {
    const { images, videos } = countMediaTypes(req.body.external_projects);
    if (images > 5 || videos > 3) {
      return res.status(400).json({
        errors: {
          external_projects: `Portfolio quota exceeded. You can store at most 5 images (found ${images}) and 3 videos (found ${videos}).`
        }
      });
    }
  }

  // --- CLEAN UP REMOVED S3 PORTFOLIO MEDIA ---
  if (req.body.external_projects !== undefined && userdata.external_projects) {
    const oldProjects = userdata.external_projects || {};
    const newProjects = req.body.external_projects || {};
    const s3KeysToDelete = [];

    for (const [projKey, oldProj] of Object.entries(oldProjects)) {
      const newProj = newProjects[projKey];
      if (!newProj) {
        // Project completely removed
        const keys = extractS3KeysFromProject(oldProj);
        keys.forEach(k => {
          if (!s3KeysToDelete.includes(k)) {
            s3KeysToDelete.push(k);
          }
        });
      } else {
        // Project kept, check if any media files or URLs were removed
        const oldKeys = extractS3KeysFromProject(oldProj);
        const newKeys = extractS3KeysFromProject(newProj);
        oldKeys.forEach(k => {
          if (!newKeys.includes(k) && !s3KeysToDelete.includes(k)) {
            s3KeysToDelete.push(k);
          }
        });
      }
    }

    if (s3KeysToDelete.length > 0) {
      deleteS3Objects(s3KeysToDelete).catch(err => {
        console.error("Non-blocking error deleting removed S3 portfolio objects:", err.message);
      });
    }
  }

  const updateddata = await User.findOneAndUpdate(
    { fl_id: req.params.fl_id },
    req.body,
    { new: true }
  );

  // --- TRIGGER WORKER FOR NEW FILES ---
  if (req.body.external_projects) {
      try {
          const { portfolioWorkerQueue } = require('../queues/portfolioQueue');
          Object.keys(req.body.external_projects).forEach(projectId => {
              const project = req.body.external_projects[projectId];
              if (!project) return;

              // Support multi-file array
              if (Array.isArray(project.mediaFiles)) {
                  project.mediaFiles.forEach((item, idx) => {
                      if (item && item.tempS3Key && item.mediaStatus === 'processing') {
                          portfolioWorkerQueue.add('compress-portfolio', {
                              userId: req.params.fl_id,
                              projectId: projectId,
                              tempS3Key: item.tempS3Key,
                              fileType: item.mediaType,
                              fileIndex: idx
                          });
                          console.log(`Enqueued multi-file portfolio media for processing: ${projectId} [${idx}]`);
                      }
                  });
              } else if (project.tempS3Key && project.mediaStatus === 'processing') {
                  // Legacy single file support
                  portfolioWorkerQueue.add('compress-portfolio', {
                      userId: req.params.fl_id,
                      projectId: projectId,
                      tempS3Key: project.tempS3Key,
                      fileType: project.mediaType
                  });
                  console.log(`Enqueued portfolio media for processing: ${projectId}`);
              }
          });
      } catch (err) {
          console.error("Failed to enqueue portfolio processing", err);
      }
  }

  // Recalculate and persist profile completion
  try {
    const skillDocs = await Skill.find({ fl_id: req.params.fl_id }).lean();
    const completion = calculateFreelancerCompletion(updateddata, skillDocs);
    await User.updateOne(
      { fl_id: req.params.fl_id },
      { $set: { profile_completion: completion.percentage } }
    );
    cacheService.invalidateUser(req.params.fl_id);
  } catch (err) {
    console.error('Profile completion recalc error:', err.message);
  }
  // Sync search vector asynchronously
  syncFreelancerVector(req.params.fl_id).catch(err => {
    console.error('Vector sync error on profile update:', err.message);
  });

  res.status(200).json(updateddata);
});


const updateVerifiedEmail = asyncHandler(async (req, res) => {
  try {
    const token = req.query.token; //Get token from url
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    // verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const email = decoded.email;
    if (!email) {
      res.status(404);
      throw new Error("User not found");
    }
    const user = await User.findOneAndUpdate(
      { email: email },
      { isverified: true },
      { new: true }
    );
    // Redirect to login
    await res.redirect('https://kansbe.com/freelancerlogin');
  } catch (err) {

  }

});


// Delete Data

const deletedata = asyncHandler(async (req, res) => {
  const fl_id = req.params.fl_id;
  const userdata = await User.findOne({ fl_id });
  if (!userdata) {
    return res.status(404).json({ message: "Freelancer not found!" });
  }

  // Delete main user account
  const deleteddata = await User.findOneAndDelete({ fl_id });

  // Clean up any remaining S3 portfolio media files
  if (userdata.external_projects) {
    const s3KeysToDelete = [];
    for (const proj of Object.values(userdata.external_projects)) {
      const keys = extractS3KeysFromProject(proj);
      keys.forEach(k => {
        if (!s3KeysToDelete.includes(k)) s3KeysToDelete.push(k);
      });
    }
    if (s3KeysToDelete.length > 0) {
      deleteS3Objects(s3KeysToDelete).catch(err => {
        console.error("Non-blocking error deleting S3 portfolio objects on account delete:", err.message);
      });
    }
  }

  // 1-to-1 Array Documents
  await Skill.findOneAndDelete({ fl_id }).catch(() => {});
  await notification.findOneAndDelete({ usr_id: fl_id }).catch(() => {});
  await FBankModel.findOneAndDelete({ fl_id }).catch(() => {});
  await FreelancerDuration.findOneAndDelete({ fl_id }).catch(() => {});
  await LearningProgress.deleteMany({ fl_id }).catch(() => {});

  // 1-to-Many Multi-Row Documents
  await UserActivity.deleteMany({ userId: fl_id }).catch(() => {});
  await SupportModel.deleteMany({ usr_id: fl_id }).catch(() => {});

  // Remove from Group members if present
  await Group.updateMany(
    { "members.fl_id": fl_id },
    { $pull: { members: { fl_id: fl_id } } }
  ).catch(() => {});

  res.status(200).json({ message: "Freelancer and all associated records deleted successfully", data: deleteddata });
});

// const sendmail = asyncHandler(async (req, res) => {
//     try {
//         const email = req.params.email;

//         // Find user by email
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(404).json({ message: "User not found." });
//         }

//         // If already verified, don't send again
//         // if (user.isverified) {
//         //     return res.status(400).json({ message: "User is already verified." });
//         // }

//         // Generate token valid for 1 hour
//         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECERT, { expiresIn: "1h" });

//         // Generate activation link (better if JWT token with expiry)
//         const activationLink = http://localhost:5001/api/users/update?token=${token};

//         const subject = "Your Account Activation Required";
//         const message = `
//             <p>Please click the button below to activate your account:</p>
//             <a href="${activationLink}" style="color: #fff; background-color: #06e773; padding: 10px 15px; border-radius: 5px; text-decoration: none;">Activate Account</a>
//             <p>If you did not request this, please ignore this email.</p>
//             <p>Regards,<br/>Admin Team</p>
//             <p><small>This is an automated message, please do not reply.</small></p>
//         `;

//         // Send mail
//         await sendEmail(email, subject, message);

//         res.status(200).json({ message: "Verification email sent successfully." });
//     } catch (err) {
//         console.error("Email failed:", err.message);
//         res.status(500).json({ message: err.message });
//     }
// });


// Function to create a random password

function createRandomPassword() {
  const length = 12;
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numberChars = "0123456789";
  const specialChars = "!@#$%^&*()";
  const allChars = lowercaseChars + uppercaseChars + numberChars + specialChars;

  let password = "";

  // 1️⃣ Add at least one of each required character type
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];

  // 2️⃣ Fill remaining characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // 3️⃣ Shuffle password so it is not predictable
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
}


// Send Mail For Password Recovery

// Send Password
const forgotpassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const password = createRandomPassword(); // returns string now
  try {
    const exists = await User.findOne({ email });
    if (exists) {
      if (exists.password === null || !exists.password) {
        return res.status(400).json({
          message: "This email is registered with Google. Please login with Google instead."
        });
      }

      if (!exists.isverified) {
        return res.status(400).json({ message: "Please verify your email first." });
      }

      // hashing the random password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const updatedregister = await User.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );

      const subject = 'Email and Password Recovery';
      const message = `
            <p>Your Password has been created successfully. Here are your credentials:</p>
            <p>Your email is: <strong>${email}</strong></p>
            <p>Your new password is: <strong>${password}</strong></p>
            <p>Please Login With Above Credentials</p>
             <a
    href="https://kansbe.com/freelancerlogin"
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
    Click to Login
  </a>
            <p>Regards,<br/>Admin Team</p>
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

// Resend Verification Email
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isverified) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    await generateAndSendFreelancerOtp(user);
    res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change Password
const updatepassword = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;
  const { currpassword, updatedpassword } = req.body;

  try {
    // Find user by fl_id
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.password === null || !user.password) {
      return res.status(400).json({
        message: "This email is registered with Google. Cannot change the password"
      });
    }
    // Prevent reuse of same password
    if (currpassword === updatedpassword) {
      return res.status(400).json({ message: "New password cannot be same as current password" });
    }
    // Compare current password with stored hashed password
    const isMatch = await bcrypt.compare(currpassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Your current password doesn't match your existing one" });
    }
    // Hash new password
    const hashedPassword = await bcrypt.hash(updatedpassword, 10);
    // Update password in database
    await User.findOneAndUpdate({ fl_id }, { password: hashedPassword }, { new: true });

    // Send notification email

   const subject = "Security Alert: Password Changed ";
const message = `
<div style="font-family:Arial,sans-serif;padding:20px;">
<h2>Password Changed Successfully</h2>
<p>Dear ${user.fullname},</p>
<p>Your Kansbe account password has been successfully changed.</p>
<p>You can now log in to your Kansbe account using your new password.</p>
<a href="https://kansbe.com/freelancerlogin" style="display:inline-block;background-color:#ef2f2c;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;">Login to Kansbe</a>
<p>If you did not perform this action, please contact our support team immediately at <a href="mailto:support@kansbe.com">support@kansbe.com</a>.</p>
<p>Best regards,<br>Team Kansbe</p>
</div>
`;
    await sendEmail(user.email, subject, message);

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ==========================================
// CERTIFICATE MANAGEMENT (S3 + MongoDB)
// ==========================================

// Upload Certificate to S3 and save metadata
const uploadCertificate = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;
  const { title, issuer, date, link } = req.body;

  try {
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const certData = {
      title: title || '',
      issuer: issuer || '',
      date: date || '',
      link: link || '',
      fileName: '',
      s3Key: '',
      fileUrl: '',
      contentType: ''
    };

    // If a file was uploaded via multer-s3, it will be in req.file
    if (req.file) {
      certData.fileName = req.file.originalname;
      certData.s3Key = req.file.key;
      certData.fileUrl = req.file.location;
      certData.contentType = req.file.contentType || req.file.mimetype;
    }

    // Fallback title
    if (!certData.title) {
      certData.title = certData.fileName || 'Untitled Certificate';
    }

    // Push to certifications array
    user.certifications.push(certData);
    await user.save();

    res.status(200).json({
      message: "Certificate uploaded successfully",
      certificate: user.certifications[user.certifications.length - 1],
      certifications: user.certifications
    });

  } catch (error) {
    console.error("Certificate upload error:", error);
    res.status(500).json({ message: "Error uploading certificate", error: error.message });
  }
});

// View Certificate — generate a presigned URL for secure access
const viewCertificate = asyncHandler(async (req, res) => {
  const { fl_id, index } = req.params;

  try {
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const certIndex = parseInt(index);
    if (!user.certifications || certIndex < 0 || certIndex >= user.certifications.length) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    const cert = user.certifications[certIndex];

    // If there's an external link but no file, return the link
    if (!cert.s3Key && cert.link) {
      return res.status(200).json({ url: cert.link, type: 'external' });
    }

    if (!cert.s3Key) {
      return res.status(404).json({ message: "No file attached to this certificate" });
    }

    // Generate presigned URL valid for 15 minutes
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: cert.s3Key,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    res.status(200).json({
      url: presignedUrl,
      type: 's3',
      contentType: cert.contentType,
      fileName: cert.fileName
    });

  } catch (error) {
    console.error("View certificate error:", error);
    res.status(500).json({ message: "Error generating view URL", error: error.message });
  }
});

// Delete Certificate — remove from S3 and MongoDB
const deleteCertificate = asyncHandler(async (req, res) => {
  const { fl_id, index } = req.params;

  try {
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const certIndex = parseInt(index);
    if (!user.certifications || certIndex < 0 || certIndex >= user.certifications.length) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    const cert = user.certifications[certIndex];

    // Delete from S3 if file exists
    if (cert.s3Key) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: cert.s3Key
        }));
        console.log(`Deleted S3 object: ${cert.s3Key}`);
      } catch (s3Err) {
        console.error("S3 delete error (continuing):", s3Err.message);
      }
    }

    // Remove from array
    user.certifications.splice(certIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Certificate deleted successfully",
      certifications: user.certifications
    });

  } catch (error) {
    console.error("Delete certificate error:", error);
    res.status(500).json({ message: "Error deleting certificate", error: error.message });
  }
});


// ==========================================
// RESUME MANAGEMENT (S3 + MongoDB)
// ==========================================

// Upload Resume to S3 and save metadata
const uploadResume = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  try {
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Delete old resume from S3 if it exists
    if (user.resume_data && user.resume_data.key) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: user.resume_data.key
        }));
      } catch (s3Err) {
        console.error("Old resume delete error (continuing):", s3Err.message);
      }
    }

    // Update resume_data with S3 details
    user.resume_data = {
      key: req.file.key,
      url: req.file.location,
      contentType: req.file.contentType || req.file.mimetype || 'application/pdf',
    };

    // Explicitly check for location if it's missing (rare with multer-s3)
    if (!user.resume_data.url) {
      console.warn("req.file.location is missing, using fallback URL construction");
      user.resume_data.url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;
    }

    await user.save();
    console.log("Resume uploaded successfully for freelancer profile update.");
    syncFreelancerVector(req.params.fl_id).catch(err => {
      console.error('Vector sync error on resume upload:', err.message);
    });

    res.status(200).json({
      message: "Resume uploaded successfully",
      resume_data: user.resume_data
    });

  } catch (error) {
    console.error("Resume upload error detail:", error);
    res.status(500).json({
      message: "Error uploading resume",
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Delete Resume from S3 and MongoDB
const deleteResume = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  try {
    const user = await User.findOne({ fl_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.resume_data || !user.resume_data.key) {
      return res.status(404).json({ message: "No resume found to delete" });
    }

    // Delete from S3
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: user.resume_data.key
      }));
    } catch (s3Err) {
      console.error("S3 resume delete error:", s3Err.message);
    }

    // Remove from DB
    user.resume_data = null;
    await user.save();

    syncFreelancerVector(req.params.fl_id).catch(err => {
      console.error('Vector sync error on resume delete:', err.message);
    });

    res.status(200).json({ message: "Resume deleted successfully" });

  } catch (error) {
    console.error("Delete resume error:", error);
    res.status(500).json({ message: "Error deleting resume", error: error.message });
  }
});


// ==========================================
// PORTFOLIO S3 UPLOAD URL
// ==========================================
const getPortfolioUploadUrl = asyncHandler(async (req, res) => {
    const { fileName, fileType } = req.query;
    if (!fileName) {
        return res.status(400).json({ message: "FileName is required" });
    }
    const userId = req.user?.fl_id;
    if (!userId) {
        return res.status(403).json({ message: "Forbidden: Only freelancers can upload portfolio media" });
    }

    const lastDotIndex = fileName.lastIndexOf('.');
    const ext = (lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '').toLowerCase();

    // Auto-detect MIME type from extension if fileType was empty/undefined
    let detectedType = (fileType || '').toLowerCase().trim();
    if (!detectedType || detectedType === 'undefined' || detectedType === 'null' || detectedType === 'application/octet-stream') {
        if (['.mp4', '.m4v'].includes(ext)) detectedType = 'video/mp4';
        else if (ext === '.webm') detectedType = 'video/webm';
        else if (ext === '.mov') detectedType = 'video/quicktime';
        else if (['.jpg', '.jpeg'].includes(ext)) detectedType = 'image/jpeg';
        else if (ext === '.png') detectedType = 'image/png';
        else if (ext === '.webp') detectedType = 'image/webp';
        else if (ext === '.gif') detectedType = 'image/gif';
        else detectedType = detectedType || 'application/octet-stream';
    }

    // Enforce strict format whitelist for browser playback & preview
    const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov'];
    const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const isVideo = detectedType.startsWith('video/') || ALLOWED_VIDEO_EXTS.includes(ext);
    const isImage = detectedType.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);

    if (!isVideo && !isImage) {
        return res.status(400).json({ 
            message: "Unsupported file format. Only videos (MP4, WebM, MOV) and images (JPG, PNG, WebP, GIF) are allowed." 
        });
    }

    if (isVideo && (!ALLOWED_VIDEO_EXTS.includes(ext) || (!detectedType.startsWith('video/') && detectedType !== 'application/octet-stream'))) {
        return res.status(400).json({ 
            message: "Unsupported video format. Allowed formats: MP4, WebM, MOV." 
        });
    }

    if (isImage && (!ALLOWED_IMAGE_EXTS.includes(ext) || (!detectedType.startsWith('image/') && detectedType !== 'application/octet-stream'))) {
        return res.status(400).json({ 
            message: "Unsupported image format. Allowed formats: JPG, JPEG, PNG, WebP, GIF." 
        });
    }

    // Normalize final Content-Type for S3
    const finalContentType = isVideo && detectedType === 'application/octet-stream'
        ? (ext === '.webm' ? 'video/webm' : (ext === '.mov' ? 'video/quicktime' : 'video/mp4'))
        : (isImage && detectedType === 'application/octet-stream'
            ? (ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg'))
            : detectedType);

    // Enforce limits: Max 5 Images and Max 3 Videos per freelancer
    const user = await User.findOne({ fl_id: userId });
    if (user && user.external_projects) {
        const { images, videos } = countMediaTypes(user.external_projects);
        if (isImage && images >= 5) {
            return res.status(400).json({ message: `Image quota reached (${images}/5). Please remove an existing image to add a new one.` });
        }
        if (isVideo && videos >= 3) {
            return res.status(400).json({ message: `Video quota reached (${videos}/3). Please remove an existing video to add a new one.` });
        }
    }

    // Sanitize fileName: strip non-ASCII / emojis, replace spaces and special characters with underscores
    const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const cleanBaseName = baseName
        .replace(/[^\w.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100) || 'media';
    const cleanFileName = `${cleanBaseName}${ext}`;
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;
    
    // We use the temporary folder: portfolio-temp/{userId}/...
    const s3Key = `portfolio-temp/${userId}/${uniqueFileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: finalContentType
    });

    // expiresIn: 15 minutes
    const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 900
    });

    res.status(200).json({ uploadUrl, s3Key, contentType: finalContentType });
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

// ==========================================
// PORTFOLIO S3 VIEW/DOWNLOAD PRESIGNED URL
// ==========================================
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
        // Verify file actually exists in S3 before generating presigned URL
        try {
            await s3.send(new HeadObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key
            }));
        } catch (headErr) {
            if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
                return res.status(404).json({ message: "Media file does not exist in S3 storage" });
            }
            console.warn("HeadObject check warning for", s3Key, headErr.message);
        }

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

// ==========================================
// CLIENT VIEW (privacy-safe resume profile)
// ==========================================

// The ONLY fields allowed in a Client View. Anything else from the Python
// service is dropped here (server-side default-deny, independent of the
// service's own filter).
const CLIENT_VIEW_WHITELIST = [
  "skills",
  "experience",
  "roles",
  "responsibilities",
  "projects",
  "technologies",
  "certifications",
  "achievements",
  "portfolio",
];

const CLIENT_VIEW_STATUSES = [
  "PASSED",
  "PASSED_WITH_WARNINGS",
  "BLOCKED_AND_CLEANED",
];

/**
 * Re-validate the Python service response against the whitelist schema.
 * Keeps only whitelisted keys whose values are arrays of strings.
 * Never passes through anything unexpected.
 */
function sanitizeClientViewPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const clean = {};

  for (const key of CLIENT_VIEW_WHITELIST) {
    const value = payload[key];

    if (Array.isArray(value)) {
      clean[key] = value.filter((item) => typeof item === "string");
    }
  }

  return clean;
}

/**
 * Normalize the validation status to one of the three known values.
 * Unknown/missing statuses are flagged for review, never treated as PASSED.
 */
function normalizeClientViewStatus(status) {
  const base = typeof status === "string" ? status.trim().split(" ")[0] : "";

  return CLIENT_VIEW_STATUSES.includes(base) ? base : "PASSED_WITH_WARNINGS";
}

/**
 * Keep only boolean PII flags — no types-with-values, no details.
 */
function sanitizePiiFlags(piiDetected) {
  const flags = piiDetected && typeof piiDetected === "object" ? piiDetected : {};

  return {
    email: flags.email === true,
    phone: flags.phone === true,
    addressLocation: flags.addressLocation === true,
    governmentId: flags.governmentId === true,
  };
}

// Upload a document, generate the Client View, and store ONLY the
// sanitized result on the freelancer's profile.

const generateClientView = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  try {
    const user = await User.findOne({ fl_id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const path = require("path");
    const extension = path.extname(req.file.originalname || "").toLowerCase();

    if (![".pdf", ".docx"].includes(extension)) {
      return res.status(400).json({
        message: "Only PDF and DOCX files are supported.",
      });
    }

    if (!process.env.PYTHON_API_KEY) {
      return res.status(500).json({
        message: "Client View service is not configured.",
      });
    }

    // Forward the document to the Python docgen service.
    // The filename sent is a generic label — the original filename is
    // never stored or logged (filenames can contain PII).
    const form = new FormData();

    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), `upload${extension}`);

    const response = await axios.post(
      process.env.DOCGEN_API_URL || "http://127.0.0.1:8002/process",
      form,
      {
        headers: {
          "x-api-key": process.env.PYTHON_API_KEY,
        },
        timeout: 75000, // slightly above the service's own 60s limit
        maxBodyLength: 15 * 1024 * 1024,
      }
    );

    const clientView = sanitizeClientViewPayload(response.data?.clientView);

    if (!clientView) {
      return res.status(422).json({
        message: "No client view could be generated from the document.",
      });
    }

    // Store ONLY the sanitized client view, status, and boolean flags.
    user.client_view = {
      data: clientView,
      validationStatus: normalizeClientViewStatus(
        response.data?.validationStatus
      ),
      piiDetected: sanitizePiiFlags(response.data?.piiDetected),
      updatedAt: new Date(),
    };

    await user.save();

    return res.status(200).json({
      message: "Client View generated successfully",
      validationStatus: user.client_view.validationStatus,
      piiDetected: user.client_view.piiDetected,
      clientView: user.client_view.data,
      updatedAt: user.client_view.updatedAt,
    });

  } catch (error) {
    // Log the category only — never the request body or document contents.
    if (error.response) {
      console.error("Client view generation failed:", error.response.status);
    } else if (error.code === "ECONNABORTED") {
      console.error("Client view generation timed out");
    } else {
      console.error("Client view generation failed:", error.message);
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        message: "Document processing timed out. Please try again.",
      });
    }

    if (error.response) {
      // Service was reached; relay its generic status message only.
      return res.status(502).json({
        message: "Document processing failed. Please try again.",
      });
    }

    return res.status(503).json({
      message: "Document processing service is unavailable. Please try again later.",
    });
  }
});

// Freelancer (owner) or admin reads their own stored Client View.

const getOwnClientView = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  const user = await User.findOne({ fl_id }).select("client_view");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.client_view || !user.client_view.data) {
    return res.status(404).json({ message: "No Client View is available." });
  }

  return res.status(200).json({
    validationStatus: user.client_view.validationStatus,
    piiDetected: user.client_view.piiDetected,
    clientView: user.client_view.data,
    updatedAt: user.client_view.updatedAt,
  });
});

// Client-facing read: allowed only for admins, or for clients who share a
// project/group with the freelancer (association check below).

const getClientView = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;
  const user = req.user || {};

  const isAdmin = user.role === "admin" || user.usr_id;
  const clientId = user.c_id;

  if (!isAdmin && !clientId) {
    return res.status(403).json({
      message: "Forbidden: only associated clients can view this profile",
    });
  }

  // Association: the client must own at least one project that has a group
  // containing this freelancer.
  if (!isAdmin) {
    const clientProjects = await Cproject.find({ c_id: clientId }).select("p_id");

    const projectIds = clientProjects.map((p) => p.p_id);

    if (projectIds.length) {
      const linkedGroup = await Group.findOne({
        p_id: { $in: projectIds },
        "members.member": fl_id,
      }).select("grp_id");

      if (!linkedGroup) {
        return res.status(403).json({
          message: "Forbidden: no project association with this freelancer",
        });
      }
    } else {
      return res.status(403).json({
        message: "Forbidden: no project association with this freelancer",
      });
    }
  }

  const freelancer = await User.findOne({ fl_id }).select("client_view");

  if (!freelancer) {
    return res.status(404).json({ message: "Freelancer not found" });
  }

  const clientView = sanitizeClientViewPayload(freelancer.client_view?.data);

  if (!clientView) {
    return res.status(404).json({ message: "No Client View is available." });
  }

  // Return only the professional-field whitelist and non-identifying
  // processing metadata. Never expose personal profile fields to clients.
  return res.status(200).json({
    validationStatus: freelancer.client_view.validationStatus,
    clientView,
    updatedAt: freelancer.client_view.updatedAt,
  });
});

// Project-scoped resume read: GET /clientview/project/:p_id/freelancer/:fl_id
// A logged-in CLIENT may read a freelancer's Client View ONLY when:
//   1. the client owns the project (cproject.c_id === token.c_id), and
//   2. the freelancer is a member of a group on that exact project.
// Admins are allowed. Freelancers and other clients get 403.
// The response is filtered to the nine whitelisted keys — extra keys the
// stored document might contain are always dropped here.

const getClientViewForProject = asyncHandler(async (req, res) => {
  const { p_id, fl_id } = req.params;
  const user = req.user || {};

  const isAdmin = user.role === "admin" || !!user.usr_id;
  const clientId = user.c_id;

  if (!isAdmin && !clientId) {
    return res.status(403).json({
      message: "Forbidden: only the project owner can view this resume",
    });
  }

  // 1. The project must exist and (for a client) be owned by the caller.
  const project = await Cproject.findOne({ p_id }).select("c_id");

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!isAdmin && project.c_id !== clientId) {
    return res.status(403).json({
      message: "Forbidden: you do not own this project",
    });
  }

  // 2. The freelancer must be on this exact project.
  const linkedGroup = await Group.findOne({
    p_id,
    "members.member": fl_id,
  }).select("grp_id");

  if (!linkedGroup) {
    return res.status(403).json({
      message: "Forbidden: freelancer is not on this project",
    });
  }

  const freelancer = await User.findOne({ fl_id }).select("client_view");

  if (!freelancer) {
    return res.status(404).json({ message: "Freelancer not found" });
  }

  const clientView = sanitizeClientViewPayload(freelancer.client_view?.data);

  if (!clientView) {
    return res.status(404).json({ message: "Resume not available yet" });
  }

  return res.status(200).json({ clientView });
});

module.exports = { registerUser, verifyOtp, loginUser, googleSignup, googleLogin, currentUser, getbyid, getdetails, generateId, updatedata, deletedata, updateVerifiedEmail, forgotpassword, updatepassword, sendDefaultMail, refreshToken, logoutUser, saveResume, getResume, uploadCertificate, viewCertificate, deleteCertificate, uploadResume, deleteResume, resendVerificationEmail, getPortfolioUploadUrl, getPortfolioFileUrl, generateClientView, getOwnClientView, getClientView, getClientViewForProject };

