const express = require("express");
const router = express.Router();
const { healthcheck } = require("../controllers/healthController");

/**
 * @swagger
 * /api/health/healthcheck:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Returns server health status
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 */
router.get("/healthcheck", healthcheck);

module.exports = router;