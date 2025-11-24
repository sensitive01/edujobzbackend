const { createAndSendNotification } = require('./notificationHelper');
const Job = require('../models/jobSchema');
const Employee = require('../models/employeeschema');
const Employer = require('../models/employerSchema');
const OrganizedEvent = require('../models/events');

/**
 * ============================================
 * EMPLOYER NOTIFICATIONS
 * ============================================
 */

/**
 * 1. APPLICATION-RELATED NOTIFICATIONS FOR EMPLOYERS
 */

// New application received
exports.notifyEmployerNewApplication = async (employerId, jobId, applicationId, applicantName, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'New Application Received',
      `${applicantName} applied for ${jobTitle}`,
      'application',
      applicationId,
      { jobId, applicantName, jobTitle, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employer of new application:', error);
  }
};

// Application withdrawn
exports.notifyEmployerApplicationWithdrawn = async (employerId, jobId, applicationId, applicantName, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Application Withdrawn',
      `${applicantName} withdrew their application for ${jobTitle}`,
      'application',
      applicationId,
      { jobId, applicantName, jobTitle, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employer of application withdrawal:', error);
  }
};

// Multiple applications summary (to be called by scheduled job)
exports.notifyEmployerMultipleApplications = async (employerId, count, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'New Applications Summary',
      `You have ${count} new application${count > 1 ? 's' : ''} for ${jobTitle}`,
      'application_summary',
      null,
      { count, jobTitle, action: 'view_applications' }
    );
  } catch (error) {
    console.error('Error notifying employer of multiple applications:', error);
  }
};

/**
 * 2. CANDIDATE MANAGEMENT NOTIFICATIONS FOR EMPLOYERS
 */

// Candidate shortlisted
exports.notifyEmployerCandidateShortlisted = async (employerId, candidateId, candidateName, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Candidate Shortlisted',
      `${candidateName} has been shortlisted for ${jobTitle}`,
      'candidate_shortlisted',
      candidateId,
      { candidateName, jobTitle, action: 'view_candidate' }
    );
  } catch (error) {
    console.error('Error notifying employer of candidate shortlisted:', error);
  }
};

// Candidate status update
exports.notifyEmployerCandidateStatusUpdate = async (employerId, candidateId, candidateName, status) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Candidate Status Updated',
      `${candidateName} updated their profile/availability`,
      'candidate_update',
      candidateId,
      { candidateName, status, action: 'view_candidate' }
    );
  } catch (error) {
    console.error('Error notifying employer of candidate status update:', error);
  }
};

// Candidate saved
exports.notifyEmployerCandidateSaved = async (employerId, candidateId, candidateName) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Candidate Saved',
      `${candidateName} has been saved to your candidates list`,
      'candidate_saved',
      candidateId,
      { candidateName, action: 'view_saved_candidates' }
    );
  } catch (error) {
    console.error('Error notifying employer of candidate saved:', error);
  }
};

/**
 * 3. INTERVIEW & HIRING NOTIFICATIONS FOR EMPLOYERS
 */

// Interview scheduled confirmation
exports.notifyEmployerInterviewScheduled = async (employerId, interviewId, candidateName, interviewDate, interviewTime) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Interview Scheduled',
      `Interview with ${candidateName} scheduled for ${interviewDate} at ${interviewTime}`,
      'interview_scheduled',
      interviewId,
      { candidateName, interviewDate, interviewTime, action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error notifying employer of interview scheduled:', error);
  }
};

// Interview reminder (24 hours before)
exports.notifyEmployerInterviewReminder24h = async (employerId, interviewId, candidateName, interviewDate, interviewTime) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Interview Reminder',
      `Interview with ${candidateName} is tomorrow at ${interviewTime}`,
      'interview_reminder',
      interviewId,
      { candidateName, interviewDate, interviewTime, reminderType: '24h', action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error sending 24h interview reminder to employer:', error);
  }
};

// Interview reminder (1 hour before)
exports.notifyEmployerInterviewReminder1h = async (employerId, interviewId, candidateName, interviewTime) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Interview Starting Soon',
      `Interview with ${candidateName} starts in 1 hour at ${interviewTime}`,
      'interview_reminder',
      interviewId,
      { candidateName, interviewTime, reminderType: '1h', action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error sending 1h interview reminder to employer:', error);
  }
};

