const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uuid: String,
  googleId: String,
  appleId: String,
  userName: String,
  userEmail: String,
  userProfilePic: String,
  password: String,
  isVerified: { type: Boolean, default: false }
});


module.exports = mongoose.model('User', userSchema);
