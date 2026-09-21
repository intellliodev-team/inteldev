const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    default: 'TDC.USA'
  },
  address: {
    type: String,
    required: true,
    default: '123 Main Street'
  },
  city: {
    type: String,
    required: true,
    default: 'New York'
  },
  state: {
    type: String,
    required: true,
    default: 'NY'
  },
  country: {
    type: String,
    required: true,
    default: 'USA'
  },
  postalCode: {
    type: String,
    required: true,
    default: '10001'
  },
  phone: {
    type: String,
    required: true,
    default: '+1 (555) 123-4567'
  },
  email: {
    type: String,
    required: true,
    default: 'info@tdc.usa'
  },
  googleMapsUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
