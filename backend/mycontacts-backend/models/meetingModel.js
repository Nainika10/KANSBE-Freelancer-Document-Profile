const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    role: { type: String, enum: ["Client", "Freelancer", "Manager", "Admin"], required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    reason: { type: String, default: "" },
    updatedAt: { type: Date }
});

const requestSchema = new mongoose.Schema({
    requestedBy: { type: String, required: true },  // user ID
    requesterRole: { type: String, enum: ["Client", "Freelancer", "Manager", "Admin"] },
    topic: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    reason: { type: String, required: true },
    
    // Updated: Members is an array of subdocuments holding status and reason
    members: { type: [memberSchema], default: [] },
    managerStatus: { 
        status: { type: String, enum: ["pending", "scheduled"], default: "pending" },
        meetingLink: { type: String, default: "" }
    },
    
    // Overall State
    overallStatus: { 
        type: String, 
        enum: ["pending-approvals", "waiting-for-schedule", "scheduled", "completed", "rejected"], 
        default: "pending-approvals" 
    },
    
    respondedBy: { type: String, default: "" },
    rejectionReason: { type: String, default: "" }
}, { timestamps: true });

const meetingSchema = new mongoose.Schema({
    p_id: { type: String, required: true, unique: true },
    requests: [requestSchema]
}, { timestamps: true });

module.exports = mongoose.model("Meeting", meetingSchema);
