const mongoose = require('mongoose');

const employerschema = new mongoose.Schema({
  uuid: String,
  googleId: String,
  appleId: String,
  schoolName: String,
    firstName: String,
  lastName: String,
  address:  String, 
  city:  String, 
  state: String, 
  pincode:  String, 
  institutionName:   String, 
  board:  String,
  institutionType:  String, 
  website:  String, 
  userEmail: String,
  userMobile: String,               // <-- Add this
  userPassword: String,            // <-- Add this
  userProfilePic: String,
    maritalStatus: { type: String, },
  languages: { type: [String] },
  github: { type: String },
  linkedin: { type: String },
  portfolio: { type: String },
  expectedSalary: { type: Number },
  currentCity: { type: String },
  totalExperience: { type: Number },
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Employer', employerschema);
