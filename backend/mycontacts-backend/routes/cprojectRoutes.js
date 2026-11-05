const express = require("express");
const router = express.Router();
const { getTaskUploadUrl, getTaskMediaUrl, getMatchedFreelancers, getProjects, getAllProjects, getAssingedProjects, getOngoingProjects, availableprojects, assignedfreelancers, getprojectbyid, getprojectbyfid, createProject, reviewProject, assignProject, updateProject, deletecproject, generateId, getprojectbycid, getprojectfile, addTask, getTasks, updateTask, updateTaskStatus, deleteTask, updateProjectStatus, getapprovedprojects, getFileVersions, getFileVersionUrl, submitFreelancerFeedback } = require("../controllers/cprojectController");
const validateToken = require("../middleware/validateTokenHandler");
const upload = require("../middleware/upload");
const { checkOwnership, checkAdmin, checkOwnershipOrAdmin } = require("../middleware/checkOwnership");

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         p_id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         budget:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, ongoing, completed]
 */

router.use(validateToken);




/**
 * @swagger
 * /api/cproject/assignedprojects:
 *   get:
 *     tags: [Projects]
 *     summary: Get assigned projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned projects
 */
router.get("/assignedprojects", getAssingedProjects);

/**
 * @swagger
 * /api/cproject/ongoingprojects:
 *   get:
 *     tags: [Projects]
 *     summary: Get ongoing projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ongoing projects
 */
router.get("/ongoingprojects", getOngoingProjects);

/**
 * @swagger
 * /api/cproject/assignedfreelancer/{assignedto}:
 *   get:
 *     tags: [Projects]
 *     summary: Get freelancers assigned to project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignedto
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assigned freelancers
 */
router.get("/assignedfreelancer/:assignedto", assignedfreelancers);

/**
 * @swagger
 * /api/cproject/getproject/{p_id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
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
 *         description: Project details
 */
router.get("/getproject/:p_id", getprojectbyid);

/**
 * @swagger
 * /api/cproject/getprojectt/{f_id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get projects by freelancer ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: f_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancer's projects
 */
router.get("/getprojectt/:f_id", checkOwnershipOrAdmin("f_id", "fl_id"), getprojectbyfid);

/**
 * @swagger
 * /api/cproject/getprojectbycid/{c_id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get projects by client ID
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
 *         description: Client's projects
 */
router.get("/getprojectbycid/:c_id", checkOwnership("c_id", "c_id"), getprojectbycid);

/**
 * @swagger
 * /api/cproject/getapprovedprojects/{c_id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get approved projects by client
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
 *         description: Approved projects
 */
router.get("/getapprovedprojects/:c_id", checkOwnership("c_id", "c_id"), getapprovedprojects);

/**
 * @swagger
 * /api/cproject/getprojectfile/{p_id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project file
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
 *         description: Project file
 */
router.get("/getprojectfile/:p_id", getprojectfile);

/**
 * @swagger
 * /api/cproject/{p_id}/file-versions:
 *   get:
 *     tags: [Projects]
 *     summary: Get file version history for a project
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
 *         description: Current file and version history
 */
router.get("/:p_id/file-versions", getFileVersions);

/**
 * @swagger
 * /api/cproject/{p_id}/file-versions/{versionIndex}/download:
 *   get:
 *     tags: [Projects]
 *     summary: Get signed download URL for a specific file version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: p_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Signed S3 download URL for the file version
 */
router.get("/:p_id/file-versions/:versionIndex/download", getFileVersionUrl);

// [REMOVED] getwaitingfreelancers route

/**
 * @swagger
 * /api/cproject/createproject:
 *   post:
 *     tags: [Projects]
 *     summary: Create new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               filedata:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Project created
 */
router.post("/createproject", async (req, res, next) => {
    try {
        req.generated_p_id = await generateId();
        next();
    } catch (err) {
        next(err);
    }
}, upload((req, file) => `projects/${req.generated_p_id}/requirements`).single("filedata"), createProject);

/**
 * @swagger
 * /api/cproject/{p_id}/review:
 *   put:
 *     tags: [Projects]
 *     summary: Review project (admin)
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
 *         description: Project reviewed
 */
router.put("/:p_id/review", checkAdmin(), reviewProject);

/**
 * @swagger
 * /api/cproject/{p_id}/assign:
 *   put:
 *     tags: [Projects]
 *     summary: Assign project to freelancer
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
 *         description: Project assigned
 */
router.put("/:p_id/assign", checkAdmin(), assignProject);

// [REMOVED] response route

/**
 * @swagger
 * /api/cproject/update/{p_id}:
 *   put:
 *     tags: [Projects]
 *     summary: Update project
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
 *         description: Project updated
 */
router.put("/update/:p_id", upload((req, file) => `projects/${req.params.p_id}/requirements`).single("filedata"), updateProject);

// [REMOVED] update-decision route
router.delete("/delete/:p_id", checkAdmin(), deletecproject);
// --- Task Routes ---
/**
 * @swagger
 * /api/cproject/{p_id}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks of a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: p_id
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/:p_id/tasks", getTasks);

/**
 * @swagger
 * /api/cproject/{p_id}/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Add task to project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: p_id
 *         required: true
 *         schema:
 *           type: string
 */
router.post("/:p_id/tasks", checkAdmin(), addTask); // Only admin for now, can be refined to manager later

/**
 * @swagger
 * /api/cproject/{p_id}/tasks/{taskId}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task details
 *     security:
 *       - bearerAuth: []
 */
router.put("/:p_id/tasks/:taskId", checkAdmin(), updateTask);

/**
 * @swagger
 * /api/cproject/{p_id}/tasks/{taskId}/status:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task status
 *     security:
 *       - bearerAuth: []
 */
router.put("/:p_id/tasks/:taskId/status", updateTaskStatus);
router.get("/:p_id/tasks/:taskId/upload-url", getTaskUploadUrl);
router.get("/:p_id/tasks/:taskId/media-url", getTaskMediaUrl);

/**
 * @swagger
 * /api/cproject/{p_id}/tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:p_id/tasks/:taskId", checkAdmin(), deleteTask);






router.put("/:p_id/update-status", updateProjectStatus);
router.put("/:p_id/freelancer-feedback", submitFreelancerFeedback);


/**
 * @swagger
 * /api/cproject/{p_id}/matched-freelancers:
 *   get:
 *     tags: [Projects]
 *     summary: Get ranked matching freelancers for project or breakdown roles
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
 *         description: Matching candidate list
 *       404:
 *         description: Project not found
 */
router.get("/:p_id/matched-freelancers", checkAdmin(), getMatchedFreelancers);

module.exports = router;
