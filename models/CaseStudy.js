const mongoose = require('mongoose');

const caseStudySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  industry: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  video: {
    type: String,
    required: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  challenge: {
    type: String,
    default: '',
  },
  solution: {
    type: String,
    default: '',
  },
  results: {
    type: String,
    default: '',
  },
  technologies: {
    type: [String],
    default: [],
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('CaseStudy', caseStudySchema);
