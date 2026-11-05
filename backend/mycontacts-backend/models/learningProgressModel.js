const mongoose = require("mongoose");

const learningProgressSchema = new mongoose.Schema({
    freelancerId: {
        type: String,
        required: [true, "Please add the freelancer ID"]
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningCourse",
        required: [true, "Please add the course ID"]
    },
    completedLessons: [{
        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LearningLesson",
            required: true
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    progressPercentage: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ─── Database Indexes for Performance ───────────────────────────
// Unique compound index to prevent duplicate progress records
learningProgressSchema.index({ freelancerId: 1, courseId: 1 }, { unique: true });
learningProgressSchema.index({ completed: 1 });

module.exports = mongoose.model("LearningProgress", learningProgressSchema);
