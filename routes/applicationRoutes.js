const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JobApplication = require('../models/JobApplication');
const auth = require('../middleware/auth');

// Ensure uploads/resumes directory exists
const uploadDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check both mimetype and extension name
    const mimetype = filetypes.test(file.mimetype) || 
                     file.originalname.endsWith('.doc') || 
                     file.originalname.endsWith('.docx') || 
                     file.mimetype === 'application/msword' || 
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                     
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
    }
  }
});

// Custom error handling wrapper for Multer
const handleUpload = (req, res, next) => {
  upload.single('resume')(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
        }
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// POST /api/applications (Public)
router.post('/', handleUpload, async (req, res) => {
  try {
    const { jobId, jobTitle, fullName, email, phone, location, linkedin, portfolio, coverLetter } = req.body;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required.' });
    }

    // Validation
    if (!jobId || !jobTitle || !fullName || !email || !phone || !location) {
      return res.status(400).json({ message: 'Missing required application fields.' });
    }

    const application = new JobApplication({
      jobId,
      jobTitle,
      fullName,
      email,
      phone,
      location,
      linkedin,
      portfolio,
      coverLetter,
      resume: `/uploads/resumes/${req.file.filename}`,
      status: 'Pending'
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/applications (Protected - Admin only)
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.jobId) {
      filter.jobId = req.query.jobId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const applications = await JobApplication.find(filter)
      .sort({ createdAt: -1 });
      
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/applications/:id (Protected - Admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/applications/:id/status (Protected - Admin only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'];
    
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid application status.' });
    }

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
