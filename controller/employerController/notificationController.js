const Notification = require('../../models/notificationSchema');
const mongoose = require('mongoose');

/**
 * Get all notifications for an employer
 * GET /employer/notifications/:employerId
 */
const getEmployerNotifications = async (req, res) => {
  try {
    const { employerId } = req.params;
    console.log(`📬 [GET] /employer/notifications/${employerId} - Request received`);

    if (!employerId) {
      console.log('❌ Employer ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employer ID is required'
      });
    }

    // Convert string ID to ObjectId for proper querying
    let queryUserId;
    try {
      queryUserId = mongoose.Types.ObjectId.isValid(employerId) 
        ? new mongoose.Types.ObjectId(employerId) 
        : employerId;
    } catch (error) {
      queryUserId = employerId;
    }

    console.log(`🔍 Querying notifications for employerId: ${employerId} (ObjectId: ${queryUserId}), userType: employer`);
    const notifications = await Notification.find({
      userId: queryUserId,
      userType: 'employer'
    })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 notifications

    console.log(`✅ Found ${notifications.length} notifications for employer ${employerId}`);
    res.json({
      success: true,
      notifications: notifications
    });
  } catch (error) {
    console.error('❌ Error fetching employer notifications:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 * PUT /employer/notifications/:notificationId/read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: notification
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Get unread notification count
 * GET /employer/notifications/:employerId/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { employerId } = req.params;
    console.log(`📬 [GET] /employer/notifications/${employerId}/unread-count - Request received`);

    if (!employerId) {
      console.log('❌ Employer ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employer ID is required'
      });
    }

    // Convert string ID to ObjectId for proper querying
    let queryUserId;
    try {
      queryUserId = mongoose.Types.ObjectId.isValid(employerId) 
        ? new mongoose.Types.ObjectId(employerId) 
        : employerId;
    } catch (error) {
      queryUserId = employerId;
    }

    console.log(`🔍 Counting unread notifications for employerId: ${employerId} (ObjectId: ${queryUserId}), userType: employer`);
    const count = await Notification.countDocuments({
      userId: queryUserId,
      userType: 'employer',
      isRead: false
    });

    console.log(`✅ Unread count for employer ${employerId}: ${count}`);
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
};

module.exports = {
  getEmployerNotifications,
  markNotificationAsRead,
  getUnreadCount,
};

