const express = require("express");
const resumeMemoryUpload = require("../middleware/resumeMemoryUpload");
const { registerUser, verifyOtp, loginUser, googleSignup, googleLogin, currentUser, getbyid, getdetails, updatedata, deletedata, updateVerifiedEmail, forgotpassword, updatepassword, refreshToken, logoutUser, sendDefaultMail, saveResume, getResume, uploadCertificate, viewCertificate, deleteCertificate, uploadResume, deleteResume, resendVerificationEmail, getPortfolioUploadUrl, getPortfolioFileUrl, generateClientView, getOwnClientView, getClientView, getClientViewForProject } = require("../controllers/userController");
const router = express.Router();
const validateToken = require("../middleware/validateTokenHandler");
const upload = require("../middleware/upload");
const { checkOwnership, checkOwnershipOrAdmin } = require("../middleware/checkOwnership");
const mailLimiter = require("../Utility/mail_limit");
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 resume uploads per window
    message: { message: 'Too many resume uploads from this IP, please try again after 15 minutes' }
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 OTP verification attempts per window
    message: { message: 'Too many OTP attempts from this IP, please try again after 15 minutes' }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     FreelancerRegister:
 *       type: object
 *       required:
 *         - fullname
 *         - email
 *         - password
 *         - agree
 *       properties:
 *         fullname:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           example: john@example.com
 *         password:
 *           type: string
 *           example: password123
 *         contact:
 *           type: string
 *           example: 9876543210
 *         country:
 *           type: string
 *           example: India
 *         isStudent:
 *           type: boolean
 *           description: Whether the freelancer is currently a student
 *           example: true
 *         agree:
 *           type: boolean
 *           example: true
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: john@example.com
 *         password:
 *           type: string
 *           example: password123
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Freelancers]
 *     summary: Register a new freelancer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FreelancerRegister'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Freelancers]
 *     summary: Login freelancer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful, returns access token
 *       401:
 *         description: Invalid credentials or unverified email
 */
router.post("/login", loginUser);
router.post("/google-signup", googleSignup);
router.post("/google-login", googleLogin);

/**
 * @swagger
 * /api/users/refreshtoken:
 *   post:
 *     tags: [Freelancers]
 *     summary: Refresh access token
 *     description: Uses refresh token from cookie to generate new access token
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid or missing refresh token
 */
router.post("/refreshtoken", refreshToken);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     tags: [Freelancers]
 *     summary: Logout user
 *     description: Clears refresh token cookie
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", logoutUser);

/**
 * @swagger
 * /api/users/updateVerifiedEmail:
 *   get:
 *     tags: [Freelancers]
 *     summary: Verify email
 *     description: Verifies user email using token from email link
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token from email
 *     responses:
 *       302:
 *         description: Redirects to login page after verification
 *       401:
 *         description: Invalid or expired token
 */
router.get("/updateVerifiedEmail", updateVerifiedEmail);








/**
 * @swagger
 * /api/users/forgotpassword:
 *   put:
 *     tags: [Freelancers]
 *     summary: Reset password
 *     description: Sends new password to user email
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
 *         description: Password reset email sent
 *       400:
 *         description: Email not found
 */
router.put("/forgotpassword", mailLimiter, forgotpassword);

/**
 * @swagger
 * /api/users/sendDefaultMail:
 *   post:
 *     tags: [Freelancers]
 *     summary: Send default mail to all users
 *     responses:
 *       200:
 *         description: Emails sent successfully
 */


/**
 * @swagger
 * /api/users/resend-verification:
 *   post:
 *     tags: [Freelancers]
 *     summary: Resend verification email
 *     description: Resends the account verification email for unverified freelancers
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

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================
router.post("/verify-otp", otpLimiter, verifyOtp);

router.use(validateToken);

/**
 * @swagger
 * /api/users/current:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get current user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *       401:
 *         description: Unauthorized
 */
router.get("/current", currentUser);

/**
 * @swagger
 * /api/users/getdata/{fl_id}:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get freelancer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Freelancer ID
 *     responses:
 *       200:
 *         description: Freelancer details
 *       403:
 *         description: Forbidden - can only access own data
 */
