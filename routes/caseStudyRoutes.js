const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CaseStudy = require('../models/CaseStudy');
const auth = require('../middleware/auth');

// Ensure uploads/case-studies/videos directory exists
const uploadDir = path.join(__dirname, '../uploads/case-studies/videos');
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
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /mp4|webm|ogg|mov|mkv|quicktime/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /video/.test(file.mimetype) || filetypes.test(file.mimetype);
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only videos are allowed!'));
    }
  }
});

// Helper: Slugify title
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

// Get all active case studies
router.get('/', async (req, res) => {
  try {
    const query = req.query.active === 'all' ? {} : { active: true };
    const caseStudies = await CaseStudy.find(query).sort({ createdAt: -1 });
    res.json(caseStudies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured case studies (maximum 3)
router.get('/featured', async (req, res) => {
  try {
    const caseStudies = await CaseStudy.find({ active: true, featured: true })
      .sort({ createdAt: -1 })
      .limit(3);
    res.json(caseStudies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single case study by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findOne({ slug: req.params.slug, active: true });
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    res.json(caseStudy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single case study by ID (mainly for admin view/edit)
router.get('/id/:id', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    res.json(caseStudy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ----------------------------------------------------
// Admin Protected Endpoints
// ----------------------------------------------------

// Create case study
router.post('/', auth, upload.single('video'), async (req, res) => {
  try {
    const studyData = { ...req.body };
    
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required!' });
    }

    studyData.video = `/uploads/case-studies/videos/${req.file.filename}`;
    studyData.slug = slugify(studyData.title);

    // Parse booleans and arrays
    studyData.featured = studyData.featured === 'true' || studyData.featured === true;
    studyData.active = studyData.active === 'true' || studyData.active === true;
    
    if (typeof studyData.technologies === 'string') {
      studyData.technologies = studyData.technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    }

    const caseStudy = new CaseStudy(studyData);
    await caseStudy.save();
    res.status(201).json(caseStudy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update case study
router.put('/:id', auth, upload.single('video'), async (req, res) => {
  try {
    const studyData = { ...req.body };

    if (req.file) {
      studyData.video = `/uploads/case-studies/videos/${req.file.filename}`;
    }

    if (studyData.title) {
      studyData.slug = slugify(studyData.title);
    }

    // Parse booleans and arrays
    if (studyData.featured !== undefined) {
      studyData.featured = studyData.featured === 'true' || studyData.featured === true;
    }
    if (studyData.active !== undefined) {
      studyData.active = studyData.active === 'true' || studyData.active === true;
    }
    
    if (typeof studyData.technologies === 'string') {
      studyData.technologies = studyData.technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    }

    const caseStudy = await CaseStudy.findByIdAndUpdate(
      req.params.id,
      studyData,
      { new: true, runValidators: true }
    );

    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    res.json(caseStudy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete case study
router.delete('/:id', auth, async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndDelete(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    
    // Optionally delete the physical video file
    if (caseStudy.video) {
      const filePath = path.join(__dirname, '..', caseStudy.video);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Case study deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
