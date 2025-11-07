const mongoose = require('mongoose');

const employeeHelpRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  sessionId: { type: String, required: true, unique: true }, // Unique session for each chat
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  messages: [{
    sender: { type: String, required: true, enum: ['user', 'bot'] }, // 'user' or 'bot'
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    options: [String], // For bot messages with options
    selectedOption: String // For user messages that were selected from options
  }]
});

module.exports = mongoose.model('EmployeeHelpRequest', employeeHelpRequestSchema);

