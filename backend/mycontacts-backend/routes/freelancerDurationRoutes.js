const express = require("express");
const router = express.Router();
const validateToken = require("../middleware/validateTokenHandler");
const { recordPing, recordLogout } = require("../controllers/freelancerDurationController");

router.use(validateToken); // Protect all routes

router.post("/ping", recordPing);
router.post("/logout", recordLogout);

module.exports = router;
