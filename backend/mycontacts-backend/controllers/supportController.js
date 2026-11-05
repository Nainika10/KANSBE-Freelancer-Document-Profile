const asyncHandler = require("express-async-handler");
const Support = require("../models/supportModel");
const { sendEmail } = require("../services/emailservice");

// @desc Create a support ticket
// @route POST /api/support
// @access Public (or private depending on logic)
const createSupportTicket = asyncHandler(async (req, res) => {
  const { name, email, subject, message, user_id, role } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error("All fields (name, email, subject, message) are mandatory!");
  }

  const ticket = await Support.create({
    name,
    email,
    subject,
    message,
    user_id,
    role,
  });

  if (ticket) {
    // Notify the support team
    const adminEmail = "support@kansbe.com";
    const emailSubject = `New Support Ticket: ${subject}`;
    const htmlContent = `
      <h2>New Support Request from Kansbe Portal</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>User ID:</strong> ${user_id || 'Not provided'}</p>
      <p><strong>Role:</strong> ${role || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr>
      <p>Ticket ID: ${ticket._id}</p>
    `;

    try {
      // 1. Notify the admin (From Verified Email)
      await sendEmail(adminEmail, emailSubject, htmlContent, process.env.SES_VERIFIED_EMAIL);
      console.log("Admin notified of new support ticket.");
      
      // 2. Acknowledge the user (From Verified Email)
      const userAckSubject = `We've received your message - Kansbe Support`;
      const userAckHtml = `
        <h2>Hi ${name},</h2>
        <p>Thank you for reaching out to us! We've received your message regarding "<strong>${subject}</strong>".</p>
        <p>Our team will review it and get back to you shortly.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The Kansbe Support Team</strong></p>
      `;
      await sendEmail(email, userAckSubject, userAckHtml, process.env.SES_VERIFIED_EMAIL);
      console.log("User acknowledged of support ticket.");
    } catch (emailError) {
      console.error("Failed to notify via email:", emailError.message);
      // We don't fail the request if email fails, but it's logged
    }

    res.status(201).json(ticket);
  } else {
    res.status(400);
    throw new Error("Invalid ticket data");
  }
});

// @desc Get all support tickets (for admin use)
// @route GET /api/support
// @access Private
const getSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await Support.find().sort({ createdAt: -1 });
  res.status(200).json(tickets);
});

module.exports = {
  createSupportTicket,
  getSupportTickets,
};
