const asyncHandler = require("express-async-handler");
const Cregister = require("../models/cregisterModel");
const User = require("../models/userModel");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const notification = require('../models/freelancer_notificationModel');

const { sendEmail } = require('../services/emailservice');
const { calculateClientCompletion } = require('../services/profileService');
const cacheService = require('../services/cacheService');
const crypto = require('crypto');
const { verifyGoogleToken } = require("../services/googleAuthService");
const { sanitizeForLogging } = require('../Utility/logSanitizer');
const { logUserActivity } = require('../Utility/activityLogger');
const BankModel = require('../models/bankModels');
const Cproject = require('../models/cprojectModel');
const UserActivity = require('../models/userActivityModel');
const SupportModel = require('../models/supportModel');

// ============================================================
// SEND CLIENT VERIFICATION OTP
// ============================================================
async function generateAndSendClientOtp(user) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 60 * 1000);

  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.isverfied = false;
  await user.save();

  try {
    const { queueOtpEmail } = require('../queues/emailQueue');
    queueOtpEmail({ userId: user.c_id, fullname: user.fullname, email: user.email, otp, userType: 'client' }).catch(err => console.error('Queue otp email error', err));
    console.log('Client OTP enqueued for:', sanitizeForLogging({ email: user.email }));
  } catch (err) {
    console.error('Failed to enqueue client OTP email', err);
  }

  return otpExpiresAt;
}

// Get Details
const getdata = asyncHandler(async (req, res) => {
  const register = await Cregister.find().select("-password");
  res.status(200).json(register)
});

// Get Details by Id

const getbyid = asyncHandler(async (req, res) => {
  const userdata = await Cregister.findOne({ c_id: req.params.c_id }).select("-password");
  res.status(200).json(userdata);
})

// Generate Emp Id

async function generateId() {
  let c_Id;
  let exists;

  do {
    c_Id = `Cl${Math.floor(Math.random() * (99999999 - 10000000)) + 10000000}`;
    exists = await Cregister.findOne({ c_id: c_Id });
  } while (exists);

  return c_Id;
}

// async function sendEmail(to, subject, htmlContent) {
//     const transporter = nodemailer.createTransport({
//         service: 'Gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//         }
//     });

//     await transporter.sendMail({
//         from: Admin Team <${process.env.EMAIL_USER}>,
//         to,
//         subject,
//         html: htmlContent
//     });
// }
//@desc Register the user
//@route POST /api/user/register
//@access Public

