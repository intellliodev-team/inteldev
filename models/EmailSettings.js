const mongoose = require('mongoose');

const emailSettingsSchema = new mongoose.Schema({
  senderEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    default: 'info@tdc.usa'
  },
  senderName: {
    type: String,
    trim: true,
    default: 'TDC.USA'
  },
  host: {
    type: String,
    required: true,
    trim: true,
    default: 'smtp.mailtrap.io'
  },
  port: {
    type: Number,
    required: true,
    default: 587
  },
  username: {
    type: String,
    required: true,
    trim: true,
    default: 'smtp_user'
  },
  password: {
    type: String,
    required: true,
    default: 'smtp_password'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailSettings', emailSettingsSchema);
