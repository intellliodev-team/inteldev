const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  review: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  profileImage: {
    type: String,
    default: '',
  },
  companyLogo: {
    type: String,
    default: '',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