// Interview cancelled/rescheduled
exports.notifyEmployerInterviewCancelled = async (employerId, interviewId, candidateName, reason) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Interview Cancelled',
      `${candidateName} requested to ${reason === 'reschedule' ? 'reschedule' : 'cancel'} the interview`,
      'interview_cancelled',
      interviewId,
      { candidateName, reason, action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error notifying employer of interview cancellation:', error);
  }
};

// Application accepted
exports.notifyEmployerApplicationAccepted = async (employerId, applicationId, candidateName, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Application Accepted',
      `You accepted ${candidateName}'s application for ${jobTitle}`,
      'application_accepted',
      applicationId,
      { candidateName, jobTitle, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employer of application accepted:', error);
  }
};

// Application rejected
exports.notifyEmployerApplicationRejected = async (employerId, applicationId, candidateName, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Application Rejected',
      `You rejected ${candidateName}'s application for ${jobTitle}`,
      'application_rejected',
      applicationId,
      { candidateName, jobTitle, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employer of application rejected:', error);
  }
};

/**
 * 4. JOB POSTING NOTIFICATIONS FOR EMPLOYERS
 */

// Job posted successfully
exports.notifyEmployerJobPosted = async (employerId, jobId, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Job Posted Successfully',
      `Your job "${jobTitle}" has been posted successfully`,
      'job_posted',
      jobId,
      { jobTitle, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employer of job posted:', error);
  }
};

// Job status changed
exports.notifyEmployerJobStatusChanged = async (employerId, jobId, jobTitle, isActive) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Job Status Changed',
      `Your job "${jobTitle}" has been ${isActive ? 'activated' : 'deactivated'}`,
      'job_status_changed',
      jobId,
      { jobTitle, isActive, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employer of job status change:', error);
  }
};

// Job deadline approaching
exports.notifyEmployerJobDeadlineApproaching = async (employerId, jobId, jobTitle, daysRemaining) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Job Deadline Approaching',
      `Your job "${jobTitle}" deadline is in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      'job_deadline',
      jobId,
      { jobTitle, daysRemaining, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employer of job deadline:', error);
  }
};

// Job expired
exports.notifyEmployerJobExpired = async (employerId, jobId, jobTitle) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Job Expired',
      `Your job "${jobTitle}" deadline has passed`,
      'job_expired',
      jobId,
      { jobTitle, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employer of job expired:', error);
  }
};

// Job views summary (to be called by scheduled job)
exports.notifyEmployerJobViews = async (employerId, jobId, jobTitle, viewCount) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Job Views Summary',
      `Your job "${jobTitle}" has ${viewCount} view${viewCount > 1 ? 's' : ''}`,
      'job_views',
      jobId,
      { jobTitle, viewCount, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employer of job views:', error);
  }
};

/**
 * 5. MESSAGES & COMMUNICATION NOTIFICATIONS FOR EMPLOYERS
 */

// New message
exports.notifyEmployerNewMessage = async (employerId, employeeId, employeeName, jobTitle, messagePreview) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'New Message',
      `${employeeName}: ${messagePreview || 'Sent you a message'}`,
      'message',
      employeeId,
      { employeeName, jobTitle, messagePreview, action: 'open_chat' }
    );
  } catch (error) {
    console.error('Error notifying employer of new message:', error);
  }
};

// Unread messages count
exports.notifyEmployerUnreadMessages = async (employerId, unreadCount) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Unread Messages',
      `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
      'unread_messages',
      null,
      { unreadCount, action: 'view_messages' }
    );
  } catch (error) {
    console.error('Error notifying employer of unread messages:', error);
  }
};

/**
 * 6. EVENTS NOTIFICATIONS FOR EMPLOYERS
 */

// Event registration
exports.notifyEmployerEventRegistration = async (employerId, eventId, eventTitle, participantName) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Event Registration',
      `${participantName} registered for your event "${eventTitle}"`,
      'event_registration',
      eventId,
      { eventTitle, participantName, action: 'view_event' }
    );
  } catch (error) {
    console.error('Error notifying employer of event registration:', error);
  }
};

// Event reminder
exports.notifyEmployerEventReminder = async (employerId, eventId, eventTitle, eventDate, eventTime) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Event Reminder',
      `Your event "${eventTitle}" is starting soon on ${eventDate} at ${eventTime}`,
      'event_reminder',
      eventId,
      { eventTitle, eventDate, eventTime, action: 'view_event' }
    );
  } catch (error) {
    console.error('Error sending event reminder to employer:', error);
  }
};

