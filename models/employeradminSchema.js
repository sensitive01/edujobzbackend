const mongoose = require('mongoose');

const employeradminSchema = new mongoose.Schema({
  uuid: { type: String, },
  employeradminUsername: { type: String, },
  employeradminEmail: { type: String, },
  employeradminMobile: { type: String, },
  employeradminPassword: { type: String, }, // hash before saving!
  employeradminProfilePic: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date },
  verificationstatus: { type: String, default: 'pending' },
  blockstatus: { type: String, default: 'unblock' },
  isVerified: { type: Boolean, default: false },

  // New fields for plan activation flow
  isProfileCompleted: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  subscriptionEndDate: { type: Date },

  // Subscription and Limit tracking
  totalperdaylimit: { type: Number, default: 0 },
  totalprofileviews: { type: Number, default: 0 },
  totaldownloadresume: { type: Number, default: 0 },
  totaljobpostinglimit: { type: Number, default: 1 },
  subscriptionleft: { type: Number, default: 0 },
  subscription: { type: String, default: "false" },
  trial: { type: String, default: "false" },

  currentSubscription: {
    type: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
      planDetails: { type: Object },
      isTrial: Boolean,
      startDate: Date,
      endDate: Date,
      paymentDetails: { type: Object }
    },
    default: null
  },
  subscriptions: [{
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planDetails: { type: Object },
    isTrial: Boolean,
    startDate: Date,
    endDate: Date,
    paymentDetails: { type: Object },
    status: { type: String, default: 'active' }
  }],

  // Address info for profile completion check
  address: { type: String },
  state: { type: String },
  city: { type: String },
  taluk: { type: String },
  pincode: { type: String },
  landmark: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Exporting the model
module.exports = mongoose.model('employerAdmin', employeradminSchema);
