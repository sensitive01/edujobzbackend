# FCM Service Testing Guide with Postman

This guide explains how to test the FCM (Firebase Cloud Messaging) service using Postman.

## Prerequisites

1. **FCM Token**: You need a valid FCM token from your Flutter app
   - The token is generated when the app registers with FCM
   - You can get it from the app logs or database (employee/employer FCM token fields)

2. **Server Running**: Make sure your backend server is running
   - Default port is usually defined in `config/variables.js`
   - Check console for: `Server is running at http://localhost:PORT`

3. **Firebase Configuration**: Ensure Firebase Admin is properly initialized
   - Check server logs for: `✅ Firebase Admin initialized...`
   - If not initialized, set environment variables:
     - `FIREBASE_SERVICE_ACCOUNT` (JSON string)
     - OR `FIREBASE_SERVICE_ACCOUNT_PATH` (file path)
     - OR `FIREBASE_PROJECT_ID`

## Test Endpoints

### 1. Send Single Notification

**Endpoint:** `POST http://localhost:PORT/test/fcm/send`

**Headers:**
```
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "fcmToken": "your-fcm-token-here",
  "title": "Test Notification",
  "body": "This is a test notification from Postman",
  "data": {
    "notificationId": "12345",
    "type": "test",
    "relatedId": "67890",
    "customKey": "customValue"
  }
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "messageId": "projects/edujobz-d714c/messages/0:1234567890",
  "result": {
    "success": true,
    "messageId": "projects/edujobz-d714c/messages/0:1234567890"
  }
}
```

**Example Response (Error):**
```json
{
  "success": false,
  "error": "Invalid token",
  "shouldRemoveToken": true,
  "result": {
    "success": false,
    "error": "Invalid token",
    "shouldRemoveToken": true
  }
}
```

### 2. Send Multicast Notification (Multiple Tokens)

**Endpoint:** `POST http://localhost:PORT/test/fcm/send-multicast`

**Headers:**
```
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "fcmTokens": [
    "token1-here",
    "token2-here",
    "token3-here"
  ],
  "title": "Multicast Test",
  "body": "This notification is sent to multiple devices",
  "data": {
    "notificationId": "12345",
    "type": "multicast_test",
    "relatedId": "67890"
  }
}
```

**Example Response (Success):**
```json
{
  "success": true,
  "message": "Successfully sent 2 notification(s)",
  "successCount": 2,
  "failureCount": 1,
  "invalidTokens": ["token3-here"],
  "error": null,
  "result": {
    "success": true,
    "invalidTokens": ["token3-here"],
    "successCount": 2,
    "failureCount": 1
  }
}
```

## Step-by-Step Postman Setup

### Method 1: Using Postman UI

1. **Open Postman** and create a new request

2. **Set Method**: Select `POST` from the dropdown

3. **Enter URL**: 
   ```
   http://localhost:3000/test/fcm/send
   ```
   (Replace `3000` with your actual server port)

4. **Set Headers**:
   - Click on "Headers" tab
   - Add: `Content-Type` = `application/json`

5. **Set Body**:
   - Click on "Body" tab
   - Select "raw"
   - Select "JSON" from dropdown
   - Paste the JSON request body (see examples above)

6. **Send Request**: Click "Send" button

7. **Check Response**: 
   - Status code should be `200` for success
   - Check the response body for results
   - Check server console logs for detailed information

### Method 2: Using Postman Collection (Import)

1. **Create Collection**:
   - Click "New" → "Collection"
   - Name it "FCM Testing"

2. **Add Requests**:
   - Right-click collection → "Add Request"
   - Create two requests:
     - "Send Single FCM Notification"
     - "Send Multicast FCM Notification"

3. **Configure Each Request** as described in Method 1

4. **Save Collection** for future use

## Getting FCM Token from Database

If you need to get an FCM token from your database:

### For Employee:
```javascript
// MongoDB query
db.employees.findOne({ _id: ObjectId("employee-id") }, { employeefcmtoken: 1 })
```

### For Employer:
```javascript
// MongoDB query
db.employers.findOne({ _id: ObjectId("employer-id") }, { employerfcmtoken: 1 })
```

## Common Issues & Solutions

### Issue 1: "Firebase not initialized"
**Solution**: 
- Check environment variables are set
- Check server logs for initialization errors
- Verify Firebase service account credentials

### Issue 2: "Invalid token"
**Solution**:
- Token might be expired or invalid
- Get a fresh token from the app
- Token format should be a long string (not empty)

### Issue 3: "No FCM tokens"
**Solution**:
- Ensure at least one valid token is provided
- Check token array is not empty
- Verify tokens are strings, not objects

### Issue 4: CORS Error
**Solution**:
- If testing from browser, ensure your origin is in `allowedOrigins` in `index.js`
- Or use Postman (doesn't have CORS restrictions)

## Testing Checklist

- [ ] Server is running
- [ ] Firebase Admin is initialized (check logs)
- [ ] Valid FCM token obtained
- [ ] Request body is valid JSON
- [ ] Content-Type header is set
- [ ] Check response status code
- [ ] Check response body for success/error
- [ ] Check server console logs for detailed info
- [ ] Verify notification received on device (if testing with real app)

## Expected Server Logs

When sending a notification, you should see logs like:

```
✅ Successfully sent FCM notification: projects/edujobz-d714c/messages/0:1234567890
```

Or for multicast:

```
✅ Successfully sent 2 FCM notifications
❌ Failed to send 1 notifications
```

## Notes

- All data payload values are automatically converted to strings (FCM requirement)
- Invalid tokens are automatically detected and returned in response
- The service handles both Android and iOS platforms
- Notifications include sound, badge, and click actions configured

