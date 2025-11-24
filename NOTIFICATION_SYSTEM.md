# Notification System Documentation

## Overview

This notification system provides comprehensive push notifications for both employers and employees based on various events in the EduJobz platform. All notifications are sent via Firebase Cloud Messaging (FCM) and stored in the database.

## Features

- ✅ Real-time push notifications via FCM
- ✅ Notification history stored in database
- ✅ Automatic token management (removes invalid tokens)
- ✅ Scheduled notifications for reminders and summaries
- ✅ Comprehensive notification types for all major events

## Notification Types

### For Employers

#### 1. Application-Related
- **New Application Received** - When an employee applies for a job
- **Application Withdrawn** - When an employee withdraws their application
- **Multiple Applications** - Daily/weekly summary of new applications

#### 2. Candidate Management
- **Candidate Shortlisted** - Confirmation when shortlisting a candidate
- **Candidate Status Update** - When employee updates profile/availability
- **Candidate Saved** - When you save a candidate to your list

#### 3. Interview & Hiring
- **Interview Scheduled** - Confirmation when scheduling an interview
- **Interview Reminder** - 24 hours and 1 hour before interview
- **Interview Cancelled/Rescheduled** - When employee requests changes
- **Application Accepted** - When you accept an application
- **Application Rejected** - When you reject an application

#### 4. Job Posting
- **Job Posted Successfully** - Confirmation when job is posted
- **Job Status Changed** - When job is activated/deactivated
- **Job Deadline Approaching** - Reminder before deadline (7, 3, 1 days)
- **Job Expired** - When deadline passes
- **Job Views** - Periodic summary of job views

#### 5. Messages & Communication
- **New Message** - When employee sends a message
- **Unread Messages** - Count of unread messages

#### 6. Events
- **Event Registration** - When employee registers for your event
- **Event Reminder** - Before event starts

#### 7. System & Updates
- **Profile Update Required** - When profile info is incomplete
- **Account Verification** - Verification status updates

### For Employees

#### 1. Application Status
- **Application Submitted** - Confirmation when application is submitted
- **Application Viewed** - When employer views your application
- **Application Shortlisted** - When you're shortlisted
- **Application Accepted** - When your application is accepted
- **Application Rejected** - When your application is rejected
- **Application Status Changed** - Any status update

#### 2. Interview
- **Interview Scheduled** - When employer schedules an interview
- **Interview Reminder** - 24 hours and 1 hour before
- **Interview Cancelled/Rescheduled** - When employer changes interview
- **Interview Link/Venue Details** - When details are shared

#### 3. Job Opportunities
- **New Job Matches** - Based on profile/preferences
- **Job Saved** - Confirmation when saving a job
- **Job Deadline Approaching** - Reminder before deadline
- **Job Closed** - When a saved job closes
- **Recommended Jobs** - Daily/weekly recommendations

#### 4. Messages & Communication
- **New Message** - When employer sends a message
- **Unread Messages** - Count of unread messages

#### 5. Profile & Account
- **Profile Viewed** - When employer views your profile
- **Profile Incomplete** - Reminder to complete profile
- **Availability Status** - Reminder to update availability
- **Account Verification** - Verification status updates

#### 6. Events
- **Event Registration Confirmed** - Confirmation of registration
- **Event Reminder** - Before event starts
- **New Events** - When new events are posted

#### 7. System & Updates
- **Password Changed** - Security notification
- **Login from New Device** - Security alert
- **App Updates** - New features/updates

## File Structure

```
backend/edujobzbackend/
├── utils/
│   ├── fcmService.js              # FCM push notification service
│   ├── notificationHelper.js      # Helper functions for creating notifications
│   ├── notificationService.js     # All notification type functions
│   └── scheduledNotifications.js  # Scheduled jobs for reminders
├── models/
│   └── notificationSchema.js     # Notification database schema
└── controller/
    ├── employeeController/        # Employee controllers (with notifications)
    └── employerController/        # Employer controllers (with notifications)
```

