const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  employeeId: {
    type:String,

  },
  name: {
    type: String,

  },
  email: {
    type: String,
 
  },
  phone: {
    type: String,
 
  },
  resume: {
    type: String,

  },
  status: {
    type: String,
   
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

const eventsSchema = new mongoose.Schema({
  employerId: {
    type: String,

  },
  title: {
    type: String,
  
  },
  description: {
    type: String,

  },
  type: {
    type: String,


  },
  date: {
    type: Date,

  },
  startTime: {
    type: String,
   
  },
  endTime: {
    type: String,

  },
  location: {
    type: String,

  },
  organizer: {
    type: String,
  
  },
  image: {
    type: String,
   
  },
  attendees: {
    type: Number,
    default: 0
  },
  enrollments: [enrollmentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});



module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);