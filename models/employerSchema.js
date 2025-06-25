const mongoose = require('mongoose');

const employerSchema = new mongoose.Schema({
  uuid: { type: String, unique: true },
  googleId: String,
  appleId: String,
  schoolName: String,
  firstName: String,
  lastName: String,
  address: String, 
  city: String, 
  state: String, 
  pincode: String, 
      employerfcmtoken: { type: [String], default: [] },
  institutionName: String, 
  board: String,
  institutionType: String, 
  website: String, 
  userEmail: { type: String, unique: true, sparse: true },
  userMobile: { type: String, unique: true, sparse: true },
  userPassword: String,
  userProfilePic: String,
  employerType: String,
  
  // Referral system fields
  referralCode: { type: String, unique: true, uppercase: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' },
  referralCount: { type: Number, default: 0 },
  referralRewards: { type: Number, default: 0 },
  
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Generate referral code before saving
employerSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  next();
});

// Method to generate referral code
employerSchema.methods.generateReferralCode = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous characters
  let result = '';
  
  // First 3 characters from school name (if exists)
  if (this.schoolName) {
    result += this.schoolName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  } else {
    for (let i = 0; i < 3; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  // Add random characters
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

module.exports = mongoose.model('Employer', employerSchema);