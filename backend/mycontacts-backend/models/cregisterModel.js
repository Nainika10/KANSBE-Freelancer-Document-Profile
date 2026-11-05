
const mongoose = require("mongoose")

const cregisterSchema = new mongoose.Schema({
    c_id: {
        type: String,
        required: [true, "Enter the id"],
        unique: true
    },
    fullname: {
        type: String,
        required: [true, "Enter your fullname"]
    },
    username: {
        type: String
    },
    email: {
        type: String,
        required: [true, "Enter the email"],
        unique: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        //required: [true, "Enter your password"]
    },
    country: {
        type: String,
        required: [true, "Enter your country"]
    },
    contact: {
        type: String
    },
    location: {
        type: String
    },
    terms: {
        type: Boolean,
        default: false,
        required: [true, "Accept the terms and conditions"]
    },
    isverfied: {
        type: Boolean,
        default: false
    },
    otpHash: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
    dob: {
        type: Date  // use String if you're sending "null" or date string like "1990-01-01"
    },
    nationality: {
        type: String
    },
    gender: {
        type: String
    },
    bio: {
        type: String
    },
    linkedin: {
        type: String
    },
    twitter: {
        type: String
    },
    instagram: {
        type: String
    },
    facebook: {
        type: String
    },
    companyname: {
        type: String
    },
    companytype: {
        type: String
    },
    companyregno: {
        type: String
    },
    companywebsite: {
        type: String
    },
    companyaddress: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    country: {
        type: String
    },
    pincode: {
        type: String
    },
    companydescrptn: {
        type: String
    },
    profile: {
        type: Boolean,
        default: false
    },
    createdby: {
        type: String,
        required: true
    },
    updatedby: {
        type: String
    },
    profile_completion: {
        type: Number,
        default: 0
    },
    profile_pic: {
        type: String,
        default: ''
    },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    reviews: {
        type: Map,
        of: new mongoose.Schema({
            reviewer_id: String,
            rating: Number,
            description: String,
            createdAt: { type: Date, default: Date.now }
        }, { _id: false }),
        default: {}
    }
}, {
    timestamps: true
})

// ─── Database Indexes for Performance ───────────────────────────

module.exports = mongoose.model("Cregister", cregisterSchema)