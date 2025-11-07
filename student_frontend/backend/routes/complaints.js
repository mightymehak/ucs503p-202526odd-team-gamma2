// routes/complaints.js
const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// @route   POST /api/complaints
// @desc    Create new complaint
// @access  Private
router.post('/', protect, upload.single('photo'), async (req, res) => {
  try {
    const { category, itemName, location, dateFound } = req.body;

    const complaint = await Complaint.create({
      userId: req.user._id,
      category,
      itemName,
      location,
      dateFound,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/complaints
// @desc    Get all complaints for logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/complaints/stats
// @desc    Get complaint statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Complaint.countDocuments({ userId: req.user._id });
    const matched = await Complaint.countDocuments({ userId: req.user._id, status: 'matched' });
    const resolved = await Complaint.countDocuments({ userId: req.user._id, status: 'resolved' });

    res.json({
      lost: total,
      matched,
      resolved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns this complaint
    if (complaint.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns this complaint
    if (complaint.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;