## Usage

### Sending a Notification

```javascript
const notificationService = require('./utils/notificationService');

// Example: Notify employer of new application
await notificationService.notifyEmployerNewApplication(
  employerId,
  jobId,
  applicationId,
  applicantName,
  jobTitle
);

// Example: Notify employee of application status
await notificationService.notifyEmployeeApplicationShortlisted(
  employeeId,
  jobId,
  jobTitle,
  employerName
);
```

### Integration Points

Notifications are automatically sent from the following controllers:

1. **Application Controllers**
   - `employeeController/employeeController.js` - `applyForJob()` - Sends notifications when employee applies
   - `employerController/postjobcontroller.js` - `updateApplicantStatus()` - Sends notifications on status changes

2. **Job Posting Controllers**
   - `employerController/postjobcontroller.js` - `createJob()` - Job posted notification
   - `employerController/postjobcontroller.js` - `updateJobActiveStatus()` - Job status change notification
   - `employerController/postjobcontroller.js` - `toggleSaveJob()` - Job saved notification

3. **Chat Controllers**
   - `employerController/chatController.js` - `sendMessage()` - New message notifications

4. **Event Controllers**
   - `employerController/upcomeevent.js` - `registerInEvent()` - Event registration notifications
   - `employerController/upcomeevent.js` - `createsEvent()` - New event notifications

5. **Saved Candidate Controllers**
   - `employerController/savedCandiateControlller.js` - `toggleSaveCandidate()` - Candidate saved notification

## Scheduled Notifications

Scheduled notifications run automatically via cron jobs:

- **Interview Reminders** - Every hour (24h and 1h before)
- **Job Deadline Reminders** - Daily at 9 AM (7, 3, 1 days before)
- **Event Reminders** - Daily at 8 AM (for events today/tomorrow)
- **Application Summaries** - Daily at 8 PM (for employers)
- **Recommended Jobs** - Daily at 9 AM (for employees)

These are initialized in `index.js` when the server starts.

## Notification Data Structure

Each notification includes:

```javascript
{
  userId: ObjectId,           // Employee or Employer ID
  userType: 'employee' | 'employer',
  title: String,              // Notification title
  subtitle: String,           // Notification body
  type: String,               // Notification type (e.g., 'application', 'interview')
  relatedId: String,          // Related entity ID (jobId, applicationId, etc.)
  isRead: Boolean,            // Read status
  data: Object,               // Additional data for navigation
  createdAt: Date,
  readAt: Date
}
```

## FCM Token Management

- FCM tokens are stored in user models (`employeefcmtoken` for employees, `employerfcmtoken` for employers)
- Invalid tokens are automatically removed when FCM returns an error
- Supports multiple tokens per user (for multiple devices)

## Environment Variables

Make sure these are set in your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT=<JSON string> OR
FIREBASE_SERVICE_ACCOUNT_PATH=<path to service account file> OR
FIREBASE_PROJECT_ID=<project ID>
```

## Testing Notifications

To test notifications manually:

```javascript
const notificationService = require('./utils/notificationService');

// Test employer notification
await notificationService.notifyEmployerNewApplication(
  'employer_id_here',
  'job_id_here',
  'application_id_here',
  'John Doe',
  'Software Engineer'
);
```

## Error Handling

All notification functions include error handling:
- Errors are logged but don't break the main application flow
- Invalid FCM tokens are automatically cleaned up
- Database errors are caught and logged

## Future Enhancements

Potential improvements:
- Email notifications as fallback
- Notification preferences/settings
- Batch notifications for better performance
- Notification analytics
- Rich notifications with images
- In-app notification center UI

## Support

For issues or questions about the notification system, check:
- `utils/fcmService.js` - FCM integration
- `utils/notificationHelper.js` - Core notification functions
- `utils/notificationService.js` - All notification types
- `utils/scheduledNotifications.js` - Scheduled jobs

