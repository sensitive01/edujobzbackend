const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to initialize with service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Initialize with service account file path
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with service account file');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Initialize with default credentials (for Google Cloud environments)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with project ID (using default credentials)');
    } else {
      console.warn('⚠️ Firebase Admin not initialized. FCM notifications will not work.');
      console.warn('Please set FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_PATH, or FIREBASE_PROJECT_ID in environment variables.');
      console.warn('Using default project ID: edujobz-d714c');
      // Try with default project ID
      try {
        admin.initializeApp({
          projectId: 'edujobz-d714c'
        });
        console.log('✅ Firebase Admin initialized with default project ID');
      } catch (defaultError) {
        console.error('❌ Failed to initialize with default project ID:', defaultError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
}

/**
 * Send FCM push notification to a single token
 * @param {string} fcmToken - FCM token of the recipient
 * @param {string} title - Notification title
 * @param {string} body - Notification body/subtitle
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} - Result of the send operation
 */
const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('⚠️ Firebase Admin not initialized. Skipping FCM notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken) {
    console.warn('⚠️ No FCM token provided. Skipping notification.');
    return { success: false, error: 'No FCM token' };
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      ...data,
      title: title,
      body: body,
    },
    token: fcmToken,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent FCM notification:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, error: 'Invalid token', shouldRemoveToken: true };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM push notification to multiple tokens
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body/subtitle
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} - Result of the send operation
 */
const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('⚠️ Firebase Admin not initialized. Skipping FCM notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    console.warn('⚠️ No FCM tokens provided. Skipping notification.');
    return { success: false, error: 'No FCM tokens' };
  }

  // Filter out invalid tokens
  const validTokens = fcmTokens.filter(token => token && typeof token === 'string');

  if (validTokens.length === 0) {
    return { success: false, error: 'No valid FCM tokens' };
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      ...data,
      title: title,
      body: body,
    },
    tokens: validTokens,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Successfully sent ${response.successCount} FCM notifications`);
    console.log(`❌ Failed to send ${response.failureCount} notifications`);
    
    // Handle invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          if (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(validTokens[idx]);
          }
        }
      });
      
      if (invalidTokens.length > 0) {
        return { 
          success: response.successCount > 0, 
          invalidTokens,
          successCount: response.successCount,
          failureCount: response.failureCount
        };
      }
    }
    
    return { 
      success: response.successCount > 0, 
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('❌ Error sending multicast FCM notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendMulticastNotification,
};

