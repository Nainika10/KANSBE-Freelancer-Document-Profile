const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
    id: Number,
    title: String,
    message: String,
    count: { type: Number, default: 1 },
    p_id: String,
    isread: Boolean,
    createdby: String,
    time: {
        type: String,
        default: () =>
            new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) 
    }
});
const freelancer_notificationschema = new mongoose.Schema({
    usr_id: {
        type: String,
        required: true
    },
    messages: [messageSchema],
    createdby: {
        type: String
    }
}, {
    timestamps: true
});

// ─── Database Index for Performance ────────────────────────────
freelancer_notificationschema.index({ usr_id: 1 });

module.exports = mongoose.model("freelancer_notifications", freelancer_notificationschema);