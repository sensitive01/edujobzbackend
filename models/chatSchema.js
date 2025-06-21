const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
   
  },
  sender: {
    type: String, // "employee" or "employer"
 
  },
  isRead: {
    type: Boolean,
    default: false,
  },
    employeeImage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const chatSchema = new mongoose.Schema({
  employeeId: {
    type: String,

  },
  employeeImage: {
    type: String
  },
  employerId: {
    type: String,
    required: true
  },
  employerName: {
    type: String
  },
  employerImage: {
    type: String
  },
  jobId: {
    type: String,
    required: true
  },
  messages: [messageSchema]  // Array of messages inside the conversation
}, {
  timestamps: true
});

// Indexes to improve query performance
chatSchema.index({ employeeId: 1, employerId: 1, jobId: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
