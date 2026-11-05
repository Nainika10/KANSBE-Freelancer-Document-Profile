const express = require("express")
const router = express.Router()
const { getdata, getbyid, registerUser, verifyClientOtp, updatedata, updateVerifiedEmail, deletedata, loginUser, googleSignup, googleLogin, currentUser, sendpassword, refreshToken, logoutUser, sendDefaultMail, updatepassword, resendVerificationEmail } = require("../controllers/cregisterController");
const mailLimiter = require("../Utility/mail_limit");
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership } = require("../middleware/checkOwnership");
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 OTP verification attempts per window
    message: { message: 'Too many OTP attempts from this IP, please try again after 15 minutes' }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ClientRegister:
 *       type: object
 *       required:
 *         - companyname
 *         - email
 *         - password
 *         - agree
 *       properties:
 *         companyname:
 *           type: string
 *           example: Tech Corp
 *         email:
 *           type: string
 *           example: client@techcorp.com
 *         password:
 *           type: string
 *           example: password123
 *         contact:
 *           type: string
 *           example: 9876543210
 *         agree:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/cregister/login:
 *   post:
 *     tags: [Clients]
 *     summary: Client login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginUser);
router.post("/google-signup", googleSignup);
router.post("/google-login", googleLogin);

/**
 * @swagger
 * /api/cregister/sendpassword:
 *   put:
 *     tags: [Clients]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password sent to email
 */
router.put("/sendpassword", mailLimiter, sendpassword);

/**
 * @swagger
 * /api/cregister/refresh-token:
 *   post:
 *     tags: [Clients]
 *     summary: Refresh access token
 *     responses:
 *       200:
 *         description: New access token
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /api/cregister/logout:
 *   post:
 *     tags: [Clients]
 *     summary: Client logout
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", logoutUser);

/**
 * @swagger
 * /api/cregister/updateVerifiedEmail:
 *   get:
 *     tags: [Clients]
 *     summary: Verify client email
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to login after verification
 */
router.get("/updateVerifiedEmail", updateVerifiedEmail);

/**
 * @swagger
 * /api/cregister/registeruser:
 *   post:
 *     tags: [Clients]
 *     summary: Register new client
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientRegister'
 *     responses:
 *       201:
 *         description: Client registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/register", registerUser);
router.post("/registeruser", registerUser);

/**
 * @swagger
 * /api/cregister/sendDefaultMail:
 *   post:
 *     tags: [Clients]
 *     summary: Send default mail to clients
 *     responses:
 *       200:
 *         description: Emails sent
 */


/**
 * @swagger
 * /api/cregister/resend-verification:
 *   post:
 *     tags: [Clients]
 *     summary: Resend verification email
 *     description: Resends the account verification email for unverified clients
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified or missing
 *       404:
 *         description: User not found
 */
router.post("/resend-verification", mailLimiter, resendVerificationEmail);

// Protected routes
router.post("/verify-client-otp", otpLimiter, verifyClientOtp);

router.use(validateToken);


/**
 * @swagger
 * /api/cregister/getdata/{c_id}:
 *   get:
 *     tags: [Clients]
 *     summary: Get client by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: c_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client details
 *       403:
 *         description: Forbidden - can only access own data
 */
router.get("/getdata/:c_id", checkOwnership("c_id", "c_id"), getbyid);

/**
 * @swagger
 * /api/cregister/update/{c_id}:
 *   put:
 *     tags: [Clients]
 *     summary: Update client profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: c_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client updated
 */
router.put("/update/:c_id", checkOwnership("c_id", "c_id"), updatedata);

/**
 * @swagger
 * /api/cregister/changepassword/{c_id}:
 *   put:
 *     tags: [Clients]
 *     summary: Change client password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: c_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.put("/changepassword/:c_id", checkOwnership("c_id", "c_id"), updatepassword);

module.exports = router;