/**
 * 7. SYSTEM & UPDATES NOTIFICATIONS FOR EMPLOYERS
 */

// Profile update required
exports.notifyEmployerProfileUpdateRequired = async (employerId) => {
  try {
    await createAndSendNotification(
      employerId,
      'employer',
      'Profile Update Required',
      'Your profile information is incomplete. Please update your profile.',
      'profile_update',
      null,
      { action: 'update_profile' }
    );
  } catch (error) {
    console.error('Error notifying employer of profile update required:', error);
  }
};

// Account verification
exports.notifyEmployerAccountVerification = async (employerId, status) => {
  try {
    const statusText = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
    await createAndSendNotification(
      employerId,
      'employer',
      'Account Verification',
      `Your account verification is ${statusText}`,
      'account_verification',
      null,
      { status, action: 'view_profile' }
    );
  } catch (error) {
    console.error('Error notifying employer of account verification:', error);
  }
};

/**
 * ============================================
 * EMPLOYEE NOTIFICATIONS
 * ============================================
 */

/**
 * 1. APPLICATION STATUS NOTIFICATIONS FOR EMPLOYEES
 */

// Application submitted
exports.notifyEmployeeApplicationSubmitted = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Submitted',
      `Your application for ${jobTitle} at ${employerName} has been submitted successfully`,
      'application_submitted',
      jobId,
      { jobTitle, employerName, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application submitted:', error);
  }
};

// Application viewed
exports.notifyEmployeeApplicationViewed = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Viewed',
      `${employerName} viewed your application for ${jobTitle}`,
      'application_viewed',
      jobId,
      { jobTitle, employerName, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application viewed:', error);
  }
};

// Application shortlisted
exports.notifyEmployeeApplicationShortlisted = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Shortlisted',
      `Congratulations! You've been shortlisted for ${jobTitle} at ${employerName}`,
      'application_shortlisted',
      jobId,
      { jobTitle, employerName, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application shortlisted:', error);
  }
};

// Application accepted
exports.notifyEmployeeApplicationAccepted = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Accepted',
      `Congratulations! Your application for ${jobTitle} at ${employerName} has been accepted`,
      'application_accepted',
      jobId,
      { jobTitle, employerName, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application accepted:', error);
  }
};

// Application rejected
exports.notifyEmployeeApplicationRejected = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Status Update',
      `Your application for ${jobTitle} at ${employerName} was not selected`,
      'application_rejected',
      jobId,
      { jobTitle, employerName, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application rejected:', error);
  }
};

// Application status changed
exports.notifyEmployeeApplicationStatusChanged = async (employeeId, jobId, jobTitle, employerName, newStatus) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Application Status Updated',
      `Your application status for ${jobTitle} at ${employerName} has been updated to ${newStatus}`,
      'application_status_changed',
      jobId,
      { jobTitle, employerName, newStatus, action: 'view_application' }
    );
  } catch (error) {
    console.error('Error notifying employee of application status change:', error);
  }
};

/**
 * 2. INTERVIEW NOTIFICATIONS FOR EMPLOYEES
 */

// Interview scheduled
exports.notifyEmployeeInterviewScheduled = async (employeeId, jobId, jobTitle, employerName, interviewDate, interviewTime, interviewType, interviewLink, interviewVenue) => {
  try {
    const locationInfo = interviewType === 'Online' ? `Link: ${interviewLink}` : `Venue: ${interviewVenue}`;
    await createAndSendNotification(
      employeeId,
      'employee',
      'Interview Scheduled',
      `Interview scheduled for ${jobTitle} at ${employerName} on ${interviewDate} at ${interviewTime}. ${locationInfo}`,
      'interview_scheduled',
      jobId,
      { jobTitle, employerName, interviewDate, interviewTime, interviewType, interviewLink, interviewVenue, action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error notifying employee of interview scheduled:', error);
  }
};

// Interview reminder (24 hours before)
exports.notifyEmployeeInterviewReminder24h = async (employeeId, jobId, jobTitle, employerName, interviewDate, interviewTime) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Interview Reminder',
      `Your interview for ${jobTitle} at ${employerName} is tomorrow at ${interviewTime}`,
      'interview_reminder',
      jobId,
      { jobTitle, employerName, interviewDate, interviewTime, reminderType: '24h', action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error sending 24h interview reminder to employee:', error);
  }
};

// Interview reminder (1 hour before)
exports.notifyEmployeeInterviewReminder1h = async (employeeId, jobId, jobTitle, employerName, interviewTime) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Interview Starting Soon',
      `Your interview for ${jobTitle} at ${employerName} starts in 1 hour at ${interviewTime}`,
      'interview_reminder',
      jobId,
      { jobTitle, employerName, interviewTime, reminderType: '1h', action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error sending 1h interview reminder to employee:', error);
  }
};

