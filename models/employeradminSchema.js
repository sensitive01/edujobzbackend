const mongoose = require('mongoose');

const employeradminSchema = new mongoose.Schema({
  uuid: { type: String, },
  employeradminUsername: { type: String, },
  employeradminEmail: { type: String,   },
  employeradminMobile: { type: String,  },
  employeradminPassword: { type: String,  }, // hash before saving!
  employeradminProfilePic: { type: String },
otp: { type: String },
otpExpiry: { type: Date },
 verificationstatus: { type: String, default: 'pending' },
  blockstatus: { type: String, default: 'unblock' },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the model
module.exports = mongoose.model('employerAdmin', employeradminSchema);
const profileViewSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'employee', required: true },
  viewedAt: { type: Date, default: Date.now }
});

// Create compound index to ensure one view per employer-employee pair
profileViewSchema.index({ employer: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('ProfileView', profileViewSchema);