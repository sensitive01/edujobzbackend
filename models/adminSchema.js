const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  uuid: { type: String, },
  adminUsername: { type: String, },
  adminEmail: { type: String,   },
  adminMobile: { type: String,  },
  adminPassword: { type: String,  }, // hash before saving!
  adminProfilePic: { type: String },

  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the model
module.exports = mongoose.model('Admin', adminSchema);