// Interview cancelled/rescheduled
exports.notifyEmployeeInterviewCancelled = async (employeeId, jobId, jobTitle, employerName, reason) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Interview Updated',
      `${employerName} ${reason === 'reschedule' ? 'rescheduled' : 'cancelled'} your interview for ${jobTitle}`,
      'interview_cancelled',
      jobId,
      { jobTitle, employerName, reason, action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error notifying employee of interview cancellation:', error);
  }
};

// Interview link/venue details
exports.notifyEmployeeInterviewDetails = async (employeeId, jobId, jobTitle, employerName, interviewLink, interviewVenue) => {
  try {
    const details = interviewLink ? `Interview Link: ${interviewLink}` : `Venue: ${interviewVenue}`;
    await createAndSendNotification(
      employeeId,
      'employee',
      'Interview Details',
      `${employerName} shared interview details for ${jobTitle}. ${details}`,
      'interview_details',
      jobId,
      { jobTitle, employerName, interviewLink, interviewVenue, action: 'view_interview' }
    );
  } catch (error) {
    console.error('Error notifying employee of interview details:', error);
  }
};

/**
 * 3. JOB OPPORTUNITIES NOTIFICATIONS FOR EMPLOYEES
 */

// New job matches
exports.notifyEmployeeNewJobMatches = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'New Job Match',
      `New job matching your profile: ${jobTitle} at ${employerName}`,
      'job_match',
      jobId,
      { jobTitle, employerName, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employee of new job match:', error);
  }
};

// Job saved
exports.notifyEmployeeJobSaved = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Job Saved',
      `You saved ${jobTitle} at ${employerName}`,
      'job_saved',
      jobId,
      { jobTitle, employerName, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employee of job saved:', error);
  }
};

// Job deadline approaching
exports.notifyEmployeeJobDeadlineApproaching = async (employeeId, jobId, jobTitle, employerName, daysRemaining) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Job Deadline Approaching',
      `Application deadline for ${jobTitle} at ${employerName} is in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      'job_deadline',
      jobId,
      { jobTitle, employerName, daysRemaining, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employee of job deadline:', error);
  }
};

// Job closed
exports.notifyEmployeeJobClosed = async (employeeId, jobId, jobTitle, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Job Closed',
      `The job ${jobTitle} at ${employerName} has been closed`,
      'job_closed',
      jobId,
      { jobTitle, employerName, action: 'view_job' }
    );
  } catch (error) {
    console.error('Error notifying employee of job closed:', error);
  }
};

// Recommended jobs (to be called by scheduled job)
exports.notifyEmployeeRecommendedJobs = async (employeeId, jobCount) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Recommended Jobs',
      `We found ${jobCount} new job${jobCount > 1 ? 's' : ''} that match your profile`,
      'job_recommendations',
      null,
      { jobCount, action: 'view_jobs' }
    );
  } catch (error) {
    console.error('Error notifying employee of recommended jobs:', error);
  }
};

/**
 * 4. MESSAGES & COMMUNICATION NOTIFICATIONS FOR EMPLOYEES
 */

// New message
exports.notifyEmployeeNewMessage = async (employeeId, employerId, employerName, jobTitle, messagePreview) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'New Message',
      `${employerName}: ${messagePreview || 'Sent you a message'}`,
      'message',
      employerId,
      { employerName, jobTitle, messagePreview, action: 'open_chat' }
    );
  } catch (error) {
    console.error('Error notifying employee of new message:', error);
  }
};

// Unread messages count
exports.notifyEmployeeUnreadMessages = async (employeeId, unreadCount) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Unread Messages',
      `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
      'unread_messages',
      null,
      { unreadCount, action: 'view_messages' }
    );
  } catch (error) {
    console.error('Error notifying employee of unread messages:', error);
  }
};

