const Notification = require('../../models/notificationSchema');
const mongoose = require('mongoose');

/**
 * Get all notifications for an employee
 * GET /employee/notifications/:employeeId
 */
const getEmployeeNotifications = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`📬 [GET] /notifications/${employeeId} - Request received`);

    if (!employeeId) {
      console.log('❌ Employee ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Convert string ID to ObjectId for proper querying
    let queryUserId;
    try {
      queryUserId = mongoose.Types.ObjectId.isValid(employeeId) 
        ? new mongoose.Types.ObjectId(employeeId) 
        : employeeId;
    } catch (error) {
      queryUserId = employeeId;
    }

    console.log(`🔍 Querying notifications for employeeId: ${employeeId} (ObjectId: ${queryUserId}), userType: employee`);
    const notifications = await Notification.find({
      userId: queryUserId,
      userType: 'employee'
    })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 notifications

    console.log(`✅ Found ${notifications.length} notifications for employee ${employeeId}`);
    res.json({
      success: true,
      notifications: notifications
    });
  } catch (error) {
    console.error('❌ Error fetching employee notifications:', error);
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
 * PUT /employee/notifications/:notificationId/read
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
 * GET /employee/notifications/:employeeId/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`📬 [GET] /notifications/${employeeId}/unread-count - Request received`);

    if (!employeeId) {
      console.log('❌ Employee ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Convert string ID to ObjectId for proper querying
    let queryUserId;
    try {
      queryUserId = mongoose.Types.ObjectId.isValid(employeeId) 
        ? new mongoose.Types.ObjectId(employeeId) 
        : employeeId;
    } catch (error) {
      queryUserId = employeeId;
    }

    console.log(`🔍 Counting unread notifications for employeeId: ${employeeId} (ObjectId: ${queryUserId}), userType: employee`);
    const count = await Notification.countDocuments({
      userId: queryUserId,
      userType: 'employee',
      isRead: false
    });

    console.log(`✅ Unread count for employee ${employeeId}: ${count}`);
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
  getEmployeeNotifications,
  markNotificationAsRead,
  getUnreadCount,
};

