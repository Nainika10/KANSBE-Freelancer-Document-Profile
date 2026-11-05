const mongoose = require("mongoose");
const TaskSchema = new mongoose.Schema({
    id: Number,
    title: String,
    status: String,
    assignedto: String,
    summary: String,
    startdate: Date,
    duedate: Date,
    approval_reject_reason: {
        type: String,
        default: null
    },
    completion_reject_reason: {
        type: String,
        default: null
    },
    reminders: {
        creation_approval_count: { type: Number, default: 0 },
        last_creation_approval_sent: Date,
        
        completion_approval_count: { type: Number, default: 0 },
        last_completion_approval_sent: Date,
        
        freelancer_due_count: { type: Number, default: 0 },
        last_freelancer_due_sent: Date
    },
    createdby: String,
    updatedby: String,
    submission_url: {
        type: String,
        default: null,
        trim: true
    },
    submission_note: {
        type: String,
        default: null
    },
    submission_media: [{
        originalName: { type: String },
        mediaUrl: { type: String },
        mediaKey: { type: String },
        tempS3Key: { type: String },
        mediaType: {
            type: String,
            enum: ['image', 'video', 'pdf', 'other']
        },
        mimeType: { type: String },
        fileSize: { type: Number },
        mediaStatus: {
            type: String,
            enum: ['pending', 'processing', 'approved', 'failed'],
            default: 'pending'
        },
        uploadedAt: { type: Date, default: Date.now }
    }],
    submitted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true
    });
const cprojectSchema = new mongoose.Schema({
    p_id: {
        type: String,
        required: true,
        unique: true
    },
    Pmanager: {
        type: [String],     // POCs (Points of Contact) - supports multiple managers
        default: []
    },
    c_id: {
        type: String
    },
    assignedto: {
        type: String // Stores the grp_id from the 'groups' collection
    },
    status: {
        type: String,
        default: "available" //waiting-for-approval,pending,accepted,rejected, in-progress, completed
    },
    title: {
        type: String
    },
    category: {
        type: String
    },
    budget: {
        type: Number
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    actualStartDate: {
        type: Date
    },
    actualEndDate: {
        type: Date
    },
    actualBudget: {
        type: Number
    },
    description: {
        type: String
    },
    skills: {
        type: [String],  // array of strings
        default: []
    },
    filedata: {
        key: { type: String },
        url: { type: String },
        contentType: { type: String }
    },
    fileVersions: [{
        version: { type: Number },
        key: { type: String },
        url: { type: String },
        contentType: { type: String },
        uploadedBy: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        note: { type: String, default: "" }
    }],
    assignedDate: {
        type: Date
    },
    responseDate: {
        type: Date
    },
    decision: {
        type: String,
        default: null //null,accepted,rejected
    },
    createdby: {
        type: String
    },
    updatedby: {
        type: String
    },
    freelancersNeeded: {
        type: Number,
        default: 1
    },
    freelancerBreakdown: [{
        category: { type: String },
        clientBudget: { type: Number },
        actualBudget: { type: Number },
        actualStartDate: { type: Date },
        actualEndDate: { type: Date },
        count: { type: Number, default: 1 },
        skills: [{ type: String }],
        assigned_fl_id: { type: String, default: null },
        assigned_fl_name: { type: String, default: null }
    }],
    Tasks: [TaskSchema],
    feedback: {
        clientFeedback: {
            type: Map,
            of: new mongoose.Schema({
                rating: { type: Number, min: 1, max: 5 },
                description: String,
                submittedAt: { type: Date, default: Date.now }
            }, { _id: false }),
            default: {} 
        },
        freelancerFeedback: {
            type: Map,
            of: new mongoose.Schema({
                clientRating: { type: Number, min: 1, max: 5 },
                clientDescription: String,
                kansbeRating: { type: Number, min: 1, max: 5 },
                kansbeDescription: String,
                submittedAt: { type: Date, default: Date.now }
            }, { _id: false }),
            default: {}
        }
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("Cproject", cprojectSchema);
