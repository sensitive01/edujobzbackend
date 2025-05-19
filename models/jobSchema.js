const mongoose = require('mongoose'); // <-- Add this line

const jobSchema = new mongoose.Schema({
  companyName: String,
  jobTitle: String,
  description: String,
  category: String,
  salaryFrom: Number,
  salaryTo: Number,
  salaryType: String,
  locationTypes: [String],
  skills: [String],
  benefits: String,
  createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Jobs', jobSchema);

module.exports = Job; // <-- Add this line