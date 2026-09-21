const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n🔑 ===== LOGIN ATTEMPT =====');
    console.log('Email received:', JSON.stringify(email));
    console.log('Password length:', password?.length);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Normalize (matches model's lowercase: true)
    const normalizedEmail = String(email).toLowerCase().trim();

    const admin = await Admin.findOne({ email: normalizedEmail });
    console.log('Admin found in DB:', !!admin);

    if (!admin) {
      // Show what emails DO exist (debug only — remove in production)
      const allEmails = await Admin.find({}, 'email').lean();
      console.log('Existing admin emails:', allEmails.map(a => a.email));
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('DB admin email:', admin.email);
    console.log('DB password hash preview:', admin.password?.slice(0, 20) + '...');

    const isMatch = await admin.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ LOGIN SUCCESS for', admin.email, '\n');

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== SETUP (create first admin) ====================
router.post('/setup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    console.log('\n🛠️  ===== SETUP ATTEMPT =====');
    console.log('Email:', email, '| Name:', name);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });

    if (existing) {
      console.log('⚠️  Admin already exists:', existing.email);
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = new Admin({
      email: normalizedEmail,
      password,                              // hashed by pre('save')
      name: name || 'Admin',
      role: 'super_admin',
    });

    await admin.save();
    console.log('✅ Admin created:', admin.email);
    console.log('   Hashed password preview:', admin.password.slice(0, 20) + '...\n');

    res.status(201).json({
      message: 'Admin created successfully',
      admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    console.error('❌ SETUP ERROR:', error);
    res.status(400).json({ message: error.message });
  }
});

// ==================== RESET PASSWORD (emergency) ====================
// DELETE THIS ROUTE AFTER YOU'VE LOGGED IN ONCE
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    admin.password = newPassword;   // re-hashed by pre('save')
    await admin.save();

    console.log('🔁 Password reset for', admin.email);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PROFILE ====================
router.get('/profile', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;