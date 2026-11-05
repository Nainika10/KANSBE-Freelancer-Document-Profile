const mongoose = require("mongoose");
const memberSchema = new mongoose.Schema({
    member: {
        type: String,
        required: true
    },
    decision: {
        type: String,
        default: "pending" //accepted/rejected/pending
    },
    reject_reason: {
        type: String
    },
    category: {
        type: String,
        default: 'General'
    },
    terms: {
        type: Boolean,
        default: false
    },
    updatedby: {
        type: String
    }
});
const groupSchema = new mongoose.Schema({
    grp_id: {
        type: String,
        required: true
    },
    grp_name: {
        type: String,
        required: true
    },
    p_id: {
        type: String,
        required: true
    },
    p_manager: {
        type: [String],
        default: []
    },
    members: [memberSchema],
    members_accepted: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: "active"
    },
    createdby: {
        type: String,
        required: true
    },
    updatedby: {
        type: String
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("group", groupSchema);