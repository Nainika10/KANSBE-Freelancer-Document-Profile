const asyncHandler = require("express-async-handler");
const LearningCourse = require("../models/learningCourseModel");
const LearningModule = require("../models/learningModuleModel");
const LearningLesson = require("../models/learningLessonModel");
const LearningProgress = require("../models/learningProgressModel");
const Skill = require("../models/skillModel");

// @desc    Get all published courses
// @route   GET /api/learning/courses
// @access  Private (Freelancer)
const getCourses = asyncHandler(async (req, res) => {
    const courses = await LearningCourse.find({ isPublished: true }).sort({ createdAt: -1 });

    // Get lesson counts and module counts for each course
    const coursesWithCounts = await Promise.all(courses.map(async (course) => {
        const moduleCount = await LearningModule.countDocuments({ courseId: course._id });
        const lessonCount = await LearningLesson.countDocuments({ courseId: course._id });

        // Get progress for this freelancer if exists
        let progress = null;
        if (req.user && req.user.fl_id) {
            progress = await LearningProgress.findOne({
                freelancerId: req.user.fl_id,
                courseId: course._id
            });
        }

        return {
            ...course.toObject(),
            moduleCount,
            lessonCount,
            progress: progress ? {
                progressPercentage: progress.progressPercentage,
                completed: progress.completed,
                completedLessons: progress.completedLessons.length
            } : null
        };
    }));

    res.status(200).json(coursesWithCounts);
});

// @desc    Get skill-based recommended courses for a freelancer
// @route   GET /api/learning/recommended
// @access  Private (Freelancer)
const getRecommendedCourses = asyncHandler(async (req, res) => {
    const freelancerId = req.user.fl_id;

    if (!freelancerId) {
        res.status(401);
        throw new Error("Unauthorized: Freelancer ID not found in token");
    }

    // 1. Fetch freelancer's skills
    const skillDoc = await Skill.findOne({ fl_id: freelancerId });
    const skills = (skillDoc && skillDoc.skills) ? skillDoc.skills : [];

    // 2. Fetch all published courses
    const courses = await LearningCourse.find({ isPublished: true }).sort({ createdAt: -1 });

    // 3. Fetch progress for all courses to identify unstarted ones
    const progressRecords = await LearningProgress.find({ freelancerId });
    const progressMap = {};
    progressRecords.forEach(p => {
        progressMap[p.courseId.toString()] = p;
    });

    // 4. Get lesson counts for all courses
    const lessonCounts = {};
    await Promise.all(courses.map(async (course) => {
        lessonCounts[course._id.toString()] = await LearningLesson.countDocuments({ courseId: course._id });
    }));

    // 5. Score each course against skills
    const scoredCourses = courses.map(course => {
        const courseObj = course.toObject();
        const courseId = course._id.toString();
        const progress = progressMap[courseId] || null;

        // Determine course status
        let status = 'not_started';
        if (progress) {
            if (progress.completed) {
                status = 'completed';
            } else if (progress.progressPercentage > 0) {
                status = 'in_progress';
            }
        }

        // Score calculation
        let score = 0;
        const matchedSkills = [];

        if (skills.length > 0 && status === 'not_started') {
            for (const s of skills) {
                const skillName = s.skill.toLowerCase().trim();
                const category = (courseObj.category || '').toLowerCase();
                const title = (courseObj.title || '').toLowerCase();
                const desc = (courseObj.description || '').toLowerCase();
                const tags = (courseObj.tags || []).map(t => t.toLowerCase());

                let matched = false;

                // Category match (strongest signal) — 10 points
                if (category.includes(skillName) || skillName.includes(category)) {
                    score += 10;
                    matched = true;
                }

                // Tag match — 8 points
                if (tags.some(tag => tag.includes(skillName) || skillName.includes(tag))) {
                    score += 8;
                    matched = true;
                }

                // Title match — 5 points
                if (title.includes(skillName)) {
                    score += 5;
                    matched = true;
                }

                // Description match — 2 points
                if (desc.includes(skillName)) {
                    score += 2;
                    matched = true;
                }

                // Level alignment bonus — 3 points
                if (matched && courseObj.level === s.status) {
                    score += 3;
                }

                if (matched) {
                    matchedSkills.push(s.skill);
                }
            }
        }

        return {
            ...courseObj,
            lessonCount: lessonCounts[courseId] || 0,
            progress: progress ? {
                progressPercentage: progress.progressPercentage,
                completed: progress.completed,
                completedLessons: progress.completedLessons.length
            } : null,
            status,
            relevanceScore: score,
            matchedSkills: [...new Set(matchedSkills)] // deduplicate
        };
    });

    // 6. Separate into categories
    const recommended = scoredCourses
        .filter(c => c.status === 'not_started' && c.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const otherCourses = scoredCourses
        .filter(c => c.status === 'not_started' && c.relevanceScore === 0);

    const inProgress = scoredCourses
        .filter(c => c.status === 'in_progress')
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const completed = scoredCourses
        .filter(c => c.status === 'completed');

    res.status(200).json({
        hasSkills: skills.length > 0,
        skillCount: skills.length,
        recommended,
        otherCourses,
        inProgress,
        completed,
        totalCourses: courses.length
    });
});

// @desc    Get single course by ID (published only)
// @route   GET /api/learning/courses/:id
// @access  Private (Freelancer)
const getCourseById = asyncHandler(async (req, res) => {
    const course = await LearningCourse.findOne({
        _id: req.params.id,
        isPublished: true
    });

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Get modules with their lessons
    const modules = await LearningModule.find({ courseId: course._id }).sort({ order: 1 });
    const lessons = await LearningLesson.find({ courseId: course._id }).sort({ order: 1 });

    // Get progress for this freelancer
    let progress = null;
    if (req.user && req.user.fl_id) {
        progress = await LearningProgress.findOne({
            freelancerId: req.user.fl_id,
            courseId: course._id
        });
    }

    const totalLessons = lessons.length;

    // Group lessons by module
    const modulesWithLessons = modules.map(mod => {
        const moduleLessons = lessons.filter(l => l.moduleId.toString() === mod._id.toString());
        return {
            ...mod.toObject(),
            lessons: moduleLessons
        };
    });

    res.status(200).json({
        ...course.toObject(),
        modules: modulesWithLessons,
        totalLessons,
        progress: progress ? {
            progressPercentage: progress.progressPercentage,
            completed: progress.completed,
            completedLessons: progress.completedLessons
        } : null
    });
});

// @desc    Get all lessons for a course grouped by module
// @route   GET /api/learning/courses/:courseId/lessons
// @access  Private (Freelancer)
const getLessonsByCourse = asyncHandler(async (req, res) => {
    const course = await LearningCourse.findOne({
        _id: req.params.courseId,
        isPublished: true
    });

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    const modules = await LearningModule.find({ courseId: course._id }).sort({ order: 1 });
    const lessons = await LearningLesson.find({ courseId: course._id }).sort({ order: 1 });

    const modulesWithLessons = modules.map(mod => {
        const moduleLessons = lessons.filter(l => l.moduleId.toString() === mod._id.toString());
        return {
            ...mod.toObject(),
            lessons: moduleLessons
        };
    });

    res.status(200).json(modulesWithLessons);
});

// @desc    Get single lesson by ID
// @route   GET /api/learning/lessons/:id
// @access  Private (Freelancer)
const getLessonById = asyncHandler(async (req, res) => {
    const lesson = await LearningLesson.findById(req.params.id);

    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found");
    }

    // Verify the course is published
    const course = await LearningCourse.findOne({
        _id: lesson.courseId,
        isPublished: true
    });

    if (!course) {
        res.status(404);
        throw new Error("Course not found or not published");
    }

    res.status(200).json(lesson);
});

