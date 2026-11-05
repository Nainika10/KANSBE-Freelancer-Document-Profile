const express = require("express");
const router = express.Router();
const { getdata, getbyid, postdata, updatedata, deletedata } = require("../controllers/bankController");
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership } = require("../middleware/checkOwnership");

/**
 * @swagger
 * components:
 *   schemas:
 *     ClientBankDetails:
 *       type: object
 *       properties:
 *         c_id:
 *           type: string
 *         bank_name:
 *           type: string
 *         account_number:
 *           type: string
 *         ifsc_code:
 *           type: string
 */

router.use(validateToken);

/**
 * @swagger
 * /api/bank/getdata/{c_id}:
 *   get:
 *     tags: [Client Bank]
 *     summary: Get bank details by client ID
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
 *         description: Bank details
 */
router.get("/getdata/:c_id", checkOwnership("c_id", "c_id"), getbyid);

/**
 * @swagger
 * /api/bank/postdata:
 *   post:
 *     tags: [Client Bank]
 *     summary: Add client bank details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientBankDetails'
 *     responses:
 *       201:
 *         description: Bank details added
 */
router.post("/postdata", checkOwnership("c_id", "c_id"), postdata);

/**
 * @swagger
 * /api/bank/update/{c_id}:
 *   put:
 *     tags: [Client Bank]
 *     summary: Update client bank details
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
 *         description: Bank details updated
 */
router.put("/update/:c_id", checkOwnership("c_id", "c_id"), updatedata);



module.exports = router;