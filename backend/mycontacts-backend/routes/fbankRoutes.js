const express = require("express");
const router = express.Router();
const { getdata, getbyid, postdata, updatedata, deletedata } = require("../controllers/fbankController");
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership } = require("../middleware/checkOwnership");

/**
 * @swagger
 * components:
 *   schemas:
 *     FreelancerBankDetails:
 *       type: object
 *       properties:
 *         fl_id:
 *           type: string
 *         bank_name:
 *           type: string
 *         account_number:
 *           type: string
 *         ifsc_code:
 *           type: string
 *         account_holder:
 *           type: string
 */

router.use(validateToken);


/**
 * @swagger
 * /api/fbank/getdata/{fl_id}:
 *   get:
 *     tags: [Freelancer Bank]
 *     summary: Get bank details by freelancer ID
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
 *         description: Bank details
 *       403:
 *         description: Can only access own bank details
 */
router.get("/getdata/:fl_id", checkOwnership("fl_id", "fl_id"), getbyid);

/**
 * @swagger
 * /api/fbank/postdata:
 *   post:
 *     tags: [Freelancer Bank]
 *     summary: Add bank details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FreelancerBankDetails'
 *     responses:
 *       201:
 *         description: Bank details added
 */
router.post("/postdata", checkOwnership("fl_id", "fl_id"), postdata);

/**
 * @swagger
 * /api/fbank/update/{fl_id}:
 *   put:
 *     tags: [Freelancer Bank]
 *     summary: Update bank details
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
 *         description: Bank details updated
 */
router.put("/update/:fl_id", checkOwnership("fl_id", "fl_id"), updatedata);



module.exports = router;