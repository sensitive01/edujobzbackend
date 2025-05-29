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
 languages: [String],
  github: String ,
  linkedin:   String ,
  portfolio:  String ,
  expectedSalary: Number ,
  currentCity:  String ,
  totalExperience:Number ,
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Employer', employerschema);
