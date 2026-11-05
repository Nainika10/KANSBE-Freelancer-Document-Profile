const express = require('express');
const router = express.Router();
const { getChatHistory, createtext, markChatAsRead } = require('../controllers/chatController');
const validateToken = require("../middleware/validateTokenHandler");

router.use(validateToken);

// ... existing swagger ...
router.get('/:projectId', getChatHistory);

router.post('/newchat', createtext);

/**
 * @swagger
 * /api/chat/mark-read:
 *   post:
 *     tags: [Chat]
 *     summary: Mark all messages in a project as read for a user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat marked as read
 */
router.post('/mark-read', markChatAsRead);

module.exports = router;