const registerUser = asyncHandler(async (req, res) => {
  console.log("Client registration request received:", sanitizeForLogging(req.body));
  const {
    c_id,
    fullname,
    username,
    email,
    password,
    country,
    contact,
    location,
    terms,
    dob,
    nationality,
    gender,
    bio,
    linkedin,
    twitter,
    instagram,
    facebook,
    companyname,
    companytype,
    companyregno,
    companywebsite,
    companyaddress,
    city,
    state,
    pincode,
    companydescrptn,
    profile
  } = req.body;
  const isAgreed = String(terms).toLowerCase() === 'true';
  if (
    !fullname || !email || !password || !isAgreed
  ) {
    return res.status(400).json({ message: "All fields are mandatory!!" });
  }

  const fullNameRegex = /^[a-zA-Z][a-zA-Z ]*$/;
  if (!fullNameRegex.test(fullname)) {
    return res.status(400).json({ message: "Full name must start with a letter and contain only letters and spaces." });
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9\._]*$/;
  if (username && !usernameRegex.test(username)) {
    return res.status(400).json({ message: "Username must start with a letter and can contain numbers, dots, and underscores." });
  }

  // Password complexity validation: 8+ chars, uppercase, lowercase, number, special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters."
    });
  }

  const startWithLetterRegex = /^[a-zA-Z]/;
  if (bio && !startWithLetterRegex.test(bio)) {
    return res.status(400).json({ message: "Bio must start with a letter." });
  }
  if (companyaddress && !startWithLetterRegex.test(companyaddress)) {
    return res.status(400).json({ message: "Company address must start with a letter." });
  }
  if (companydescrptn && !startWithLetterRegex.test(companydescrptn)) {
    return res.status(400).json({ message: "Company description must start with a letter." });
  }
  const userAvailable = await Cregister.findOne({ email })
  if (!userAvailable) {
    // Hashin the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hash generated for new client registration:", Boolean(hashedPassword));
    const cl_id = await generateId();
    const user = await Cregister.create({
      c_id: cl_id,
      fullname,
      username,
      email,
      password: hashedPassword,
      country,
      contact,
      location,
      terms,
      dob,
      nationality,
      gender,
      bio,
      linkedin,
      twitter,
      instagram,
      facebook,
      companyname,
      companytype,
      companyregno,
      companywebsite,
      companyaddress,
      city,
      state,
      pincode,
      companydescrptn,
      profile,
      createdby: cl_id,
      updatedby: null,
      isverfied: false
    });
    if (user) {
      await sendNotification(user.c_id, req);

      // Generate OTP synchronously and save hash+expiry so it's available in response
      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const otpExpiresAt = new Date(Date.now() + 60 * 1000);
      user.otpHash = otpHash;
      user.otpExpiresAt = otpExpiresAt;
      user.isverfied = false;
      await user.save();

      // Enqueue welcome and OTP emails
      const { queueWelcomeEmail, queueOtpEmail } = require('../queues/emailQueue');
      queueWelcomeEmail({ userId: user.c_id, fullname: user.fullname, email: user.email, userType: 'client' }).catch(err => console.error('Queue welcome email error', err));
      queueOtpEmail({ userId: user.c_id, fullname: user.fullname, email: user.email, otp, userType: 'client' }).catch(err => console.error('Queue otp email error', err));

      return res.status(201).json({
        message: "Registration successful. OTP sent to your email.",
        id: user.c_id,
        email: user.email,
        otpExpiresAt: otpExpiresAt
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  }
  else {
    if (!userAvailable.isverfied) {
      return res.status(400).json({
        message: "Email already exists but is not verified.",
        isverfied: false,
        email: email
      });
    }
    return res.status(400).json({ message: "Email already in use" });
  }
  // if (!user) {
  //     return res.status(400).json({ message: "Invalid user data" });
  // }
  // res.status(201).json({ email: user.email, password: user.password });

});
async function sendWelcomeEmail(fullname, email) {
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
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 20px;
      background: #ef2f2c;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>

    <div class="content">
      <p>Hi ${fullname || "Client"},</p>

      <p class="highlight">
        Welcome to Kansbe.
      </p>

      <p>
        You’ve just taken the first step toward finding the right talent to bring your ideas to life.
      </p>

      <div class="box">
        <p style="margin-top:0;">
          <strong>Start hiring with confidence</strong>
        </p>

        <p>✔ Discover skilled freelancers</p>
        <p>✔ Post your requirements</p>
        <p style="margin-bottom:0;">✔ Get quality work delivered on time</p>
      </div>

      <p>
        You joined us at ${time}, and your hiring journey begins now.
      </p>

      <p>
        Whether it’s a quick task or a long-term project, Kansbe is here to support you at every step.
      </p>

      <a href="https://kansbe.com/clientlogin" style="color:white" class="btn">Start Hiring</a>

      <p style="margin-top: 24px;">
        With you in every project,<br/><br/>
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
    const welcomeTitle = "Greetings";
    const welcomeMessage = "Kansbe welcomes you! We're Honoured to have you with us and look forward to delivering excellence together.";

    // Fix: use correct field name usr_id in query
    let user = await notification.findOne({ usr_id: usrid });
    let newNotification;

    const time = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

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

// ============================================================
// GOOGLE CLIENT SIGNUP
// ============================================================
const googleSignup = asyncHandler(async (req, res) => {
  const { idToken, terms } = req.body;

  const isAgreed = String(terms).toLowerCase() === "true";

  if (!idToken || !isAgreed) {
    return res.status(400).json({
      message: "Google ID token and terms acceptance are required"
    });
  }

  let googleUser;
  try {
    googleUser = await verifyGoogleToken(idToken);
  } catch (err) {
    console.error("Google token verification failed:", err?.message || err);
    return res.status(401).json({
      message: "Invalid or expired Google token. Please try again."
    });
  }

  const {
    name,
    googleId,
    email,
    email_verified
  } = googleUser;

  if (!email_verified) {
    return res.status(400).json({
      message: "Google email is not verified"
    });
  }

  // Check if client already exists by googleId or email
  let existingUser = await Cregister.findOne({ googleId });
  if (!existingUser) {
    existingUser = await Cregister.findOne({ email });
    if (existingUser && !existingUser.googleId) {
      existingUser.googleId = googleId;
      existingUser.isverfied = true;
      await existingUser.save();
    }
  }

  // If user already exists, seamlessly authenticate and return tokens
  if (existingUser) {
    const accessToken = jwt.sign(
      {
        user: {
          c_id: existingUser.c_id,
          email: existingUser.email
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      {
        user: {
          c_id: existingUser.c_id,
          email: existingUser.email
        }
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      message: "Google authentication successful",
      id: existingUser.c_id,
      email: existingUser.email,
      fullname: existingUser.fullname,
      isverfied: existingUser.isverfied,
      profile: existingUser.profile,
      accessToken,
      isExistingUser: true
    });
  }

  const cl_id = await generateId();

  const user = await Cregister.create({
    c_id: cl_id,
    fullname: name || "",
    email: email,
    googleId: googleId,
    username: null,
    password: null,
    country: null,
    contact: null,
    location: null,
    terms: true,
    isverfied: true,
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
    createdby: cl_id,
    updatedby: null
  });

  if (!user) {
    return res.status(400).json({
      message: "Unable to create Google account"
    });
  }

  await sendNotification(user.c_id, req);
  try {
    const { queueWelcomeEmail } = require('../queues/emailQueue');
    queueWelcomeEmail({ userId: user.c_id, fullname: user.fullname, email: user.email, userType: 'client' }).catch(err => console.error('Queue welcome email error', err));
  } catch (err) {
    console.error('Failed to enqueue welcome email', err);
  }

  const accessToken = jwt.sign(
    {
      user: {
        c_id: user.c_id,
        email: user.email
      }
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    {
      user: {
        c_id: user.c_id,
        email: user.email
      }
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.status(201).json({
    message: "Google signup successful",
    id: user.c_id,
    email: user.email,
    fullname: user.fullname,
    isverfied: user.isverfied,
    profile: user.profile,
    accessToken,
    isExistingUser: false
  });
});

// ============================================================
// GOOGLE CLIENT LOGIN
// ============================================================
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      message: "Google ID token is required"
    });
  }

  const googleUser = await verifyGoogleToken(idToken);

  const {
    googleId,
    email,
    email_verified
  } = googleUser;

  if (!email_verified) {
    return res.status(400).json({
      message: "Google email is not verified"
    });
  }

  const user = await Cregister.findOne({ googleId });

  if (!user) {
    return res.status(404).json({
      message: "No KANSBE account is associated with this Google account. Please sign up first."
    });
  }

  if (!user.isverfied) {
    return res.status(403).json({
      message: "Your KANSBE account is not verified."
    });
  }

  const accessToken = jwt.sign(
    {
      user: {
        c_id: user.c_id,
        email: user.email
      }
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    {
      user: {
        c_id: user.c_id,
        email: user.email
      }
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.status(200).json({
    message: "Google login successful",
    id: user.c_id,
    email: user.email,
    fullname: user.fullname,
    isverfied: user.isverfied,
    accessToken
  });
});

//@desc login the user
//@route POST /api/user/login
//@access Public


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400)
    throw new Error("All Fields are Mandatory")
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: "Invalid input type. Strings are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.(com|co|in)$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const user = await Cregister.findOne({ email: sanitizedEmail });
  const isverified = user ? (user.isverfied !== false) : false;

  if (user && (user.password === null || !user.password)) {
    return res.status(400).json({
      message: "This email is registered with Google. Please login with Google instead."
    });
  }
  if (!user) {
    // Check if the user exists in the Freelancer (User) model
    const freelancer = await User.findOne({ email: sanitizedEmail });
    if (freelancer) {
      return res.status(401).json({ message: "User Not Found (This email is registered as a Freelancer)" });
    }
    return res.status(401).json({ message: "Email not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: "Wrong password, please try again" });
  }

  if (isMatch && isverified) {
    const accessToken = jwt.sign(
      {
        user: {
          c_id: user.c_id,
          email: user.email
        }
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      {
        user: {
          c_id: user.c_id,
          email: user.email
        }
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // Set to true in production
      sameSite: 'None', // Adjust based on your requirements
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await logUserActivity(req, 'login', 'auth', user.c_id, {
      source: 'client-login',
      email: user.email
    }, user.c_id);

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
    return res.status(401).json({ message: "Invalid Credentials!" });
  }
});

// ============================================================
// VERIFY CLIENT OTP
// ============================================================
const verifyClientOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await Cregister.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isverfied) {
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
  user.isverfied = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const accessToken = jwt.sign(
    {
      user: {
        email: user.email,
        c_id: user.c_id,
      }
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { user: { email: user.email, c_id: user.c_id } },
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
        user: {
          c_id: decoded.user.c_id,
          email: decoded.user.email,


        }
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
    secure: true, // Set to true in production
    sameSite: 'None', // Adjust based on your requirements
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
    const ids = ["Cl83522237", "Cl89298924"]
    const users = await Cregister.find({ c_id: { $in: ids } });


    for (const user of users) {
      const subject = "Project Update – Project Manager Assigned";
      const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Project Update</title>
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
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 18px;
      margin: 20px 0;
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
      <p>Dear ${user.fullname} ,</p>

      <p>
        Thank you for posting your project on our <span class="highlight">Kansbe</span> platform.
        We truly appreciate your trust and are pleased to inform you that your project is already
        progressing ahead.
      </p>

      <div class="box">
        <p>
          We are happy to inform you that a <strong>Project Manager with Id:"kn34918164"</strong> has been
          successfully assigned to your project.
        </p>
        <p>
          The Project Manager will carefully review your project requirements and
          suggest freelancers who best match your required skills and expectations.
          You will be notified as soon as suitable freelancer matches are identified.
        </p>
      </div>

      <p>
        Please note that as our application is currently in the
        <span class="highlight">development stage</span>, all communication and updates
        will be handled via <strong>email</strong> for now.
      </p>

      <p>
        Once the development is complete, the entire process—including communication
        and project management—will be seamlessly handled within the Kansbe application.
      </p>

      <p>
        We appreciate your understanding and patience during this phase.
        If you have any questions or additional requirements, feel free to reply to this email.
      </p>
      <div style="text-align:center; margin:30px 0;">
  <p style="margin-bottom:18px;">
    To view your project details and track the latest updates,
    please log in to your Kansbe account using the button below.
  </p>

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
    View Project Details
  </a>
</div>

      <p style="margin-top: 24px;">
        Warm regards,<br/>
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
      <p>
        <a href="https://kansbe.com" style="color:#666; text-decoration:none;">
          kansbe.com
        </a>
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

// Update Data

const updatedata = asyncHandler(async (req, res) => {

  const {
    fullname,
    username,
    email,
    country,
    contact,
    location,
    dob,
    nationality,
    gender,
    bio,
    linkedin,
    twitter,
    instagram,
    facebook,
    companyname,
    companytype,
    companyregno,
    companywebsite,
    companyaddress,
    city,
    state,
    pincode,
    companydescrptn,
    profile_pic
  } = req.body;



  const cinfodata = await Cregister.findOne({ c_id: req.params.c_id });
  if (!cinfodata) {
    res.status(400)
    throw new Error("Id Not Found!!!");
  }

  // Support direct avatar update without enforcing full-profile mandatory field validation
  const bodyKeys = Object.keys(req.body).filter(k => k !== 'updatedby');
  const isAvatarOnly = bodyKeys.length > 0 && bodyKeys.every(k => k === 'profile_pic' || k === 'p_pic');
  if (isAvatarOnly) {
    const newPic = req.body.profile_pic || req.body.p_pic || '';
    const updateddata = await Cregister.findOneAndUpdate(
      { c_id: req.params.c_id },
      { $set: { profile_pic: newPic, p_pic: req.body.p_pic || newPic } },
      { new: true }
    );
    try {
      cacheService.invalidateUser(req.params.c_id);
    } catch (e) {}
    return res.status(200).json(updateddata);
  }

  const error = {};

  if (!fullname) error.fullname = "Firstname is required";
  if (!email) error.email = "Email is required";
  if (!contact) error.contact = "Contact is required";
  if (!bio) error.bio = "Bio is required";

  const startWithLetterRegex = /^[a-zA-Z]/;
  if (bio && !startWithLetterRegex.test(bio)) {
    error.bio = "Bio must start with a letter";
  }
  if (companyaddress && !startWithLetterRegex.test(companyaddress)) {
    error.companyaddress = "Company address must start with a letter";
  }
  if (companydescrptn && !startWithLetterRegex.test(companydescrptn)) {
    error.companydescrptn = "Company description must start with a letter";
  }


  const fullNameRegex = /^[a-zA-Z][a-zA-Z\s]*$/;
  if (fullname) {
    if (!fullNameRegex.test(fullname)) {
      error.fullname = "Full name must start with a letter and contain only letters and spaces";
    } else if (fullname.length < 3 || fullname.length > 30) {
      error.fullname = "Full name must be between 3 and 30 characters long";
    }
  }
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9\._]*$/;
  if (username) {
    if (!usernameRegex.test(username)) {
      error.username = "Username must start with a letter and can contain numbers, dots, and underscores";
    } else if (username.length < 3 || username.length > 30) {
      error.username = "Username must be between 3 and 30 characters long";
    }
  }

  // Email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
  if (email && !emailRegex.test(email)) {
    error.email = "Email must be valid and end with .com";
  }

  // Contact validation
  const contactRegex = /^[0-9]{1,10}$/;
  if (contact && !contactRegex.test(contact)) {
    error.contact = "Contact number must be numeric and max 10 digits";
  }

  const letterOnlyRegex = /^[a-zA-Z][a-zA-Z\s]*$/;
  if (companyname && !letterOnlyRegex.test(companyname)) {
    error.companyname = "Company name must start with a letter and contain only letters and spaces";
  }
  if (city && !letterOnlyRegex.test(city)) {
    error.city = "City must start with a letter and contain only letters and spaces";
  }
  if (state && !letterOnlyRegex.test(state)) {
    error.state = "State must start with a letter and contain only letters and spaces";
  }

  if (Object.keys(error).length > 0) {
    return res.status(400).json({ error });
  }

  const updateddata = await Cregister.findOneAndUpdate(
    { c_id: req.params.c_id },
    req.body,
    { new: true }
  )

  // Recalculate and persist profile completion
  try {
    const completion = calculateClientCompletion(updateddata);
    await Cregister.updateOne(
      { c_id: req.params.c_id },
      { $set: { profile_completion: completion.percentage } }
    );
    cacheService.invalidateUser(req.params.c_id);
  } catch (err) {
    console.error('Client profile completion recalc error:', err.message);
  }

  res.status(200).json(updateddata);
});

// Update Details of verification

const updateVerifiedEmail = asyncHandler(async (req, res) => {
  try {
    const token = req.query.token; // Get token from Url
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    // Verify the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const email = decoded.email;
    const register = await Cregister.findOne({ email: email });
    if (!register) {
      res.status(400)
      throw new Error("Id not Found!!!");
    }
    const updatedregister = await Cregister.findOneAndUpdate(
      { email: email },
      { isverfied: true },
      { new: true }
    )
    await res.redirect('https://kansbe.com/clientlogin');
  } catch (err) {
    // await res.status(200).json(updatedregister);
    console.error(err);
    res.status(401).json({ message: "Invalid or expired token" });

  }

});

// Update Password
const updatepassword = asyncHandler(async (req, res) => {
  const { c_id } = req.params;
  const { currpassword, updatedpassword } = req.body;

  try {
    // Find user by c_id
    const user = await Cregister.findOne({ c_id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.password === null || !user.password) {
      return res.status(400).json({
        message: "This email is registered with Google. Cannot change the password"
      });
    }
    // Compare current password with stored hashed password
    const isMatch = await bcrypt.compare(currpassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Your current password doesn't match your existing one" });
    }
    // Hash new password
    const hashedPassword = await bcrypt.hash(updatedpassword, 10);
    // Update password in database
    await Cregister.findOneAndUpdate({ c_id }, { password: hashedPassword }, { new: true });

    // Send notification email
   const subject = "Security Alert: Password Changed";
const message = `
<div style="font-family:Arial,sans-serif;padding:20px;">
<h2>Password Changed Successfully</h2>
<p>Dear ${user.fullname},</p>
<p>Your Kansbe account password has been successfully changed.</p>
<p>You can now log in to your Kansbe account using your new password.</p>
<a href="https://kansbe.com/clientlogin" style="display:inline-block;background-color:#ef2f2c;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;">Login to Kansbe</a>
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

// Delete Data

const deletedata = asyncHandler(async (req, res) => {
  const c_id = req.params.c_id;
  const register = await Cregister.findOne({ c_id });
  if (!register) {
    return res.status(404).json({ message: "Client not found!" });
  }

  // Delete main client account
  const deletedClient = await Cregister.findOneAndDelete({ c_id });

  // 1-to-1 Array Documents
  await BankModel.findOneAndDelete({ c_id }).catch(() => {});

  // 1-to-Many Multi-Row Documents
  await Cproject.deleteMany({ c_id }).catch(() => {});
  await UserActivity.deleteMany({ userId: c_id }).catch(() => {});
  await SupportModel.deleteMany({ usr_id: c_id }).catch(() => {});

  res.status(200).json({ message: "Client and all associated records deleted successfully", data: deletedClient });
});

// Send Activation Email


// async function sendEmail(to, subject, htmlContent) {
//     const transporter = nodemailer.createTransport({
//         service: 'Gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//         }
//     });

//     await transporter.sendMail({
//         from: Admin Team <${process.env.EMAIL_USER}>,
//         to,
//         subject,
//         html: htmlContent
//     });
// }

// const sendmail = asyncHandler(async (req, res) => {

//     try {
//         const email = req.params.email;
//         const employee = await Cregister.findOne({ email });
//         if (!employee) {
//             return res.status(404).json({ message: 'User not found.' });
//         }

//         // Generate token valid for 1 hour
//         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECERT, { expiresIn: "1h" });


//         const activationLink = http://localhost:5001/api/cregister/updated?token=${token};

//         const subject = 'Your Account Activation Required';
//         const message = `
//   <p>Please click the button below to activate your account:</p>
//   <button style="color: #f1f3f7ff; background-color: #06e773ff; padding: 10px 15px; border: none; border-radius: 5px; text-decoration: none;"><a href="${activationLink}" style="color: #f1f3f7ff; text-decoration: none;">Activate Account</a></button>
//   <p>If you did not request this, please ignore this email.</p>
//   <p>Regards,<br/>Admin Team</p>
//     <p><small>This is an automated message, please do not reply.</small></p>
// `;


//         await sendEmail(email, subject, message);

//         res.status(200).json({ message: 'Verification email sent successfully.' });
//     } catch (err) {
//         console.error('Email failed:', err.message);
//         res.status(500).json({ message: 'Email failed: ' + err.message });
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


const sendpassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const password = createRandomPassword(); // returns string now
  try {
    const exists = await Cregister.findOne({ email });
    if (exists) {
      if (exists.password === null || !exists.password) {
        return res.status(400).json({
          message: "This email is registered with Google. Please login with Google instead."
        });
      }

      if (!exists.isverfied) {
        return res.status(400).json({ message: "Please Verify Your Email first." });
      }

      // hashing the random password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const updatedregister = await Cregister.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );

     const subject = 'Email and Password Recovery';

const message = `
  <p style="margin:0 0 12px 0;">
    Your Password has been created successfully. Here are your credentials:
  </p>

  <p style="margin:0 0 12px 0;">
    Your email is: <strong>${email}</strong>
  </p>

  <p style="margin:0 0 12px 0;">
    Your new password is: <strong>${password}</strong>
  </p>

  <p style="margin:0 0 10px 0;">
    Please Login With Above Credentials
  </p>

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
      margin:0 0 15px 0;
    "
  >
    Click to Login
  </a>

  <p style="margin:0 0 12px 0;">
    Regards,<br/>
    Admin Team
  </p>

  <p style="margin:0;">
    <small>This is an automated message, please do not reply.</small>
  </p>
`;

      await sendEmail(email, subject, message);

      res.status(200).json({ message: 'Password Recovery email sent successfully.' });
    } else {
      res.status(400).json({ message: "Email Not Found!!" });
    }
  } catch (err) {
    console.error('Email failed:', err.message);
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
    const user = await Cregister.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isverfied) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    await generateAndSendClientOtp(user);
    res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});







module.exports = { getdata, getbyid, registerUser, verifyClientOtp, updatedata, updateVerifiedEmail, deletedata, currentUser, loginUser, googleSignup, googleLogin, sendpassword, refreshToken, logoutUser, sendDefaultMail, updatepassword, resendVerificationEmail };