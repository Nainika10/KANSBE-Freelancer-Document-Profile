const express = require("express");
const router = express.Router();
const { getskillbyid, getskills, getbyfl_idandskill_id, createskill, updateskill, deletedskill, syncSkills } = require("../controllers/skillController")
const validateToken = require("../middleware/validateTokenHandler");
const { checkOwnership } = require("../middleware/checkOwnership");

router.use(validateToken);

router.get("/getskills", getskills);

/**
 * @swagger
 * /api/skills/getskill/{fl_id}/{id}:
 *   get:
 *     tags: [Skills]
 *     summary: Get skill by freelancer and skill ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
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
 *         description: Skill details
 */
router.get("/getskill/:fl_id/:id", checkOwnership("fl_id", "fl_id"), getbyfl_idandskill_id);

/**
 * @swagger
 * /api/skills/createskill:
 *   post:
 *     tags: [Skills]
 *     summary: Create new skill
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Skill created
 */
router.post("/createskill", checkOwnership("fl_id", "fl_id"), createskill);
router.put("/sync/:fl_id", checkOwnership("fl_id", "fl_id"), syncSkills);
router.post("/sync/:fl_id", checkOwnership("fl_id", "fl_id"), syncSkills);


/**
 * @swagger
 * /api/skills/{fl_id}:
 *   get:
 *     tags: [Skills]
 *     summary: Get skills by freelancer ID
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
 *         description: Freelancer skills
 */
router.route("/:fl_id").get(checkOwnership("fl_id", "fl_id"), getskillbyid);

/**
 * @swagger
 * /api/skills/update/{fl_id}/{id}:
 *   put:
 *     tags: [Skills]
 *     summary: Update skill
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fl_id
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
 *         description: Skill updated
 */
router.put("/update/:fl_id/:id", checkOwnership("fl_id", "fl_id"), updateskill);

router.delete("/deleteskill/:fl_id/:id", checkOwnership("fl_id", "fl_id"), deletedskill);

module.exports = router;