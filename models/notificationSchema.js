const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // employeeId or employerId
  userType: { type: String, required: true, enum: ['employee', 'employer'], index: true },
  title: { type: String, required: true },
  subtitle: { type: String, required: true }, // body/subtitle
  type: { type: String }, // e.g., 'application', 'interview', 'message', 'job', etc.
  relatedId: { type: String }, // ID of related entity (jobId, applicationId, etc.)
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional data for navigation
  readAt: { type: Date }
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ userId: 1, userType: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, userType: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);