const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userType: {
    type: String,
    enum: ['freelancer', 'client', 'admin', 'manager', 'unknown'],
    default: 'unknown',
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  entity: {
    type: String,
    default: null,
    index: true,
  },
  entityId: {
    type: String,
    default: null,
    index: true,
  },
  details: {
    type: Object,
    default: {},
  },
  requestPath: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
});

userActivitySchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
