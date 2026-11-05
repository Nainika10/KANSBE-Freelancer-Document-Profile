const mongoose = require("mongoose");

const learningLessonSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningCourse",
        required: [true, "Please add the course ID"]
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningModule",
        required: [true, "Please add the module ID"]
    },
    title: {
        type: String,
        required: [true, "Please add the lesson title"]
    },
    description: {
        type: String,
        default: ''
    },
    youtubeUrl: {
        type: String,
        required: [true, "Please add the YouTube URL"]
    },
    youtubeVideoId: {
        type: String,
        required: [true, "Please add the YouTube video ID"]
    },
    duration: {
        type: String,
        default: ''
    },
    order: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

// ─── Database Indexes for Performance ───────────────────────────
learningLessonSchema.index({ courseId: 1, moduleId: 1, order: 1 });
learningLessonSchema.index({ moduleId: 1, order: 1 });

module.exports = mongoose.model("LearningLesson", learningLessonSchema);
