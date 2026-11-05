const express = require("express");
const router = express.Router();
const { createNotification, getclientnotification, markasread, deleteNotification } = require("../controllers/client_notificationsController");
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership } = require("../middleware/checkOwnership");

router.use(validateToken);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Client Notifications]
 *     summary: Create notification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Notification created
 */
router.post("/", createNotification);

/**
 * @swagger
 * /api/notifications/{c_id}:
 *   get:
 *     tags: [Client Notifications]
 *     summary: Get client notifications
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
 *         description: Notifications list
 *   put:
 *     tags: [Client Notifications]
 *     summary: Mark notification as read
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
 *         description: Marked as read
 *   delete:
 *     tags: [Client Notifications]
 *     summary: Delete notification
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
 *         description: Notification deleted
 */
router.get("/:c_id", checkOwnership("c_id", "c_id"), getclientnotification);
router.put("/:c_id", checkOwnership("c_id", "c_id"), markasread);
router.delete("/:c_id", checkOwnership("c_id", "c_id"), deleteNotification);

module.exports = router;