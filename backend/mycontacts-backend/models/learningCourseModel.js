const mongoose = require("mongoose");

const learningCourseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please add the course title"]
    },
    description: {
        type: String,
        required: [true, "Please add the course description"]
    },
    category: {
        type: String,
        required: [true, "Please add the course category"]
    },
    level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        required: [true, "Please add the course level"]
    },
    thumbnail: {
        type: String,
        default: ''
    },
    instructor: {
        type: String,
        required: [true, "Please add the instructor name"]
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    tags: {
        type: [String],
        default: []
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// ─── Database Indexes for Performance ───────────────────────────
learningCourseSchema.index({ isPublished: 1 });
learningCourseSchema.index({ category: 1 });
learningCourseSchema.index({ level: 1 });
learningCourseSchema.index({ tags: 1 });
learningCourseSchema.index({ title: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model("LearningCourse", learningCourseSchema);
