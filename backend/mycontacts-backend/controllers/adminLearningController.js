const asyncHandler = require("express-async-handler");
const LearningCourse = require("../models/learningCourseModel");
const LearningModule = require("../models/learningModuleModel");
const LearningLesson = require("../models/learningLessonModel");
const LearningProgress = require("../models/learningProgressModel");
const User = require("../models/userModel");

// ─── YouTube URL Helpers ────────────────────────────────────────

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 */
const extractYouTubeVideoId = (url) => {
    if (!url) return null;

    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

/**
 * Validate that a string is a valid YouTube URL
 */
const isValidYouTubeUrl = (url) => {
    return extractYouTubeVideoId(url) !== null;
};

// ═══════════════════════════════════════════════════════════════
// COURSE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// @desc    Create a new course
// @route   POST /api/admin/learning/courses
// @access  Private (Admin)
const createCourse = asyncHandler(async (req, res) => {
    const { title, description, category, level, thumbnail, instructor, isPublished, tags } = req.body;

    if (!title || !description || !category || !level || !instructor) {
        res.status(400);
        throw new Error("Title, description, category, level, and instructor are required");
    }

    const course = await LearningCourse.create({
        title,
        description,
        category,
        level,
        thumbnail: thumbnail || '',
        instructor,
        isPublished: isPublished || false,
        tags: tags || [],
        createdBy: req.user.usr_id
    });

    res.status(201).json(course);
});

// @desc    Get all courses (including unpublished)
// @route   GET /api/admin/learning/courses
// @access  Private (Admin)
const getCourses = asyncHandler(async (req, res) => {
    const courses = await LearningCourse.find().sort({ createdAt: -1 });

    const coursesWithCounts = await Promise.all(courses.map(async (course) => {
        const moduleCount = await LearningModule.countDocuments({ courseId: course._id });
        const lessonCount = await LearningLesson.countDocuments({ courseId: course._id });
        return {
            ...course.toObject(),
            moduleCount,
            lessonCount
        };
    }));

    res.status(200).json(coursesWithCounts);
});

// @desc    Get single course with modules and lessons
// @route   GET /api/admin/learning/courses/:id
// @access  Private (Admin)
const getCourseById = asyncHandler(async (req, res) => {
    const course = await LearningCourse.findById(req.params.id);

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

    res.status(200).json({
        ...course.toObject(),
        modules: modulesWithLessons,
        totalLessons: lessons.length
    });
});

// @desc    Update a course
// @route   PUT /api/admin/learning/courses/:id
// @access  Private (Admin)
const updateCourse = asyncHandler(async (req, res) => {
    const course = await LearningCourse.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    const updatedCourse = await LearningCourse.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json(updatedCourse);
});

// @desc    Delete a course (cascade delete modules, lessons, progress)
// @route   DELETE /api/admin/learning/courses/:id
// @access  Private (Admin)
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await LearningCourse.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Cascade delete
    await LearningLesson.deleteMany({ courseId: course._id });
    await LearningModule.deleteMany({ courseId: course._id });
    await LearningProgress.deleteMany({ courseId: course._id });
    await LearningCourse.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Course and all related data deleted successfully" });
});

// ═══════════════════════════════════════════════════════════════
// MODULE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// @desc    Create a new module
// @route   POST /api/admin/learning/modules
// @access  Private (Admin)
const createModule = asyncHandler(async (req, res) => {
    const { courseId, title, description, order } = req.body;

    if (!courseId || !title) {
        res.status(400);
        throw new Error("Course ID and title are required");
    }

    // Verify course exists
    const course = await LearningCourse.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    // Auto-calculate order if not provided
    let moduleOrder = order;
    if (moduleOrder === undefined || moduleOrder === null) {
        const lastModule = await LearningModule.findOne({ courseId }).sort({ order: -1 });
        moduleOrder = lastModule ? lastModule.order + 1 : 0;
    }

    const module = await LearningModule.create({
        courseId,
        title,
        description: description || '',
        order: moduleOrder
    });

    res.status(201).json(module);
});

// @desc    Update a module
// @route   PUT /api/admin/learning/modules/:id
// @access  Private (Admin)
const updateModule = asyncHandler(async (req, res) => {
    const mod = await LearningModule.findById(req.params.id);

    if (!mod) {
        res.status(404);
        throw new Error("Module not found");
    }

    const updatedModule = await LearningModule.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json(updatedModule);
});

