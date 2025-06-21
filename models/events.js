const mongoose = require('mongoose');

// Subdocument schema for registrations
const registrationSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  participantName: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  resumeLink: {
    type: String
  },
  profileImage: {
    type: String
  },
  registrationStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

// Main event schema
const organizedEventSchema = new mongoose.Schema({
  organizerId: {

  },
  title: {
    type: String,
  

  },
  description: String,
  category: {
    type: String,
   
  },
  eventDate: {
    type: String,

  },
  startTime: {
    type: String,
 
  },
  endTime: {
    type: String,
 
  },
  venue: {
    type: String,

  },
  coordinator: {
   
  },
  bannerImage: {
    type: String
  },
  totalRegistrations: {
    type: Number,
    default: 0
  },
  registrations: [registrationSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.OrganizedEvent || mongoose.model('OrganizedEvent', organizedEventSchema);
