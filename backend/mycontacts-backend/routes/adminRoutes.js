const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');

// Controller imports for consolidated admin routes
const { getdetails: getAllFreelancers } = require('../controllers/userController');
const { getdata: getAllClients } = require('../controllers/cregisterController');
const { getdata: getAllFreelancerBankDetails } = require('../controllers/fbankController');
const { getProjects: getPendingProjects, getAllProjects: getProjectCount, deletecproject: deleteProject, addTask: addTask, deleteTask: deleteProjectTask, availableprojects, getAllProjectsAdmin, getprojectfile } = require('../controllers/cprojectController');
const { deletedata: deleteClient } = require('../controllers/cregisterController');
const { deletedata: deleteFreelancerData } = require('../controllers/userController');
const { getskills: getAllSkills } = require('../controllers/skillController');

const { validateAdminToken, authorizeAdminRoles } = require('../middleware/validateAdminToken');
const validateToken = require('../middleware/validateTokenHandler');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: admin@kansbe.com
 *         password:
 *           type: string
 *           example: adminpass123
 *     CreateManager:
 *       type: object
 *       required:
 *         - usr_name
 *         - email
 *         - password
 *       properties:
 *         usr_name:
 *           type: string
 *           example: John Manager
 *         email:
 *           type: string
 *           example: manager@kansbe.com
 *         password:
 *           type: string
 *           example: managerpass123
 *         phone:
 *           type: string
 *           example: 9876543210
 *         department:
 *           type: string
 *           example: Operations
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
 *     description: Login with admin credentials to get admin access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminLogin'
 *     responses:
 *       200:
 *         description: Login successful, returns admin access token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

const mailLimiter = require('../Utility/mail_limit');

/**
 * @swagger
 * /api/admin/forgotpassword:
 *   put:
 *     summary: Reset admin password
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password Recovery email sent successfully
 *       400:
 *         description: Email Not Found
 */
router.put('/forgotpassword', mailLimiter, forgotpassword);

/**
 * @swagger
 * /api/admin/refreshtoken:
 *   post:
 *     tags: [Admin]
 *     summary: Refresh admin access token
 *     description: Uses admin refresh token from cookie
 *     responses:
 *       200:
 *         description: New admin access token generated
 *       401:
 *         description: Invalid or missing refresh token
 */
router.post('/refreshtoken', adminRefreshToken);

// ==========================================
// AUTHENTICATED ROUTES — Requires Valid Token
// Accessible to authenticated users and managers
// ==========================================
router.get('/manager-info/:usr_id', validateToken, getManagerById);
router.get('/portfolio-file-url', validateToken, getPortfolioFileUrl);

// Protected routes - require admin authentication
router.use(validateAdminToken);
router.use(authorizeAdminRoles("admin", "manager"));

/**
 * @swagger
 * /api/admin/getmanagers:
 *   get:
 *     tags: [Admin]
 *     summary: Get all managers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all managers
 *       401:
 *         description: Unauthorized - requires admin token
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/getmanagers', getManagers);
router.get('/user-activity', getUserActivitySummary);
router.get('/user-activity/daily-summary', getUserDailyActivitySummary);
router.get('/user-activity/timeline/:userId?', getUserActivityTimelineReport);

/**
 * @swagger
 * /api/admin/changepassword/{usr_id}:
 *   put:
 *     tags: [Admin]
 *     summary: Change admin/manager password
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Incorrect password or missing fields
 */
router.put('/changepassword/:usr_id', changePassword);



// ==========================================
// CONSOLIDATED ADMIN DATA ENDPOINTS
// ==========================================

/**
 * @swagger
 * /api/admin/freelancers:
 *   get:
 *     tags: [Admin]
 *     summary: Get all freelancers (Active Users)
 *     description: Fetches all users with status "Active". Originally /api/users/getdata.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active freelancers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get('/freelancers', getAllFreelancers);

/**
 * @swagger
 * /api/admin/clients:
 *   get:
 *     tags: [Admin]
 *     summary: Get all clients
 *     description: Fetches all registered clients. Originally /api/cregister/getdata.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of clients
 *       403:
 *         description: Forbidden
 */
router.get('/clients', getAllClients);




/**
 * @swagger
 * /api/admin/freelancer-bank-details:
 *   get:
 *     tags: [Admin]
 *     summary: Get all freelancer bank details
 *     description: Fetches bank details for all freelancers. Originally /api/fbank/getdata.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bank details
 *       403:
 *         description: Forbidden
 */
router.get('/freelancer-bank-details', getAllFreelancerBankDetails);

/**
 * @swagger
 * /api/admin/projects/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Get pending projects
 *     description: Fetches projects waiting for approval. Originally /api/cproject/getproject.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending projects
 *       403:
 *         description: Forbidden
 */
router.get('/projects/pending', getPendingProjects);
router.get('/getprojectfile/:p_id', getprojectfile);

/**
 * @swagger
 * /api/admin/projects/available:
 *   get:
 *     tags: [Admin]
 *     summary: Get available projects
 *     description: Fetches projects with status 'available' or 'assigned'. Originally /api/cproject/availableprojects.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available projects
 *       403:
 *         description: Forbidden
 */
router.get('/projects/available', availableprojects);

/**
 * @swagger
 * /api/admin/projects/count:
 *   get:
 *     tags: [Admin]
 *     summary: Get all projects count
 *     description: Fetches count of all projects. Originally /api/cproject/getallprojects.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total project count
 *       403:
 *         description: Forbidden
 */