// @desc    Delete a module (cascade delete lessons)
// @route   DELETE /api/admin/learning/modules/:id
// @access  Private (Admin)
const deleteModule = asyncHandler(async (req, res) => {
    const mod = await LearningModule.findById(req.params.id);

    if (!mod) {
        res.status(404);
        throw new Error("Module not found");
    }

    // Cascade delete lessons in this module
    await LearningLesson.deleteMany({ moduleId: mod._id });
    await LearningModule.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Module and its lessons deleted successfully" });
});

// ═══════════════════════════════════════════════════════════════
// LESSON MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// @desc    Create a new lesson
// @route   POST /api/admin/learning/lessons
// @access  Private (Admin)
const createLesson = asyncHandler(async (req, res) => {
    const { courseId, moduleId, title, description, youtubeUrl, duration, order } = req.body;

    if (!courseId || !moduleId || !title || !youtubeUrl) {
        res.status(400);
        throw new Error("Course ID, module ID, title, and YouTube URL are required");
    }

    // Validate YouTube URL
    if (!isValidYouTubeUrl(youtubeUrl)) {
        res.status(400);
        throw new Error("Invalid YouTube URL. Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID");
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

    // Verify course and module exist
    const course = await LearningCourse.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    const mod = await LearningModule.findById(moduleId);
    if (!mod) {
        res.status(404);
        throw new Error("Module not found");
    }

    // Auto-calculate order if not provided
    let lessonOrder = order;
    if (lessonOrder === undefined || lessonOrder === null) {
        const lastLesson = await LearningLesson.findOne({ moduleId }).sort({ order: -1 });
        lessonOrder = lastLesson ? lastLesson.order + 1 : 0;
    }

    const lesson = await LearningLesson.create({
        courseId,
        moduleId,
        title,
        description: description || '',
        youtubeUrl,
        youtubeVideoId,
        duration: duration || '',
        order: lessonOrder
    });

    res.status(201).json(lesson);
});

// @desc    Update a lesson
// @route   PUT /api/admin/learning/lessons/:id
// @access  Private (Admin)
const updateLesson = asyncHandler(async (req, res) => {
    const lesson = await LearningLesson.findById(req.params.id);

    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found");
    }

    // If youtubeUrl is being updated, re-extract video ID
    if (req.body.youtubeUrl) {
        if (!isValidYouTubeUrl(req.body.youtubeUrl)) {
            res.status(400);
            throw new Error("Invalid YouTube URL");
        }
        req.body.youtubeVideoId = extractYouTubeVideoId(req.body.youtubeUrl);
    }

    const updatedLesson = await LearningLesson.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    res.status(200).json(updatedLesson);
});

// @desc    Delete a lesson
// @route   DELETE /api/admin/learning/lessons/:id
// @access  Private (Admin)
const deleteLesson = asyncHandler(async (req, res) => {
    const lesson = await LearningLesson.findById(req.params.id);

    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found");
    }

    await LearningLesson.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Lesson deleted successfully" });
});

// ═══════════════════════════════════════════════════════════════
// PROGRESS TRACKING (Admin View)
// ═══════════════════════════════════════════════════════════════

// @desc    Get all learning progress (with filters)
// @route   GET /api/admin/learning/progress
// @access  Private (Admin)
const getLearningProgress = asyncHandler(async (req, res) => {
    const { freelancerId, courseId, status } = req.query;

    let filter = {};
    if (freelancerId) filter.freelancerId = freelancerId;
    if (courseId) filter.courseId = courseId;
    if (status === 'completed') filter.completed = true;
    if (status === 'in-progress') filter.completed = false;

    const progressRecords = await LearningProgress.find(filter)
        .populate('courseId', 'title category level')
        .sort({ updatedAt: -1 });

    // Enrich with freelancer info
    const enrichedProgress = await Promise.all(progressRecords.map(async (record) => {
        const freelancer = await User.findOne({ fl_id: record.freelancerId }, 'fullname email profile_pic');
        const totalLessons = await LearningLesson.countDocuments({ courseId: record.courseId._id || record.courseId });

        return {
            ...record.toObject(),
            freelancer: freelancer ? {
                fullname: freelancer.fullname,
                email: freelancer.email,
                profile_pic: freelancer.profile_pic
            } : { fullname: 'Unknown', email: '' },
            totalLessons
        };
    }));

    res.status(200).json(enrichedProgress);
});

module.exports = {
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
};
