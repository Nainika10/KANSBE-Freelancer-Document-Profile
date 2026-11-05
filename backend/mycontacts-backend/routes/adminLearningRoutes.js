const express = require("express");
const router = express.Router();
const { validateAdminToken, authorizeAdminRoles } = require("../middleware/validateAdminToken");

const {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
    getLearningProgress
} = require("../controllers/adminLearningController");

// All admin learning routes must be protected
router.use(validateAdminToken);
router.use(authorizeAdminRoles('admin', 'manager'));

// Course routes
router.route("/courses")
    .get(getCourses)
    .post(createCourse);

router.route("/courses/:id")
    .get(getCourseById)
    .put(updateCourse)
    .delete(deleteCourse);

// Module routes
router.route("/modules")
    .post(createModule);

router.route("/modules/:id")
    .put(updateModule)
    .delete(deleteModule);

// Lesson routes
router.route("/lessons")
    .post(createLesson);

router.route("/lessons/:id")
    .put(updateLesson)
    .delete(deleteLesson);

// Progress routes
router.get("/progress", getLearningProgress);

module.exports = router;
