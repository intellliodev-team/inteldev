const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Full Time', 'Part Time', 'Remote'],
    default: 'Full Time',
  },
  experienceLevel: {
    type: String,
    default: 'Entry Level',
  },
  benefits: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open',
  },
  description: {
    type: String,
    required: true,
  },
  requirements: [String],
  responsibilities: [String],
  salary: {
    type: String,
  },
  postedDate: {
    type: Date,
    default: Date.now,
  },
  applicationDeadline: {
    type: Date,
  },
  featuredJob: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  activeJob: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Job', jobSchema);