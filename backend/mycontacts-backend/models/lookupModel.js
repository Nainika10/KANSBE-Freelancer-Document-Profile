const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { _id: true }
);

const lookupSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        'nationality',
        'country',
        'gender',
        'language',
        'month',
        'companytype',
        'skillDomain'
      ]
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },

    // Used only for skillDomain
    icon: {
      type: String,
      default: null
    },

    // Skills belonging to this domain
    skills: {
      type: [skillSchema],
      default: []
    },

    createdBy: {
      type: String,
      default: null
    },

    updatedBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One domain name should be unique
lookupSchema.index(
  { category: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model('Lookup', lookupSchema);
