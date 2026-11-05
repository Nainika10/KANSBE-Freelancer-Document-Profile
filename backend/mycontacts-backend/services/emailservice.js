// services/emailService.js
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const validator = require("validator");

// Include models for cross-platform email resolution
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Cregister = require("../models/cregisterModel");
const Manager = require("../models/adminModel");


const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendEmail(to, subject, htmlContent, fromEmail = null) {
  // 1️⃣ Validate the email BEFORE sending
  if (!validator.isEmail(to)) {
    console.log(" Skipping invalid email:", to);
    return { skipped: true, email: to };
  }

  // 2️⃣ Safe trimmed values
  const cleanTo = to.trim();
  const cleanFrom = (fromEmail || process.env.SES_VERIFIED_EMAIL).trim();
  const senderName = fromEmail === "support@kansbe.com" ? "Kansbe Support" : "Kansbe";
  const params = {
    Source: `${senderName} <${cleanFrom}>`, // Verified sender in SES
    Destination: {
      ToAddresses: [cleanTo],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: htmlContent },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(" Email sent successfully:", response.MessageId, cleanTo);
    return response;
  } catch (error) {
    console.error(" Error sending email:", error);
    throw error;
  }
}

function buildWelcomeEmailHtml(fullname, userType = 'user') {
  const displayName = fullname || (userType === 'client' ? 'Client' : 'Freelancer');
  const time = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `
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
      <p>Hi ${displayName},</p>
      <p class="highlight">Kansbe welcomes you!</p>
      <p>Wishing you great beginnings and success ahead.</p>
      <div class="box">
        <p style="margin-top:0;"><strong>Your journey starts here</strong></p>
        <p>Discover opportunities,</p>
        <p>Build meaningful work,</p>
        <p style="margin-bottom:0;">And grow at your own pace.</p>
      </div>
      <p>You joined at ${time}, and this is just the beginning.</p>
      <p>We’re here to support you at every step as you build your freelance journey.</p>
      <p style="margin-top: 24px;">With you in every step,<br/><br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@kansbe.com" style="color:#ef2f2c; text-decoration:none;">support@kansbe.com</a></p>
      <p>© ${new Date().getFullYear()} KANSBE · Freedom · Meaning · Possibility</p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildOtpEmailHtml(fullname, otp) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Email Verification</title>
</head>
<body>
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:40px auto;background:#fff;padding:30px;text-align:center;">
    <h2 style="color:#ef2f2c;">KANSBE</h2>
    <p>Hi ${fullname || 'there'},</p>
    <p>Please use the following OTP to verify your email address:</p>
    <h1 style="color:#ef2f2c;letter-spacing:8px;">${otp}</h1>
    <p>This OTP is valid for <strong>60 seconds</strong>.</p>
    <p>If you did not create a KansBe account, please ignore this email.</p>
    <p>Regards,<br><strong>The KansBe Team</strong></p>
  </div>
</body>
</html>
  `;
}

async function sendNotificationEmail(email, fullname, title, notificationMessage, loginUrl, recipientType) {
  const time = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const subject = title || "Kansbe Notification";
  const loginButton = `
    <div style="text-align:center; margin:30px 0;">
        <a href="${loginUrl}"
           style="
               display:inline-block;
               padding:12px 28px;
               background-color:#ef2f2c;
               color:#ffffff;
               text-decoration:none;
               border-radius:6px;
               font-weight:600;
               font-size:16px;
           ">
            Login 
        </a>
    </div>
`;
  const message = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KANSBE | Notification</title>
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
      <p>Hi ${fullname || "User"},</p>

      <p class="highlight">
        You have a new notification!
      </p>

      <div class="box">
        <p style="margin-top:0;"><strong>${title}</strong></p>
        <p style="margin-bottom:0;">${notificationMessage}</p>
      </div>

      <p>
        Please log in to your dashboard to review any necessary actions.
      </p>
      ${loginButton}

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

// Global dispatcher that dynamically extracts user contacts from the right collection based on ID
async function dispatchEmailForUser(usr_id, title, notificationMessage) {
  if (!usr_id) return;
  try {
    let email, fullname, recipientType, loginUrl;
    // Check Freelancer
    const orQuery = [
      { fl_id: usr_id },
      { c_id: usr_id },
      { usr_id: usr_id }
    ];
    if (mongoose.Types.ObjectId.isValid(usr_id)) {
      orQuery.push({ _id: usr_id });
    }

    let user = await User.findOne({ $or: [{ fl_id: usr_id }, mongoose.Types.ObjectId.isValid(usr_id) ? { _id: usr_id } : null].filter(Boolean) });
    if (user) {
      email = user.email;
      fullname = user.fullname || user.username;
      recipientType = "Freelancer";
      loginUrl = "https://kansbe.com/freelancerlogin";
    } else {
      // Check Client
      let client = await Cregister.findOne({ $or: [{ c_id: usr_id }, mongoose.Types.ObjectId.isValid(usr_id) ? { _id: usr_id } : null].filter(Boolean) });
      if (client) {
        email = client.email;
        fullname = client.fullname || client.c_name;
        recipientType = "Client";
        loginUrl = "https://kansbe.com/clientlogin";
      } else {
        // Check Admin/Manager
        let manager = await Manager.findOne({ $or: [{ usr_id: usr_id }, mongoose.Types.ObjectId.isValid(usr_id) ? { _id: usr_id } : null].filter(Boolean) });
        if (manager) {
          email = manager.email;
          fullname = manager.usr_name || "Manager";
          recipientType = "Admin";
          loginUrl = "https://kansbe.com/alphalogin";
        }
      }
    }

    if (email) {
      await sendNotificationEmail(email, fullname, title, notificationMessage, loginUrl, recipientType);
    } else {
      // We might pass an array of emails or simply let it silently pass if not found (e.g. system broadcast config)
      console.log(`Email dispatch skipped: No user matched ID ${usr_id}`);
    }
  } catch (err) {
    console.error(`Error in dispatchEmailForUser for ${usr_id}:`, err);
  }
}

module.exports = { sendEmail, dispatchEmailForUser, buildWelcomeEmailHtml, buildOtpEmailHtml };
