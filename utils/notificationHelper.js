const Notification = require('../models/notificationSchema');
const Employee = require('../models/employeeschema');
const Employer = require('../models/employerSchema');
const { sendMulticastNotification } = require('./fcmService');
const mongoose = require('mongoose');

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
    console.log(`📬 Creating notification for ${userType} ${userId}: ${title}`);
    
    // Convert string ID to ObjectId for proper storage
    let queryUserId;
    try {
      queryUserId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (error) {
      queryUserId = userId;
    }
    
    // Create notification in database
    const notification = new Notification({
      userId: queryUserId,
      userType,
      title,
      subtitle,
      type,
      relatedId,
      data,
      isRead: false,
    });

    await notification.save();
    console.log(`✅ Notification saved to database with ID: ${notification._id}`);

    // Get FCM tokens based on user type (using queryUserId already converted above)
    let fcmTokens = [];
    if (userType === 'employee') {
      const employee = await Employee.findById(queryUserId);
      if (employee) {
        console.log(`👤 Found employee: ${employee.userName || employee.userEmail}`);
        if (employee.employeefcmtoken && Array.isArray(employee.employeefcmtoken)) {
          fcmTokens = employee.employeefcmtoken.filter(token => token && token.trim() !== '');
          console.log(`📱 Found ${fcmTokens.length} FCM token(s) for employee`);
          if (fcmTokens.length === 0) {
            console.warn(`⚠️ Employee ${userId} has no valid FCM tokens stored`);
          }
        } else {
          console.warn(`⚠️ Employee ${userId} has no FCM token array or it's not an array`);
        }
      } else {
        console.error(`❌ Employee not found with ID: ${userId}`);
      }
    } else if (userType === 'employer') {
      const employer = await Employer.findById(queryUserId);
      if (employer) {
        console.log(`👤 Found employer: ${employer.schoolName || employer.uuid}`);
        if (employer.employerfcmtoken && Array.isArray(employer.employerfcmtoken)) {
          fcmTokens = employer.employerfcmtoken.filter(token => token && token.trim() !== '');
          console.log(`📱 Found ${fcmTokens.length} FCM token(s) for employer`);
          if (fcmTokens.length === 0) {
            console.warn(`⚠️ Employer ${userId} has no valid FCM tokens stored`);
          }
        } else {
          console.warn(`⚠️ Employer ${userId} has no FCM token array or it's not an array`);
        }
      } else {
        console.error(`❌ Employer not found with ID: ${userId}`);
      }
    }

    // Send FCM push notification if tokens exist
    if (fcmTokens.length > 0) {
      console.log(`🚀 Attempting to send FCM push notification to ${fcmTokens.length} device(s)`);
      const fcmData = {
        notificationId: notification._id.toString(),
        type: type || '',
        relatedId: relatedId || '',
        ...data,
      };

      const fcmResult = await sendMulticastNotification(fcmTokens, title, subtitle, fcmData);
      
      if (fcmResult.success) {
        console.log(`✅ FCM notification sent successfully. Success: ${fcmResult.successCount}, Failed: ${fcmResult.failureCount || 0}`);
      } else {
        console.error(`❌ FCM notification failed: ${fcmResult.error || 'Unknown error'}`);
      }

      // Remove invalid tokens if any
      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        console.log(`🧹 Removing ${fcmResult.invalidTokens.length} invalid FCM token(s)`);
        await removeInvalidTokens(userId, userType, fcmResult.invalidTokens);
      }
    } else {
      console.warn(`⚠️ No FCM tokens found for ${userType} ${userId}. Push notification not sent, but notification saved to database.`);
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    console.error('Error stack:', error.stack);
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

