const express = require("express");
const router = express.Router();
const {
  createSupportTicket,
  getSupportTickets,
} = require("../controllers/supportController");
const { validateAdminToken } = require("../middleware/validateAdminToken");
const mailLimiter = require("../Utility/mail_limit");

router.post("/", mailLimiter, createSupportTicket);
router.get("/", validateAdminToken, getSupportTickets);

module.exports = router;