/**
 * 5. PROFILE & ACCOUNT NOTIFICATIONS FOR EMPLOYEES
 */

// Profile viewed
exports.notifyEmployeeProfileViewed = async (employeeId, employerId, employerName) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Profile Viewed',
      `${employerName} viewed your profile`,
      'profile_viewed',
      employerId,
      { employerName, action: 'view_profile' }
    );
  } catch (error) {
    console.error('Error notifying employee of profile viewed:', error);
  }
};

// Profile incomplete
exports.notifyEmployeeProfileIncomplete = async (employeeId) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Complete Your Profile',
      'Your profile is incomplete. Complete it to get more job opportunities.',
      'profile_incomplete',
      null,
      { action: 'update_profile' }
    );
  } catch (error) {
    console.error('Error notifying employee of profile incomplete:', error);
  }
};

// Availability status reminder
exports.notifyEmployeeAvailabilityReminder = async (employeeId) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Update Availability',
      'Remember to update your availability status to get better job matches',
      'availability_reminder',
      null,
      { action: 'update_availability' }
    );
  } catch (error) {
    console.error('Error notifying employee of availability reminder:', error);
  }
};

// Account verification
exports.notifyEmployeeAccountVerification = async (employeeId, status) => {
  try {
    const statusText = status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
    await createAndSendNotification(
      employeeId,
      'employee',
      'Account Verification',
      `Your account verification is ${statusText}`,
      'account_verification',
      null,
      { status, action: 'view_profile' }
    );
  } catch (error) {
    console.error('Error notifying employee of account verification:', error);
  }
};

/**
 * 6. EVENTS NOTIFICATIONS FOR EMPLOYEES
 */

// Event registration confirmed
exports.notifyEmployeeEventRegistrationConfirmed = async (employeeId, eventId, eventTitle) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Event Registration Confirmed',
      `Your registration for "${eventTitle}" has been confirmed`,
      'event_registration',
      eventId,
      { eventTitle, action: 'view_event' }
    );
  } catch (error) {
    console.error('Error notifying employee of event registration:', error);
  }
};

// Event reminder
exports.notifyEmployeeEventReminder = async (employeeId, eventId, eventTitle, eventDate, eventTime) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Event Reminder',
      `Your event "${eventTitle}" is starting soon on ${eventDate} at ${eventTime}`,
      'event_reminder',
      eventId,
      { eventTitle, eventDate, eventTime, action: 'view_event' }
    );
  } catch (error) {
    console.error('Error sending event reminder to employee:', error);
  }
};

// New events
exports.notifyEmployeeNewEvents = async (employeeId, eventId, eventTitle) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'New Event Available',
      `New event: "${eventTitle}" is now available`,
      'new_event',
      eventId,
      { eventTitle, action: 'view_event' }
    );
  } catch (error) {
    console.error('Error notifying employee of new event:', error);
  }
};

/**
 * 7. SYSTEM & UPDATES NOTIFICATIONS FOR EMPLOYEES
 */

// Password changed
exports.notifyEmployeePasswordChanged = async (employeeId) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Password Changed',
      'Your password has been changed successfully. If you did not make this change, please contact support.',
      'password_changed',
      null,
      { action: 'view_security' }
    );
  } catch (error) {
    console.error('Error notifying employee of password change:', error);
  }
};

// Login from new device
exports.notifyEmployeeLoginFromNewDevice = async (employeeId, deviceInfo) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'Login from New Device',
      `Your account was accessed from a new device: ${deviceInfo || 'Unknown device'}. If this wasn't you, please secure your account.`,
      'security_alert',
      null,
      { deviceInfo, action: 'view_security' }
    );
  } catch (error) {
    console.error('Error notifying employee of new device login:', error);
  }
};

// App updates
exports.notifyEmployeeAppUpdates = async (employeeId, updateMessage) => {
  try {
    await createAndSendNotification(
      employeeId,
      'employee',
      'App Update',
      updateMessage || 'New features and updates are available in the app',
      'app_update',
      null,
      { action: 'view_updates' }
    );
  } catch (error) {
    console.error('Error notifying employee of app update:', error);
  }
};

