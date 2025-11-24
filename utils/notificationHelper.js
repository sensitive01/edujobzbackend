const Notification = require('../models/notificationSchema');
const Employee = require('../models/employeeschema');
const Employer = require('../models/employerSchema');
const { sendMulticastNotification } = require('./fcmService');

/**
 * Create and send notification to user
 * @param {string} userId - Employee or Employer ID
 * @param {string} userType - 'employee' or 'employer'
 * @param {string} title - Notification title
 * @param {string} subtitle - Notification subtitle/body
 * @param {string} type - Notification type (e.g., 'application', 'interview', 'message')
 * @param {string} relatedId - Related entity ID (jobId, applicationId, etc.)
 * @param {object} data - Additional data for navigation
 * @returns {Promise<object>} - Created notification
 */
const createAndSendNotification = async (userId, userType, title, subtitle, type = null, relatedId = null, data = {}) => {
  try {
    // Create notification in database
    const notification = new Notification({
      userId,
      userType,
      title,
      subtitle,
      type,
      relatedId,
      data,
      isRead: false,
    });

    await notification.save();

    // Get FCM tokens based on user type
    let fcmTokens = [];
    if (userType === 'employee') {
      const employee = await Employee.findById(userId);
      if (employee && employee.employeefcmtoken && Array.isArray(employee.employeefcmtoken)) {
        fcmTokens = employee.employeefcmtoken.filter(token => token && token.trim() !== '');
      }
    } else if (userType === 'employer') {
      const employer = await Employer.findById(userId);
      if (employer && employer.employerfcmtoken && Array.isArray(employer.employerfcmtoken)) {
        fcmTokens = employer.employerfcmtoken.filter(token => token && token.trim() !== '');
      }
    }

    // Send FCM push notification if tokens exist
    if (fcmTokens.length > 0) {
      const fcmData = {
        notificationId: notification._id.toString(),
        type: type || '',
        relatedId: relatedId || '',
        ...data,
      };

      const fcmResult = await sendMulticastNotification(fcmTokens, title, subtitle, fcmData);

      // Remove invalid tokens if any
      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        await removeInvalidTokens(userId, userType, fcmResult.invalidTokens);
      }
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

/**
 * Remove invalid FCM tokens from user record
 * @param {string} userId - User ID
 * @param {string} userType - 'employee' or 'employer'
 * @param {string[]} invalidTokens - Array of invalid tokens to remove
 */
const removeInvalidTokens = async (userId, userType, invalidTokens) => {
  try {
    if (userType === 'employee') {
      await Employee.findByIdAndUpdate(userId, {
        $pull: { employeefcmtoken: { $in: invalidTokens } }
      });
    } else if (userType === 'employer') {
      await Employer.findByIdAndUpdate(userId, {
        $pull: { employerfcmtoken: { $in: invalidTokens } }
      });
    }
    console.log(`✅ Removed ${invalidTokens.length} invalid FCM tokens for ${userType}: ${userId}`);
  } catch (error) {
    console.error('❌ Error removing invalid tokens:', error);
  }
};

module.exports = {
  createAndSendNotification,
  removeInvalidTokens,
};