// @desc    Get freelancer's progress for a course
// @route   GET /api/learning/progress/:courseId
// @access  Private (Freelancer)
const getCourseProgress = asyncHandler(async (req, res) => {
    const freelancerId = req.user.fl_id;

    if (!freelancerId) {
        res.status(401);
        throw new Error("Unauthorized: Freelancer ID not found in token");
    }

    const progress = await LearningProgress.findOne({
        freelancerId,
        courseId: req.params.courseId
    });

    if (!progress) {
        return res.status(200).json({
            freelancerId,
            courseId: req.params.courseId,
            completedLessons: [],
            progressPercentage: 0,
            completed: false
        });
    }

    res.status(200).json(progress);
});

// @desc    Mark a lesson as complete
// @route   POST /api/learning/progress
// @access  Private (Freelancer)
const markLessonComplete = asyncHandler(async (req, res) => {
    const freelancerId = req.user.fl_id;
    const { courseId, lessonId } = req.body;

    if (!freelancerId) {
        res.status(401);
        throw new Error("Unauthorized: Freelancer ID not found in token");
    }

    if (!courseId || !lessonId) {
        res.status(400);
        throw new Error("Course ID and Lesson ID are required");
    }

    // Verify lesson exists and course is published
    const lesson = await LearningLesson.findById(lessonId);
    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found");
    }

    const course = await LearningCourse.findOne({
        _id: courseId,
        isPublished: true
    });
    if (!course) {
        res.status(404);
        throw new Error("Course not found or not published");
    }

    // Get total lesson count for this course
    const totalLessons = await LearningLesson.countDocuments({ courseId });

    // Use $addToSet to prevent duplicate entries
    let progress = await LearningProgress.findOneAndUpdate(
        { freelancerId, courseId },
        {
            $addToSet: {
                completedLessons: {
                    lessonId: lesson._id,
                    completedAt: new Date()
                }
            }
        },
        { upsert: true, new: true }
    );

    // Recalculate progress percentage
    const completedCount = progress.completedLessons.length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const completed = progressPercentage >= 100;

    progress = await LearningProgress.findOneAndUpdate(
        { freelancerId, courseId },
        {
            progressPercentage,
            completed
        },
        { new: true }
    );

    res.status(200).json(progress);
});

module.exports = {
    getCourses,
    getRecommendedCourses,
    getCourseById,
    getLessonsByCourse,
    getLessonById,
    getCourseProgress,
    markLessonComplete
};
