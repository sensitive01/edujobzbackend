const mongoose = require('mongoose');

const employerschema = new mongoose.Schema({
  uuid: String,
  googleId: String,
  appleId: String,
  userName: String,
  userEmail: String,
  userMobile: String,               // <-- Add this
  userPassword: String,            // <-- Add this
  userProfilePic: String,
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Employer', employerschema);
