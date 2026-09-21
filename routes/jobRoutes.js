const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const auth = require('../middleware/auth');

// Get all jobs (supports filtering by status, featuredJob, activeJob)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.featuredJob) {
      filter.featuredJob = req.query.featuredJob === 'true';
    }
    if (req.query.activeJob) {
      filter.activeJob = req.query.activeJob === 'true';
    }

    const jobs = await Job.find(filter)
      .sort({ postedDate: -1 });

    const jobsWithCount = await Promise.all(jobs.map(async (job) => {
      const count = await JobApplication.countDocuments({ jobId: job._id });
      return {
        ...job.toObject(),
        applicationsCount: count
      };
    }));

    res.json(jobsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured jobs (only open and active)
router.get('/featured', async (req, res) => {
  try {
    const jobs = await Job.find({
      $or: [
        { featured: true },
        { featuredJob: true }
      ],
      status: 'Open',
      activeJob: { $ne: false },
      isActive: { $ne: false }
    }).sort({ postedDate: -1 });

    const jobsWithCount = await Promise.all(jobs.map(async (job) => {
      const count = await JobApplication.countDocuments({ jobId: job._id });
      return {
        ...job.toObject(),
        applicationsCount: count
      };
    }));

    res.json(jobsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const count = await JobApplication.countDocuments({ jobId: job._id });
    res.json({
      ...job.toObject(),
      applicationsCount: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
router.post('/', auth, async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;