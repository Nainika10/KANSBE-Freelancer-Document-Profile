const express = require("express");
const router = express.Router();
const { createNotification, sendnotificationtoeveryone, sendNotificationToCl, sendNotificationToFll, sendNotificationToFl, getnotification, getMessageByUserAndMsgId, getbytype, markasread, markasallread, deleteNotification } = require("../controllers/freelancer_notificationController");
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership, checkNotificationOwnership } = require("../middleware/checkOwnership");

router.use(validateToken);

/**
 * @swagger
 * /api/fnotifications/{usr_id}:
 *   get:
 *     tags: [Freelancer Notifications]
 *     summary: Get notifications by user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usr_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get("/:usr_id", checkNotificationOwnership("usr_id"), getnotification);

/**
 * @swagger
 * /api/fnotifications/{usr_id}/{id}:
 *   get:
 *     tags: [Freelancer Notifications]
 *     summary: Get specific notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usr_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification details
 */
router.get("/:usr_id/:id", checkNotificationOwnership("usr_id"), getMessageByUserAndMsgId);

/**
 * @swagger
 * /api/fnotifications/read/{usr_id}/{id}:
 *   put:
 *     tags: [Freelancer Notifications]
 *     summary: Mark notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usr_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put("/read/:usr_id/:id", checkNotificationOwnership("usr_id"), markasread);

/**
 * @swagger
 * /api/fnotifications/readall/{usr_id}:
 *   put:
 *     tags: [Freelancer Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usr_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.put("/readall/:usr_id", checkNotificationOwnership("usr_id"), markasallread);

/**
 * @swagger
 * /api/fnotifications/{usr_id}/{id}:
 *   delete:
 *     tags: [Freelancer Notifications]
 *     summary: Delete notification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usr_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete("/:usr_id/:id", checkNotificationOwnership("usr_id"), deleteNotification);

module.exports = router;