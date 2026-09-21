const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const auth = require('../middleware/auth');

// Public endpoint to subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    // Basic format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Check duplicate
    const existing = await Newsletter.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'This email is already subscribed to our newsletter.' });
    }

    const subscription = new Newsletter({ email: email.toLowerCase().trim() });
    await subscription.save();

    res.status(201).json({
      message: 'Thank you for subscribing to our newsletter!',
      data: subscription
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin endpoint to view subscribers list
router.get('/', auth, async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
    res.json(subscribers);
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin endpoint to delete subscription
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Newsletter.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Subscriber not found.' });
    }
    res.json({ message: 'Subscriber deleted successfully.' });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
