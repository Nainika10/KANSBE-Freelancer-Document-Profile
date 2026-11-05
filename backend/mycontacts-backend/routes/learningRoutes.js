const express = require("express");
const router = express.Router();
const validateToken = require("../middleware/validateTokenHandler");

const {
    getCourses,
    getRecommendedCourses,
    getCourseById,
    getLessonsByCourse,
    getLessonById,
    getCourseProgress,
    markLessonComplete
} = require("../controllers/learningController");

// All freelancer learning routes must be protected
router.use(validateToken);

// Recommendation route (must be before /courses/:id)
router.get("/recommended", getRecommendedCourses);

// Course routes
router.get("/courses", getCourses);
router.get("/courses/:id", getCourseById);
router.get("/courses/:courseId/lessons", getLessonsByCourse);

// Lesson routes
router.get("/lessons/:id", getLessonById);

// Progress routes
router.get("/progress/:courseId", getCourseProgress);
router.post("/progress", markLessonComplete);

module.exports = router;
