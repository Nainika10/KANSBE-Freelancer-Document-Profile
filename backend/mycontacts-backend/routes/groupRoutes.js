const express = require('express');
const router = express.Router();
const { createGroup, getGroupbyMember, updatememberdecision, deletemember, updategroup, getbydecisionaccepted, getProjectsWithAcceptedMembersByClient, getAcceptedMembersByProject, getProjectTeamMembers, getPendingApprovalProjectsByClient } = require('../controllers/groupController');
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership, checkAdmin, checkOwnershipOrAdmin } = require("../middleware/checkOwnership");

router.use(validateToken);

/**
 * @swagger
 * /api/groups/pending-approvals/{c_id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get projects with pending approvals for client
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
 *         description: List of p_ids with waiting counts
 */
router.get("/pending-approvals/:c_id", checkOwnership("c_id", "c_id"), getPendingApprovalProjectsByClient);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create new group
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Group created
 */
router.post('/', checkAdmin(), createGroup);

/**
 * @swagger
 * /api/groups/getmember/{member}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group by member
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: member
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details
 */
router.get('/getmember/:member', checkOwnershipOrAdmin("member", "fl_id"), getGroupbyMember);

/**
 * @swagger
 * /api/groups/accepted/{p_id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get accepted decisions by project
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
 *         description: Accepted members
 */
router.get('/accepted/:p_id', getbydecisionaccepted);

/**
 * @swagger
 * /api/groups/{p_id}/accepted-members:
 *   get:
 *     tags: [Groups]
 *     summary: Get accepted members by project
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
 *         description: Accepted members list
 */
router.get("/:p_id/accepted-members", getAcceptedMembersByProject);

/**
 * @swagger
 * /api/groups/accepted-projects/{c_id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get projects with accepted members by client
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
 *         description: Projects list
 */
router.get("/accepted-projects/:c_id", checkOwnership("c_id", "c_id"), getProjectsWithAcceptedMembersByClient);

/**
 * @swagger
 * /api/groups/updategroup:
 *   put:
 *     tags: [Groups]
 *     summary: Update group
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Group updated
 */
router.put('/updategroup', checkAdmin(), updategroup);

/**
 * @swagger
 * /api/groups/decision:
 *   put:
 *     tags: [Groups]
 *     summary: Update member decision
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Decision updated
 */
router.put('/decision', updatememberdecision);

/**
 * @swagger
 * /api/groups/team-members/{p_id}:
 *   get:
 *     tags: [Groups]
 *     summary: Get project team members (Manager + Accepted Freelancers)
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
 *         description: Team members list
 */
router.get("/team-members/:p_id", getProjectTeamMembers);



module.exports = router;