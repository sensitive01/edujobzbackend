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
    maritalStatus:  String,

  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Employer', employerschema);
