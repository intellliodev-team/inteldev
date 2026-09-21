const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  linkedin: {
    type: String,
    trim: true,
  },
  portfolio: {
    type: String,
    trim: true,
  },
  coverLetter: {
    type: String,
  },
  resume: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'],
    default: 'Pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
