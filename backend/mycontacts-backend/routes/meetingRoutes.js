const express = require("express");
const router = express.Router();
const { requestMeeting, getMeetingsByProject, respondToMeeting, getMyMeetings, markMeetingCompleted, getGlobalHistory } = require("../controllers/meetingController");
const validateToken = require("../middleware/validateTokenHandler");

router.use(validateToken);

// Client/Freelancer: request a meeting
router.post("/:p_id/request", requestMeeting);

// Manager: get all meeting requests for a project
router.get("/:p_id", getMeetingsByProject);

// Manager: respond to a specific meeting request
router.put("/:p_id/respond/:requestId", respondToMeeting);

// Manager: mark a meeting as completed
router.put("/:p_id/complete/:requestId", markMeetingCompleted);

// GET /api/meetings/global/history/:userId
router.get("/global/history/:userId", getGlobalHistory);

module.exports = router;

