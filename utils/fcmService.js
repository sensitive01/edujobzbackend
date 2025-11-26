const admin = require('firebase-admin');
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = require('../config/variables');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Check if we have the required Firebase credentials from variables
    if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      // Construct service account object from individual credentials
      const serviceAccount = {
        type: 'service_account',
        project_id: FIREBASE_PROJECT_ID || 'edujobz-d714c',
        private_key_id: '', // Not required for initialization
        private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
        client_email: FIREBASE_CLIENT_EMAIL,
        client_id: '', // Not required for initialization
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(FIREBASE_CLIENT_EMAIL)}`,
        universe_domain: 'googleapis.com'
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with credentials from variables');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fallback: Try to initialize with service account from environment variable (legacy support)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with service account (legacy method)');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Fallback: Initialize with service account file path (legacy support)
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID || 'edujobz-d714c'
      });
      console.log('✅ Firebase Admin initialized with service account file (legacy method)');
    } else {
      console.warn('⚠️ Firebase Admin not initialized. FCM notifications will not work.');
      console.warn('Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in environment variables.');
      console.warn('Or use FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH (legacy methods).');
      console.warn('Using default project ID: edujobz-d714c');
      // Try with default project ID
      try {
        admin.initializeApp({
          projectId: FIREBASE_PROJECT_ID || 'edujobz-d714c'
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

  // Convert all data values to strings (FCM requirement)
  const stringifiedData = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    stringifiedData[key] = value !== null && value !== undefined ? String(value) : '';
  });

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      ...stringifiedData,
      title: String(title || ''),
      body: String(body || ''),
    },
    token: fcmToken,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Important for Flutter
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
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

  // Convert all data values to strings (FCM requirement)
  const stringifiedData = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    stringifiedData[key] = value !== null && value !== undefined ? String(value) : '';
  });

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      ...stringifiedData,
      title: String(title || ''),
      body: String(body || ''),
    },
    tokens: validTokens,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Important for Flutter
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
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

