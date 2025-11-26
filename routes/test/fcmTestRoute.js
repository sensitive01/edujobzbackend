const express = require('express');
const { sendNotification, sendMulticastNotification } = require('../../utils/fcmService');
const router = express.Router();

/**
 * Test endpoint to send FCM notification to a single token
 * POST /test/fcm/send
 * Body: {
 *   "fcmToken": "your-fcm-token-here",
 *   "title": "Test Notification",
 *   "body": "This is a test notification",
 *   "data": {
 *     "key1": "value1",
 *     "key2": "value2"
 *   }
 * }
 */
router.post('/send', async (req, res) => {
  try {
    const { fcmToken, title, body, data } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'fcmToken is required'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required'
      });
    }

    const result = await sendNotification(fcmToken, title, body, data || {});

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Notification sent successfully',
        messageId: result.messageId,
        result
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        shouldRemoveToken: result.shouldRemoveToken,
        result
      });
    }
  } catch (error) {
    console.error('Error in FCM test endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test endpoint to send FCM notification to multiple tokens
 * POST /test/fcm/send-multicast
 * Body: {
 *   "fcmTokens": ["token1", "token2", "token3"],
 *   "title": "Test Notification",
 *   "body": "This is a test notification",
 *   "data": {
 *     "key1": "value1",
 *     "key2": "value2"
 *   }
 * }
 */
router.post('/send-multicast', async (req, res) => {
  try {
    const { fcmTokens, title, body, data } = req.body;

    if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fcmTokens array is required and must not be empty'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required'
      });
    }

    const result = await sendMulticastNotification(fcmTokens, title, body, data || {});

    return res.status(200).json({
      success: result.success,
      message: result.success 
        ? `Successfully sent ${result.successCount} notification(s)` 
        : 'Failed to send notifications',
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      invalidTokens: result.invalidTokens || [],
      error: result.error,
      result
    });
  } catch (error) {
    console.error('Error in FCM multicast test endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

