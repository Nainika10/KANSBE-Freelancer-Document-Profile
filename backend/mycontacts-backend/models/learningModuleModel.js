const mongoose = require("mongoose");

const learningModuleSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningCourse",
        required: [true, "Please add the course ID"]
    },
    title: {
        type: String,
        required: [true, "Please add the module title"]
    },
    description: {
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
learningModuleSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model("LearningModule", learningModuleSchema);