router.get('/projects/count', getProjectCount);

/**
 * @swagger
 * /api/admin/projects/all:
 *   get:
 *     tags: [Admin]
 *     summary: Get all projects with Server-Side Pagination & Filtering
 *     description: Unified reporting endpoint for Total Projects component handling searching and matching.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated projects list
 *       403:
 *         description: Forbidden
 */
router.get('/projects/all', getAllProjectsAdmin);



/**
 * @swagger
 * /api/admin/skills:
 *   get:
 *     tags: [Admin]
 *     summary: Get all skills
 *     description: Fetches all skills. Originally /api/skills/getskills.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of skills
 *       403:
 *         description: Forbidden
 */
router.get('/skills', getAllSkills);

// Manager availability & workload routes
router.get('/manager-workloads', getManagerWorkloadSummary);
router.put('/manager-status/:usr_id', authorizeAdminRoles('admin'), updateManagerStatus);

/**
 * @swagger
 * /api/admin/createmanger:
 *   post:
 *     tags: [Admin]
 *     summary: Create new manager
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateManager'
 *     responses:
 *       201:
 *         description: Manager created successfully
 *       400:
 *         description: Email already exists or validation error
 */
router.post('/createmanger', createManager);

/**
 * @swagger
 * /api/admin/{manager_id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update manager
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manager_id
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
 *               usr_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Manager updated
 *       404:
 *         description: Manager not found
 */
router.put('/:manager_id', updateManager);

/**
 * @swagger
 * /api/admin/{manager_id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete manager
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manager_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manager deleted
 *       404:
 *         description: Manager not found
 */
router.delete('/:manager_id', deleteManager);



/**
 * @swagger
 * /api/admin/add-task:
 *   post:
 *     tags: [Admin]
 *     summary: Add a task to a project (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddTask'
 *     responses:
 *       201:
 *         description: Task added successfully
 *       400:
 *         description: Bad request or validation error
 */
router.post('/:p_id/add-task', authorizeAdminRoles('admin', 'manager'), addTask);

/**
 * @swagger
 * /api/admin/clients/{c_id}:
 *   delete:
 *     summary: Delete a client account (Admin Only)
 *     tags: [Admin]
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
 *         description: Client deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/clients/:c_id', authorizeAdminRoles('admin'), deleteClient);




/**
 * @swagger
 * /api/admin/projects/{p_id}:
 *   delete:
 *     summary: Delete a project (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: p_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/projects/:p_id', authorizeAdminRoles(['admin', 'manager']), deleteProject);

/**
 * @swagger
 * /api/admin/projects/{p_id}/tasks/{taskId}:
 *   delete:
 *     summary: Delete a project task (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: p_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/projects/:p_id/tasks/:taskId', authorizeAdminRoles(['admin', 'manager']), deleteProjectTask);


/**
 * @swagger
 * /api/admin/send-bulk-email:
 *   post:
 *     summary: Send bulk emails to freelancers, clients, or both (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - audience
 *               - subject
 *               - message
 *             properties:
 *               audience:
 *                 type: string
 *                 enum: [freelancers, clients, both]
 *                 description: Target audience for the email
 *               verified:
 *                 type: boolean
 *                 description: Include verified accounts
 *               notVerified:
 *                 type: boolean
 *                 description: Include unverified accounts
 *               selectedFreelancerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific freelancer IDs to send to (optional)
 *               selectedClientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific client IDs to send to (optional)
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               message:
 *                 type: string
 *                 description: Email body content
 *               buttons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     url:
 *                       type: string
 *                 description: Optional call-to-action buttons
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Invalid input parameters
 *       404:
 *         description: No users found for the selected filters
 *       500:
 *         description: Server error sending bulk emails
 */
router.post("/send-bulk-email", validateAdminToken, authorizeAdminRoles('admin', 'manager'), sendBulkEmail);

/**
 * @swagger
 * /api/admin/email/freelancers:
 *   get:
 *     summary: Get a lightweight list of all freelancers for email targeting (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of freelancers
 *       500:
 *         description: Error fetching freelancers
 */
router.get("/email/freelancers", validateAdminToken, authorizeAdminRoles('admin', 'manager'), getEmailFreelancers);

/**
 * @swagger
 * /api/admin/email/clients:
 *   get:
 *     summary: Get a lightweight list of all clients for email targeting (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of clients
 *       500:
 *         description: Error fetching clients
 */
router.get("/email/clients", validateAdminToken, authorizeAdminRoles('admin', 'manager'), getEmailClients);

/**
 * @swagger
 * /api/admin/freelancers/{fl_id}:
 *   delete:
 *     summary: Delete a freelancer account (Admin Only)
 *     tags: [Admin]
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
 *         description: Freelancer deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/freelancers/:fl_id', authorizeAdminRoles('admin'), deleteFreelancerData);

/**
 * @swagger
 * /api/admin/admin/logout:
 *   post:
 *     tags: [Admin]
 *     summary: Admin logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/admin/logout', adminLogout);

/**
 * @swagger
 * /api/admin/{manager_id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get manager by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manager_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Manager ID
 *     responses:
 *       200:
 *         description: Manager details
 *       404:
 *         description: Manager not found
 */
router.get('/:manager_id', getManagerById);


module.exports = router;