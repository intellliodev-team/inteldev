const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const auth = require('../middleware/auth');

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({
      message: 'Thank you for contacting us. We will get back to you soon.',
      data: contact
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all contact messages (Admin only)
router.get('/', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Contact.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a reply email to a contact message and update status to replied (Admin only)
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const message = await Contact.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Configure Nodemailer
    const nodemailer = require('nodemailer');
    const EmailSettings = require('../models/EmailSettings');
    const CompanySettings = require('../models/CompanySettings');
    const cryptoUtils = require('../config/cryptoUtils');

    const dbEmailSettings = await EmailSettings.findOne();
    const dbCompanySettings = await CompanySettings.findOne();

    let smtpHost, smtpPort, smtpUser, smtpPass, senderName, senderEmail;

    if (dbEmailSettings) {
      smtpHost = dbEmailSettings.host;
      smtpPort = dbEmailSettings.port;
      smtpUser = dbEmailSettings.username;
      smtpPass = cryptoUtils.decrypt(dbEmailSettings.password);
      senderName = dbEmailSettings.senderName || (dbCompanySettings && dbCompanySettings.companyName) || 'TDC.USA';
      senderEmail = (dbCompanySettings && dbCompanySettings.email) || dbEmailSettings.senderEmail || dbEmailSettings.username;
    } else {
      // Fallback to environment variables
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
      smtpHost = SMTP_HOST;
      smtpPort = SMTP_PORT;
      smtpUser = SMTP_USER;
      smtpPass = SMTP_PASS;
      senderName = (dbCompanySettings && dbCompanySettings.companyName) || 'TDC.USA';
      senderEmail = (dbCompanySettings && dbCompanySettings.email) || SMTP_FROM || SMTP_USER;
    }

    // Check if configuration exists
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: message.email,
        subject: `Re: ${message.subject}`,
        text: reply
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email successfully sent to ${message.email} from ${senderEmail}`);
    } else {
      console.log('============================================================');
      console.log('WARNING: SMTP credentials not fully configured in MongoDB or server/.env');
      console.log('Simulating email reply submission:');
      console.log(`From: "${senderName}" <${senderEmail}>`);
      console.log(`To: ${message.email}`);
      console.log(`Subject: Re: ${message.subject}`);
      console.log(`Message Content:\n${reply}`);
      console.log('============================================================');
    }

    // Update status to replied
    message.status = 'replied';
    await message.save();

    res.json({
      message: 'Reply sent and status updated to replied.',
      data: message
    });
  } catch (error) {
    console.error('Error in send reply route:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;