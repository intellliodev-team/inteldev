// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');
const dns = require('dns');

// Load env vars FIRST
dotenv.config();

// ---------------- DNS CONFIG ----------------
dns.setServers(["1.1.1.1", "8.8.8.8", "9.9.9.9"]);

// ---------------- MONGODB CONNECTION ----------------
const connectDB = require('./config/db');
connectDB();

const app = express();

// ---------------- UPDATED CORS CONFIG ----------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  // 'https://syncdeft.thedeftcrew.com',  // Your Hostinger domain
  // 'https://www.syncdeft.thedeftcrew.com', // With www
  // 'https://syncdeftserver-production.up.railway.app' // Your Railway backend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, true); // For development, allow all
      // callback(new Error('Not allowed by CORS')); // For production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/case-studies', require('./routes/caseStudyRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/newsletter', require('./routes/newsletterRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
});