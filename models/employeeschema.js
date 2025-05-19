const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "Degree", "Diploma"
  degree: { type: String, required: true }, // e.g., "Bachelor of Science"
  institution: { type: String, required: true },
  startDate: { type: String, required: true }, // MM/YYYY format
  endDate: { type: String }, // MM/YYYY format (optional)
});

const workExperienceSchema = new mongoose.Schema({
  position: { type: String, required: true },
  company: { type: String, required: true },
  employmentType: { type: String, required: true }, // "Full-time", "Part-time", etc.
  startDate: { type: String, required: true }, // MM/YYYY format
  endDate: { type: String }, // MM/YYYY format (optional)
  description: { type: String },
});


const employeeschema = new mongoose.Schema({
  uuid: String,
  googleId: String,
  appleId: String,
  userName: String,
  userEmail: String,
  userMobile: String,               // <-- Add this
  userPassword: String,            // <-- Add this
  userProfilePic: String,
  isVerified: { type: Boolean, default: false },
   gender: { type: String, enum: ['Male', 'Female', 'Others'] },
  dob: { type: String }, // DD/MM/YYYY format
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  preferredLocation: { type: String },
  specialization: { type: String },
  gradeLevels: { type: [String] }, // Array of grade levels
  coverLetter: { type: String },
  skills: { type: [String] }, // Array of skills
  education: [educationSchema],
  workExperience: [workExperienceSchema],
resume: {
    name: { type: String },
    url: { type: String },
  },
  coverLetterFile: {
    name: { type: String },
    url: { type: String },
  },
  profilesummary: { type: String },
  profileImage: { type: String }, // URL to profile image
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('employee', employeeschema);
