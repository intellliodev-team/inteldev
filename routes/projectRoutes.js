const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage Configuration for Projects
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tdc_projects',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { width: 800, crop: 'limit' }
    ]
  }
});

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all active projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true })
      .sort({ completionDate: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured projects
router.get('/featured', async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true, isFeatured: true })
      .limit(3);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const projectData = { ...req.body };
    
    // Handle Cloudinary image upload
    if (req.file) {
      const imageUrl = req.file.path;
      const publicId = req.file.filename || req.file.public_id;
      
      projectData.image = imageUrl;
      projectData.cloudinaryPublicId = publicId;
    }

    // Handle technologies as string or array
    if (typeof projectData.technologies === 'string') {
      projectData.technologies = projectData.technologies.split(',').map(tech => tech.trim()).filter(tech => tech);
    }

    // Handle boolean fields
    if (projectData.isFeatured !== undefined) {
      projectData.isFeatured = projectData.isFeatured === 'true' || projectData.isFeatured === true;
    }
    if (projectData.isActive !== undefined) {
      projectData.isActive = projectData.isActive === 'true' || projectData.isActive === true;
    }

    // Handle date field
    if (projectData.completionDate === '' || projectData.completionDate === null || projectData.completionDate === undefined) {
      projectData.completionDate = null;
    }

    const project = new Project(projectData);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const projectData = { ...req.body };

    // Handle Cloudinary image upload
    if (req.file) {
      const imageUrl = req.file.path;
      const publicId = req.file.filename || req.file.public_id;
      
      projectData.image = imageUrl;
      projectData.cloudinaryPublicId = publicId;

      // Delete old image from Cloudinary if it exists
      const existingProject = await Project.findById(req.params.id);
      if (existingProject && existingProject.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(existingProject.cloudinaryPublicId);
          console.log('Old project image deleted from Cloudinary:', existingProject.cloudinaryPublicId);
        } catch (deleteError) {
          console.error('Error deleting old project image from Cloudinary:', deleteError);
        }
      }
    }

    // Handle technologies as string or array
    if (typeof projectData.technologies === 'string') {
      projectData.technologies = projectData.technologies.split(',').map(tech => tech.trim()).filter(tech => tech);
    }

    // Handle boolean fields
    if (projectData.isFeatured !== undefined) {
      projectData.isFeatured = projectData.isFeatured === 'true' || projectData.isFeatured === true;
    }
    if (projectData.isActive !== undefined) {
      projectData.isActive = projectData.isActive === 'true' || projectData.isActive === true;
    }

    // Handle date field
    if (projectData.completionDate === '' || projectData.completionDate === null || projectData.completionDate === undefined) {
      projectData.completionDate = null;
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      projectData,
      { new: true, runValidators: true }
    );
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete image from Cloudinary if it exists
    if (project.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(project.cloudinaryPublicId);
        console.log('Project image deleted from Cloudinary:', project.cloudinaryPublicId);
      } catch (deleteError) {
        console.error('Error deleting project image from Cloudinary:', deleteError);
        // Continue with project deletion even if image deletion fails
      }
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;