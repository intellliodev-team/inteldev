const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  // Cloudinary public ID for easy deletion
  cloudinaryPublicId: {
    type: String,
    default: '',
  },
  technologies: [String],
  githubLink: {
    type: String,
    default: '',
  },
  liveLink: {
    type: String,
    default: '',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  completionDate: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    enum: ['Web Development', 'Mobile App', 'Software Solution', 'Consulting', 'Saas', 'Website', 'Automation'],
    default: 'Software Solution',
  },
  // New fields for challenge, solution, results
  client: {
    type: String,
    default: '',
  },
  industry: {
    type: String,
    default: 'Technology',
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
}, {
  timestamps: true,
});

module.exports = mongoose.model('Project', projectSchema);