const mongoose = require('mongoose');

const employeePlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  planType: {
    type: String,
    required: true,
    enum: ['verified-badge'],
    default: 'verified-badge'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  gstPercentage: {
    type: Number,
    default: 18
  },
  verifiedBadge: {
    type: Boolean,
    default: true,
    required: true
  },
  validityDays: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    trim: true
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

// Update the updatedAt field before saving
employeePlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const EmployeePlan = mongoose.model('EmployeePlan', employeePlanSchema);

module.exports = EmployeePlan;

