const mongoose = require('mongoose');

const employeePlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  planType: {
    type: String,
    required: true,
    default: 'verified-badge'
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  gstPercentage: {
    type: Number,
    default: 18
  },
  verifiedBadge: {
    type: Boolean,
    default: true
  },
  validityDays: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total price with GST
employeePlanSchema.virtual('totalPrice').get(function () {
  return this.price + (this.price * this.gstPercentage / 100);
});

// Update updatedAt before saving
employeePlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const EmployeePlan = mongoose.model('EmployeePlan', employeePlanSchema);

module.exports = EmployeePlan;
