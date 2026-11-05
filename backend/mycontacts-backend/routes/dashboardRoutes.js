const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateTokenHandler');
const { checkOwnership } = require('../middleware/checkOwnership');
const { getFreelancerDashboard, getClientDashboard } = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(validateToken);

/**
 * @swagger
 * /api/dashboard/freelancer/{fl_id}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get aggregated freelancer dashboard data
 *     description: Returns user profile, skills, notifications, profile completion, filtered news, and platform stats in a single response.
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
 *         description: Complete dashboard data
 *       404:
 *         description: Freelancer not found
 */
router.get('/freelancer/:fl_id', checkOwnership('fl_id', 'fl_id'), getFreelancerDashboard);

/**
 * @swagger
 * /api/dashboard/client/{c_id}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get aggregated client dashboard data
 *     description: Returns client profile, projects, notifications, profile completion, and suggested actions in a single response.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: c_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Complete dashboard data
 *       404:
 *         description: Client not found
 */
router.get('/client/:c_id', checkOwnership('c_id', 'c_id'), getClientDashboard);

module.exports = router;
