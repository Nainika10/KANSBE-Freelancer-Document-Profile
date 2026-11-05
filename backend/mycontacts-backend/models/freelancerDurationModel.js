const mongoose = require("mongoose");

const dailyRecordSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    loginAt: { type: Date },
    logoutAt: { type: Date },
    lastActivityAt: { type: Date },
    modules: {
        type: Map,
        of: Number, // Stores duration in seconds
        default: {}
    }
});

const freelancerDurationSchema = new mongoose.Schema({
    usr_id: {
        type: String,
        required: true
    },
    dailyRecords: [dailyRecordSchema],
    createdby: {
        type: String
    }
}, {
    timestamps: true
});

// ─── Database Index for Performance ────────────────────────────
freelancerDurationSchema.index({ usr_id: 1 });

module.exports = mongoose.model("freelancer_duration", freelancerDurationSchema);