router.get("/getdata/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), getbyid);

// ==========================================
// RESUME ROUTES (S3 Upload/Builder/Delete)
// ==========================================

/**
 * @swagger
 * /api/users/saveResume:
 *   post:
 *     tags: [Freelancers]
 *     summary: Generate and save freelancer resume (JSON → PDF → S3)
 *     description: Accepts resume data in JSON format, generates a PDF, uploads to S3, and stores metadata in database.
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fl_id
 *               - resumeData
 *             properties:
 *               fl_id:
 *                 type: string
 *                 example: "FL123"
 *               resumeData:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "Full Stack Developer"
 *                   summary:
 *                     type: string
 *                     example: "Experienced developer with strong backend and frontend skills."
 *                   skills:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Angular", "Node.js"]
 *                   experience:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         company:
 *                           type: string
 *                         degree:
 *                           type: string
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                         description:
 *                           type: string
 *                   education:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         degree:
 *                           type: string
 *                         institution:
 *                           type: string
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                   projects:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                   certificates:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         issuer:
 *                           type: string
 *                         year:
 *                           type: string
 *
 *     responses:
 *       200:
 *         description: Resume generated and saved successfully
 *       400:
 *         description: Missing or invalid resume data
 *       401:
 *         description: Unauthorized - must be logged in
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/saveResume", checkOwnershipOrAdmin("fl_id", "fl_id"), saveResume);

/**
 * @swagger
 * /api/users/getResume/{fl_id}:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get resume metadata for a freelancer
 *     description: Retrieves the resume S3 file metadata for the freelancer
 *
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume metadata retrieved successfully
 *       401:
 *         description: Unauthorized - must be logged in
 *
 *       404:
 *         description: User or resume not found
 *
 *       500:
 *         description: Internal server error
 */
router.get("/getResume/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), getResume);

/**
 * @swagger
 * /api/users/uploadResume/{fl_id}:
 *   post:
 *     tags: [Freelancers]
 *     summary: Upload a resume file to S3 and save metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 *       404:
 *         description: User not found
 */
router.post("/uploadResume/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), uploadLimiter, upload((req, file) => `resumes/${req.params.fl_id}`).single('file'), uploadResume);

/**
 * @swagger
 * /api/users/deleteResume/{fl_id}:
 *   delete:
 *     tags: [Freelancers]
 *     summary: Delete freelancer's resume from S3 and MongoDB
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume deleted successfully
 *       404:
 *         description: Resume not found
 */
router.delete("/deleteResume/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), deleteResume);

/**
 * @swagger
 * /api/users/updatedata/{fl_id}:
 *   put:
 *     tags: [Freelancers]
 *     summary: Update freelancer profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       403:
 *         description: Forbidden - can only update own data
 */
router.put("/updatedata/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), updatedata);

/**
 * @swagger
 * /api/users/portfolio-upload-url:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get S3 presigned URL for portfolio uploads
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Presigned URL returned
 */
router.get("/portfolio-upload-url", validateToken, getPortfolioUploadUrl);

/**
 * @swagger
 * /api/users/portfolio-file-url:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get S3 presigned view URL for a portfolio asset
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Presigned view URL returned
 *       400:
 *         description: Missing key or url
 */
router.get("/portfolio-file-url", validateToken, getPortfolioFileUrl);

/**
 * @swagger
 * /api/users/changepassword/{fl_id}:
 *   put:
 *     tags: [Freelancers]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currpassword:
 *                 type: string
 *               updatedpassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Current password doesn't match
 */
router.put("/changepassword/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), updatepassword);

// ==========================================
// CERTIFICATE ROUTES (S3 Upload/View/Delete)
// ==========================================

/**
 * @swagger
 * /api/users/uploadCertificate/{fl_id}:
 *   post:
 *     tags: [Freelancers]
 *     summary: Upload a certificate file to S3 and save metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               issuer:
 *                 type: string
 *               date:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certificate uploaded successfully
 *       404:
 *         description: User not found
 */
router.post("/uploadCertificate/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), upload((req, file) => `certificates/${req.params.fl_id}`).single('file'), uploadCertificate);

/**
 * @swagger
 * /api/users/viewCertificate/{fl_id}/{index}:
 *   get:
 *     tags: [Freelancers]
 *     summary: Get a presigned URL to view/download a certificate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Presigned URL returned
 *       404:
 *         description: Certificate not found
 */
router.get("/viewCertificate/:fl_id/:index", checkOwnershipOrAdmin("fl_id", "fl_id"), viewCertificate);

/**
 * @swagger
 * /api/users/deleteCertificate/{fl_id}/{index}:
 *   delete:
 *     tags: [Freelancers]
 *     summary: Delete a certificate from S3 and database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Certificate deleted successfully
 *       404:
 *         description: Certificate not found
 */
router.delete("/deleteCertificate/:fl_id/:index", checkOwnershipOrAdmin("fl_id", "fl_id"), deleteCertificate);



// Client View (privacy-safe resume profile)
router.post("/generateClientView/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), uploadLimiter, resumeMemoryUpload.single("file"), generateClientView);
router.get("/clientview/:fl_id", checkOwnershipOrAdmin("fl_id", "fl_id"), getOwnClientView);
router.get("/clientview/public/:fl_id", getClientView);
router.get("/clientview/project/:p_id/freelancer/:fl_id", getClientViewForProject);

module.exports = router;