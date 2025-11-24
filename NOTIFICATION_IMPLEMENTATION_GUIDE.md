# Notification System Implementation Guide

## Overview
The notification system has been fully implemented on the backend. This guide explains how to use it and where to integrate notification creation in your existing code.

## Files Created/Modified

### 1. Models
- **`models/notificationSchema.js`** - Updated schema to match frontend requirements

### 2. Utilities
- **`utils/fcmService.js`** - FCM push notification service
- **`utils/notificationHelper.js`** - Helper function to create and send notifications

### 3. Controllers
- **`controller/employeeController/notificationController.js`** - Employee notification endpoints
- **`controller/employerController/notificationController.js`** - Employer notification endpoints

### 4. Routes
- **`routes/employee/employeeRoute.js`** - Added notification routes
- **`routes/employer/employerRoute.js`** - Added notification routes

## API Endpoints

### Employee Notifications
- `GET /employee/notifications/:employeeId` - Get all notifications
- `PUT /employee/notifications/:notificationId/read` - Mark as read
- `GET /employee/notifications/:employeeId/unread-count` - Get unread count

### Employer Notifications
- `GET /employer/notifications/:employerId` - Get all notifications
- `PUT /employer/notifications/:notificationId/read` - Mark as read
- `GET /employer/notifications/:employerId/unread-count` - Get unread count

## How to Create Notifications

### Using the Helper Function

Import the helper function:
```javascript
const { createAndSendNotification } = require('../utils/notificationHelper');
```

### Example: When Employee Applies for Job

```javascript
// In postjobcontroller.js or wherever job application is handled
const { createAndSendNotification } = require('../../utils/notificationHelper');

// After creating the application
await createAndSendNotification(
  employerId,                    // userId
  'employer',                    // userType
  'New Application Received',    // title
  `${employeeName} applied for ${jobTitle} position`, // subtitle
  'new_application',             // type
  applicationId,                 // relatedId
  {                              // data
    jobId: jobId,
    applicationId: applicationId,
    employeeId: employeeId,
    jobTitle: jobTitle
  }
);
```

### Example: When Application Status Changes

```javascript
// When employer updates application status
await createAndSendNotification(
  employeeId,                    // userId
  'employee',                    // userType
  'Application Status Updated', // title
  `Your application for ${jobTitle} has been ${status}`, // subtitle
  'application_status',          // type
  applicationId,                 // relatedId
  {                              // data
    jobId: jobId,
    applicationId: applicationId,
    status: status, // 'shortlisted', 'accepted', 'rejected'
    jobTitle: jobTitle
  }
);
```

### Example: When Interview is Scheduled

```javascript
await createAndSendNotification(
  employeeId,
  'employee',
  'Interview Scheduled',
  `Interview scheduled for ${jobTitle} on ${interviewDate}`,
  'interview_scheduled',
  applicationId,
  {
    jobId: jobId,
    applicationId: applicationId,
    interviewDate: interviewDate,
    interviewTime: interviewTime,
    interviewType: interviewType, // 'online' or 'offline'
    interviewLink: interviewLink,   // if online
    interviewVenue: interviewVenue // if offline
  }
);
```

### Example: When Message is Sent

```javascript
// In chatController.js
await createAndSendNotification(
  recipientId,
  recipientType, // 'employee' or 'employer'
  'New Message',
  `${senderName}: ${messageText.substring(0, 50)}...`,
  'message',
  chatId,
  {
    jobId: jobId,
    chatId: chatId,
    senderId: senderId
  }
);
```

## Where to Add Notifications

### For Employees:
1. **Application Submitted** - In `employeeController.js` → `applyForJob` function
2. **Application Status Changed** - In `postjobcontroller.js` → `updateApplicantStatus` function
3. **Interview Scheduled** - In `postjobcontroller.js` → `updateApplicantStatus` when status is 'Interview Scheduled'
4. **New Job Matches** - When new jobs are posted matching employee preferences
5. **Message Received** - In `chatController.js` → `sendMessage` function

### For Employers:
1. **New Application** - In `employeeController.js` → `applyForJob` function
2. **Message Received** - In `chatController.js` → `sendMessage` function
3. **Job Posted Successfully** - In `postjobcontroller.js` → `createJob` function
4. **Job Status Changed** - In `postjobcontroller.js` → `updateJobActiveStatus` function

## Firebase Configuration

### Environment Variables Required:

1. **Option 1: Service Account JSON (Recommended)**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}
```

2. **Option 2: Project ID (for Google Cloud environments)**
```env
FIREBASE_PROJECT_ID=your-project-id
```

### Getting Firebase Credentials:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copy the JSON content and set it as `FIREBASE_SERVICE_ACCOUNT` environment variable
   OR
4. Use the project ID if running on Google Cloud (App Engine, Cloud Run, etc.)

## Notification Types

### Employee Notification Types:
- `application` - General application updates
- `application_status` - Application status changed
- `shortlisted` - Application shortlisted
- `accepted` - Application accepted
- `rejected` - Application rejected
- `interview` - Interview related
- `interview_scheduled` - Interview scheduled
- `message` - New message from employer
- `job` - Job related
- `new_job` - New job posted

### Employer Notification Types:
- `application` - General application updates
- `new_application` - New application received
- `message` - New message from employee
- `job` - Job related
- `job_status` - Job status changes
- `shortlisted` - Candidate shortlisted
- `interview` - Interview updates

## Testing

### Test Notification Creation:
```javascript
const { createAndSendNotification } = require('./utils/notificationHelper');

// Test notification
await createAndSendNotification(
  'employee_id_here',
  'employee',
  'Test Notification',
  'This is a test notification',
  'test',
  null,
  {}
);
```

### Test API Endpoints:
```bash
# Get employee notifications
curl http://localhost:4000/employee/notifications/EMPLOYEE_ID

# Mark as read
curl -X PUT http://localhost:4000/employee/notifications/NOTIFICATION_ID/read

# Get unread count
curl http://localhost:4000/employee/notifications/EMPLOYEE_ID/unread-count
```

## Notes

1. **FCM Tokens**: Already stored during login in `employeefcmtoken` and `employerfcmtoken` arrays
2. **Invalid Tokens**: Automatically removed when FCM returns invalid token errors
3. **Multiple Tokens**: Supports multiple devices per user
4. **Database**: Notifications are stored in MongoDB and can be queried
5. **Push Notifications**: Sent automatically when notification is created

## Troubleshooting

### FCM Not Working:
1. Check Firebase Admin initialization in `utils/fcmService.js`
2. Verify environment variables are set correctly
3. Check Firebase service account has proper permissions
4. Verify FCM tokens are stored correctly in user documents

### Notifications Not Appearing:
1. Check database connection
2. Verify userId and userType are correct
3. Check notification schema matches
4. Verify routes are registered correctly

