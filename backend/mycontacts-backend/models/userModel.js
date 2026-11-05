const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  fl_id: {
    type: String,
    required: true,
    unique: true
  },
  fullname: {
    type: String,
    required: [true, "Please add the fullname"]
  },
  username: {
    type: String
  },
  email: {
    type: String,
    required: [true, "Please add the user email"],
    unique: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    //required: [true, "Please add the user password"]
  },
  country: {
    type: String
  },
  contact: {
    type: String
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'male', 'female', 'other']
  },
  dob: {
    type: Date,
  },
  nationality: {
    type: String,
  },
  languages: {
    type: [String]
  },
  experience: {
    type: String
  },
  external_projects: {
    type: Object,
    default: {}
  },
  skillTitle: {
    type: String,
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isStudent: {
    type: Boolean,
    default: false
  },
  agree: {
    type: Boolean,
    default: false
  },
  linkedin: {
    type: String
  },
  facebook: {
    type: String
  },
  instagram: {
    type: String
  },
  twitter: {
    type: String
  },
  portfolio: {
    type: String
  },
  isverified: {
    type: Boolean,
    default: false
  },
  otpHash: {
    type: String
  },
  otpExpiresAt: {
    type: Date
  },
  status: {
    type: String,
    default: 'Active'  //Active,Inactive
  },
  createdby: {
    type: String
  },
  updatedby: {
    type: String
  },
  certifications: [{
    title: { type: String },
    issuer: { type: String },
    date: { type: String },
    link: { type: String },
    fileName: { type: String },
    s3Key: { type: String },
    fileUrl: { type: String },
    contentType: { type: String }
  }],
  resume_data: {
    key: { type: String },
    url: { type: String },
    contentType: { type: String }
  },
  // Privacy-safe Client View generated from an uploaded resume/document.
  // Contains ONLY whitelisted professional fields (no PII values).
  client_view: {
    data: { type: Object, default: null },
    validationStatus: { type: String, default: "" },
    piiDetected: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      addressLocation: { type: Boolean, default: false },
      governmentId: { type: Boolean, default: false }
    },
    updatedAt: { type: Date }
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
userSchema.index({ status: 1 });
module.exports = mongoose.model("User", userSchema)  //export the model to use it in