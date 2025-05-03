const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  appleId: String,
  name: String,
  email: String,
  picture: String,
  password: String, // Only for email users
});

module.exports = mongoose.model('User', userSchema);
