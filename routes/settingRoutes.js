const express = require('express');
const router = express.Router();
const CompanySettings = require('../models/CompanySettings');
const EmailSettings = require('../models/EmailSettings');
const cryptoUtils = require('../config/cryptoUtils');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');

// Helper to get or create settings
async function getOrCreateSettings() {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = new CompanySettings();
    await settings.save();
  }
  return settings;
}

// GET /api/settings/public
router.get('/public', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/settings (Admin authenticated)
router.put('/', auth, async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/settings/email (Admin authenticated)
router.get('/email', auth, async (req, res) => {
  try {
    const settings = await EmailSettings.findOne();
    if (!settings) {
      return res.json({
        senderEmail: '',
        senderName: '',
        host: '',
        port: 587,
        username: '',
        password: ''
      });
    }

    const settingsObj = settings.toObject();
    if (settingsObj.password) {
      settingsObj.password = '••••••••';
    }
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/settings/email (Admin authenticated)
router.put('/email', auth, async (req, res) => {
  try {
    let settings = await EmailSettings.findOne();
    const { senderEmail, senderName, host, port, username, password } = req.body;

    let finalPassword = password;
    if (settings) {
      if (password === '••••••••' || !password) {
        finalPassword = settings.password;
      } else {
        finalPassword = cryptoUtils.encrypt(password);
      }
      
      settings.senderEmail = senderEmail;
      settings.senderName = senderName;
      settings.host = host;
      settings.port = port;
      settings.username = username;
      settings.password = finalPassword;
    } else {
      if (password && password !== '••••••••') {
        finalPassword = cryptoUtils.encrypt(password);
      }
      settings = new EmailSettings({
        senderEmail,
        senderName,
        host,
        port,
        username,
        password: finalPassword
      });
    }

    await settings.save();
    
    const settingsObj = settings.toObject();
    settingsObj.password = '••••••••';
    res.json(settingsObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/settings/email/verify (Admin authenticated)
router.post('/email/verify', auth, async (req, res) => {
  try {
    const { host, port, username, password } = req.body;
    let finalPassword = password;

    if (password === '••••••••') {
      const settings = await EmailSettings.findOne();
      if (settings) {
        finalPassword = cryptoUtils.decrypt(settings.password);
      } else {
        return res.status(400).json({ message: 'No settings stored to verify with masked password.' });
      }
    }

    if (!host || !port || !username || !finalPassword) {
      return res.status(400).json({ message: 'Missing SMTP parameters.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: {
        user: username,
        pass: finalPassword
      },
      connectTimeout: 5000
    });

    await transporter.verify();
    res.json({ success: true, message: 'SMTP connection verified successfully!' });
  } catch (error) {
    console.error('SMTP verification failed:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/settings/email/test (Admin authenticated)
router.post('/email/test', auth, async (req, res) => {
  try {
    const { recipient, senderEmail, senderName, host, port, username, password } = req.body;
    
    if (!recipient || !recipient.trim()) {
      return res.status(400).json({ message: 'Recipient email is required.' });
    }

    let finalPassword = password;
    if (password === '••••••••') {
      const settings = await EmailSettings.findOne();
      if (settings) {
        finalPassword = cryptoUtils.decrypt(settings.password);
      } else {
        return res.status(400).json({ message: 'No settings stored to send test email.' });
      }
    }

    if (!host || !port || !username || !finalPassword) {
      return res.status(400).json({ message: 'Missing SMTP parameters.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: {
        user: username,
        pass: finalPassword
      }
    });

    const mailOptions = {
      from: `"${senderName || 'TDC.USA'}" <${senderEmail || username}>`,
      to: recipient,
      subject: 'TDC.USA - SMTP Test Email',
      text: 'Hello! This is a test email sent from the TDC.USA Admin Panel to verify your SMTP configuration. If you received this, your email system is functioning correctly!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F9C349; margin-top: 0;">TDC.USA Connection Test</h2>
          <p>Hello,</p>
          <p>This is a test email sent from the <strong>TDC.USA Admin Panel</strong> to verify your SMTP connection settings.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; font-family: monospace; border-left: 4px solid #F9C349;">
            SMTP Host: ${host}<br/>
            SMTP Port: ${port}<br/>
            SMTP User: ${username}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">If you received this message, your mail configuration is set up correctly and is ready to reply to contact messages.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Test email successfully sent to ${recipient}!` });
  } catch (error) {
    console.error('SMTP test email failed:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
