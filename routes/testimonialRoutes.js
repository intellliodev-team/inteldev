const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Testimonial = require('../models/Testimonial');
const auth = require('../middleware/auth');

// Ensure uploads/testimonials directory exists
const uploadDir = path.join(__dirname, '../uploads/testimonials');
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
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'));
    }
  }
});

// Configure upload fields for two different file inputs
const testimonialUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 }
]);

// Get all testimonials (public)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    // Support filtering active status
    if (req.query.active !== undefined && req.query.active !== 'all') {
      filter.active = req.query.active === 'true';
    } else if (req.query.active === undefined) {
      // By default, public endpoint only returns active testimonials
      filter.active = true;
    }

    if (req.query.featured !== undefined) {
      filter.featured = req.query.featured === 'true';
    }

    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single testimonial (public/admin)
router.get('/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Testimonial (Admin only)
router.post('/', auth, testimonialUpload, async (req, res) => {
  try {
    const testimonialData = { ...req.body };

    // Set paths for uploaded files
    if (req.files) {
      if (req.files.profileImage && req.files.profileImage[0]) {
        testimonialData.profileImage = `/uploads/testimonials/${req.files.profileImage[0].filename}`;
      }
      if (req.files.companyLogo && req.files.companyLogo[0]) {
        testimonialData.companyLogo = `/uploads/testimonials/${req.files.companyLogo[0].filename}`;
      }
    }

    // Parse boolean and number values
    if (testimonialData.rating) testimonialData.rating = Number(testimonialData.rating);
    testimonialData.featured = testimonialData.featured === 'true' || testimonialData.featured === true;
    testimonialData.active = testimonialData.active === 'true' || testimonialData.active === true || testimonialData.active === undefined;

    // Sync company and companyName
    const comp = testimonialData.companyName || testimonialData.company;
    testimonialData.company = comp;
    testimonialData.companyName = comp;

    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Testimonial (Admin only)
router.put('/:id', auth, testimonialUpload, async (req, res) => {
  try {
    const testimonialData = { ...req.body };

    // Update paths for uploaded files
    if (req.files) {
      if (req.files.profileImage && req.files.profileImage[0]) {
        testimonialData.profileImage = `/uploads/testimonials/${req.files.profileImage[0].filename}`;
      }
      if (req.files.companyLogo && req.files.companyLogo[0]) {
        testimonialData.companyLogo = `/uploads/testimonials/${req.files.companyLogo[0].filename}`;
      }
    }

    // Parse boolean and number values
    if (testimonialData.rating) testimonialData.rating = Number(testimonialData.rating);
    if (testimonialData.featured !== undefined) {
      testimonialData.featured = testimonialData.featured === 'true' || testimonialData.featured === true;
    }
    if (testimonialData.active !== undefined) {
      testimonialData.active = testimonialData.active === 'true' || testimonialData.active === true;
    }

    // Sync company and companyName
    const comp = testimonialData.companyName || testimonialData.company;
    if (comp !== undefined) {
      testimonialData.company = comp;
      testimonialData.companyName = comp;
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      testimonialData,
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.json(testimonial);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Testimonial (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
