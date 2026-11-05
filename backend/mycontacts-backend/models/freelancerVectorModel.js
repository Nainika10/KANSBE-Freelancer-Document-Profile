const mongoose = require("mongoose");

const freelancerVectorSchema = new mongoose.Schema({
  fl_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  // Original structured fields for exact filtering, explanations & UI cards
  skillTitle: {
    type: String,
    default: "",
    trim: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  skills: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  experience_years: {
    type: Number,
    default: 0
  },
  certifications: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Compiled weighted plain text for full-text search & audit
  searchable_text: {
    type: String,
    default: ""
  },
  
  // Single Sparse TF-IDF Vector: maps term_id (as string key) -> tf-idf weight
  // Example: { "42": 0.452, "105": 0.318, "812": 0.190 }
  vector: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Pre-calculated Euclidean L2 Norm: sqrt(sum(weight_i^2))
  vector_magnitude: {
    type: Number,
    default: 0
  },
  
  // Operational Status
  status: {
    type: String,
    default: "Active",
    index: true
  },
  
  last_indexed_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for sub-millisecond candidate retrieval
freelancerVectorSchema.index({ status: 1, skills: 1 });
freelancerVectorSchema.index({ searchable_text: "text" });

module.exports = mongoose.model("FreelancerVector", freelancerVectorSchema, "freelancer_vectors");
