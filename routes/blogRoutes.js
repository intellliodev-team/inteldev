const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tdc_blogs',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
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

// Get all blogs (supports authorization check for admin draft access)
router.get('/', async (req, res) => {
  try {
    let showAll = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        jwt.verify(token, process.env.JWT_SECRET);
        showAll = true;
      } catch (err) {
        // Token invalid, treat as public
      }
    }

    const filter = showAll ? {} : { status: 'Published' };

    if (req.query.featured) {
      filter.featured = req.query.featured === 'true';
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const blogs = await Blog.find(filter)
      .sort({ publishedDate: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single blog by ID or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let blog;
    
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      blog = await Blog.findById(idOrSlug);
    }
    
    if (!blog) {
      blog = await Blog.findOne({ slug: idOrSlug });
    }

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get related blogs
router.get('/:idOrSlug/related', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let blog;
    
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      blog = await Blog.findById(idOrSlug);
    }
    
    if (!blog) {
      blog = await Blog.findOne({ slug: idOrSlug });
    }

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const related = await Blog.find({
      status: 'Published',
      category: blog.category,
      _id: { $ne: blog._id }
    })
    .sort({ publishedDate: -1 })
    .limit(3);

    res.json(related);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update the POST route to store public ID
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const blogData = { ...req.body };
    
    // Handle Cloudinary image upload
    if (req.file) {
      const imageUrl = req.file.path; // Cloudinary URL
      const publicId = req.file.filename || req.file.public_id; // Cloudinary public ID
      
      blogData.featuredImage = imageUrl;
      blogData.image = imageUrl;
      blogData.cloudinaryPublicId = publicId; // Store public ID for later deletion
    } else {
      if (blogData.image && !blogData.featuredImage) {
        blogData.featuredImage = blogData.image;
      } else if (blogData.featuredImage && !blogData.image) {
        blogData.image = blogData.featuredImage;
      }
    }

    if (typeof blogData.tags === 'string') {
      blogData.tags = blogData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // Typecast boolean/fields
    if (blogData.featured !== undefined) {
      blogData.featured = blogData.featured === 'true' || blogData.featured === true;
    }
    
    // Sync status and isPublished
    if (blogData.status) {
      blogData.isPublished = blogData.status === 'Published';
    } else if (blogData.isPublished !== undefined) {
      const isPub = blogData.isPublished === 'true' || blogData.isPublished === true;
      blogData.status = isPub ? 'Published' : 'Draft';
      blogData.isPublished = isPub;
    }

    const blog = new Blog(blogData);
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update the PUT route to handle public ID
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const blogData = { ...req.body };

    // Handle Cloudinary image upload
    if (req.file) {
      const imageUrl = req.file.path;
      const publicId = req.file.filename || req.file.public_id;
      
      blogData.featuredImage = imageUrl;
      blogData.image = imageUrl;
      blogData.cloudinaryPublicId = publicId;

      // Delete old image from Cloudinary
      const existingBlog = await Blog.findById(req.params.id);
      if (existingBlog && existingBlog.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(existingBlog.cloudinaryPublicId);
        } catch (deleteError) {
          console.error('Error deleting old image from Cloudinary:', deleteError);
        }
      }
    } else {
      if (blogData.image !== undefined) {
        blogData.featuredImage = blogData.image;
      }
    }

    if (typeof blogData.tags === 'string') {
      blogData.tags = blogData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Typecast boolean/fields
    if (blogData.featured !== undefined) {
      blogData.featured = blogData.featured === 'true' || blogData.featured === true;
    }

    // Sync status and isPublished
    if (blogData.status) {
      blogData.isPublished = blogData.status === 'Published';
    } else if (blogData.isPublished !== undefined) {
      const isPub = blogData.isPublished === 'true' || blogData.isPublished === true;
      blogData.status = isPub ? 'Published' : 'Draft';
      blogData.isPublished = isPub;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      blogData,
      { new: true, runValidators: true }
    );
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update DELETE route to use stored public ID
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete image from Cloudinary using stored public ID
    if (blog.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(blog.cloudinaryPublicId);
        console.log('Image deleted from Cloudinary:', blog.cloudinaryPublicId);
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;