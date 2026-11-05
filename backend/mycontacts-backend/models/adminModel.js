const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    usr_id: {
        type: String,
        required: true,
        unique: true
    },
    usr_name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    department: {
        type: String
    },
    status: {
        type: String,
        enum: ["active", "on-leave", "inactive"],
        default: "active"
    },
    maxProjects: {
        type: Number,
        default: 30
    },
    lastAssignedAt: {
        type: Date,
        default: null
    },
    createdby: {
        type: String
    },
    updatedby: {
        type: String
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model('admin', adminSchema);