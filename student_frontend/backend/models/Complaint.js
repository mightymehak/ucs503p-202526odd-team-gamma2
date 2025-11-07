// models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  dateFound: {
    type: Date,
    required: true,
  },
  photo: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'matched', 'resolved'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Complaint', complaintSchema);