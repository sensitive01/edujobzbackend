const cron = require('node-cron');
const Job = require('../models/jobSchema');
const OrganizedEvent = require('../models/events');
const Employee = require('../models/employeeschema');
const Employer = require('../models/employerSchema');
const notificationService = require('./notificationService');

/**
 * Scheduled notification jobs
 * These run periodically to send reminders and summaries
 */

/**
 * Send interview reminders (24 hours and 1 hour before)
 * Runs every hour
 */
const sendInterviewReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);

    // Find jobs with interviews scheduled for tomorrow (24h reminder)
    const jobsWithInterviews = await Job.find({
      'applications.interviewdate': { $exists: true, $ne: null },
      'applications.employapplicantstatus': 'Interview Scheduled'
    });

    for (const job of jobsWithInterviews) {
      for (const application of job.applications) {
        if (application.employapplicantstatus === 'Interview Scheduled' && 
            application.interviewdate && 
            application.interviewtime) {
          
          try {
            const interviewDate = new Date(application.interviewdate);
            const [hours, minutes] = application.interviewtime.split(':');
            interviewDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Check if interview is tomorrow (24h reminder)
            if (interviewDate >= tomorrow && interviewDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
              const employee = await Employee.findById(application.applicantId);
              const employer = await Employer.findById(job.employid);
              
              if (employee) {
                const employerName = employer ? 
                  `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.companyName || 'Employer' : 
                  'Employer';
                
                await notificationService.notifyEmployeeInterviewReminder24h(
                  application.applicantId,
                  job._id.toString(),
                  job.jobTitle,
                  employerName,
                  application.interviewdate,
                  application.interviewtime
                );
              }
              
              if (employer) {
                const applicantName = application.firstName || 'Applicant';
                await notificationService.notifyEmployerInterviewReminder24h(
                  job.employid,
                  application._id.toString(),
                  applicantName,
                  application.interviewdate,
                  application.interviewtime
                );
              }
            }

            // Check if interview is in 1 hour (1h reminder)
            if (interviewDate >= now && interviewDate <= oneHourLater) {
              const employee = await Employee.findById(application.applicantId);
              const employer = await Employer.findById(job.employid);
              
              if (employee) {
                const employerName = employer ? 
                  `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.companyName || 'Employer' : 
                  'Employer';
                
                await notificationService.notifyEmployeeInterviewReminder1h(
                  application.applicantId,
                  job._id.toString(),
                  job.jobTitle,
                  employerName,
                  application.interviewtime
                );
              }
              
              if (employer) {
                const applicantName = application.firstName || 'Applicant';
                await notificationService.notifyEmployerInterviewReminder1h(
                  job.employid,
                  application._id.toString(),
                  applicantName,
                  application.interviewtime
                );
              }
            }
          } catch (err) {
            console.error(`Error processing interview reminder for application ${application._id}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in sendInterviewReminders:', error);
  }
};

/**
 * Send job deadline reminders
 * Runs daily at 9 AM
 */
const sendJobDeadlineReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find jobs with deadlines in the next 7 days
    const jobs = await Job.find({
      deadline: { $exists: true, $ne: null },
      isActive: true
    });

    for (const job of jobs) {
      if (job.deadline) {
        const deadline = new Date(job.deadline);
        const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        // Notify if deadline is in 1, 3, or 7 days
        if (daysRemaining === 1 || daysRemaining === 3 || daysRemaining === 7) {
          const employer = await Employer.findById(job.employid);
          if (employer) {
            await notificationService.notifyEmployerJobDeadlineApproaching(
              job.employid,
              job._id.toString(),
              job.jobTitle,
              daysRemaining
            );
          }

          // Notify employees who saved this job
          if (job.saved && job.saved.length > 0) {
            for (const saved of job.saved) {
              if (saved.saved && saved.applicantId) {
                const employee = await Employee.findById(saved.applicantId);
                if (employee) {
                  const employerName = employer ? 
                    `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.companyName || 'Employer' : 
                    'Employer';
                  
                  await notificationService.notifyEmployeeJobDeadlineApproaching(
                    saved.applicantId,
                    job._id.toString(),
                    job.jobTitle,
                    employerName,
                    daysRemaining
                  );
                }
              }
            }
          }
        }

        // Notify if deadline has passed
        if (deadline < today && job.isActive) {
          const employer = await Employer.findById(job.employid);
          if (employer) {
            await notificationService.notifyEmployerJobExpired(
              job.employid,
              job._id.toString(),
              job.jobTitle
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in sendJobDeadlineReminders:', error);
  }
};

/**
 * Send event reminders
 * Runs daily at 8 AM
 */
const sendEventReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find events happening today or tomorrow
    const events = await OrganizedEvent.find({
      eventDate: { $exists: true, $ne: null }
    });

    for (const event of events) {
      try {
        const eventDate = new Date(event.eventDate);
        eventDate.setHours(0, 0, 0, 0);
        
        // Check if event is today or tomorrow
        if (eventDate.getTime() === today.getTime() || eventDate.getTime() === tomorrow.getTime()) {
          // Notify organizer
          if (event.organizerId) {
            await notificationService.notifyEmployerEventReminder(
              event.organizerId,
              event._id.toString(),
              event.title,
              event.eventDate,
              event.startTime
            );
          }

          // Notify all registered participants
          if (event.registrations && event.registrations.length > 0) {
            for (const registration of event.registrations) {
              if (registration.participantId) {
                await notificationService.notifyEmployeeEventReminder(
                  registration.participantId,
                  event._id.toString(),
                  event.title,
                  event.eventDate,
                  event.startTime
                );
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing event reminder for event ${event._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in sendEventReminders:', error);
  }
};

/**
 * Send daily/weekly application summaries to employers
 * Runs daily at 8 PM
 */
const sendApplicationSummaries = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find all employers with active jobs
    const employers = await Employer.find({ subscription: { $ne: 'false' } });

    for (const employer of employers) {
      try {
        // Find jobs with new applications from yesterday
        const jobs = await Job.find({
          employid: employer._id.toString(),
          isActive: true,
          'applications.appliedDate': {
            $gte: yesterday,
            $lt: today
          }
        });

        if (jobs.length > 0) {
          // Group by job
          const jobApplications = {};
          for (const job of jobs) {
            const newApplications = job.applications.filter(app => {
              const appDate = new Date(app.appliedDate);
              return appDate >= yesterday && appDate < today;
            });
            
            if (newApplications.length > 0) {
              jobApplications[job._id.toString()] = {
                jobTitle: job.jobTitle,
                count: newApplications.length
              };
            }
          }

          // Send summary for each job
          for (const [jobId, jobInfo] of Object.entries(jobApplications)) {
            await notificationService.notifyEmployerMultipleApplications(
              employer._id.toString(),
              jobInfo.count,
              jobInfo.jobTitle
            );
          }
        }
      } catch (err) {
        console.error(`Error processing application summary for employer ${employer._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in sendApplicationSummaries:', error);
  }
};

/**
 * Send recommended jobs to employees
 * Runs daily at 9 AM
 */
const sendRecommendedJobs = async () => {
  try {
    // This is a placeholder - implement job matching logic based on employee profile
    // For now, we'll skip this as it requires complex matching algorithms
    // You can implement this based on your job matching criteria
    
    console.log('Recommended jobs notification - implement job matching logic');
  } catch (error) {
    console.error('Error in sendRecommendedJobs:', error);
  }
};

/**
 * Send subscription expiry reminders (5 days before expiry)
 * Runs daily at 9 AM
 */
const sendSubscriptionExpiryReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    // Check employer subscriptions
    const Employer = require('../models/employerSchema');
    const employers = await Employer.find({
      'currentSubscription': { $ne: null },
      'subscription': 'true'
    });

    for (const employer of employers) {
      try {
        if (employer.currentSubscription && employer.currentSubscription.endDate) {
          const endDate = new Date(employer.currentSubscription.endDate);
          endDate.setHours(0, 0, 0, 0);
          
          // Check if expires in exactly 5 days
          if (endDate.getTime() === fiveDaysLater.getTime()) {
            const planName = employer.currentSubscription.planDetails?.name || 'Subscription Plan';
            await notificationService.notifyEmployerPlanExpiringSoon(
              employer._id.toString(),
              planName,
              5
            );
          }
        }
      } catch (err) {
        console.error(`Error processing subscription reminder for employer ${employer._id}:`, err);
      }
    }

    // Check employee subscriptions
    const Employee = require('../models/employeeschema');
    const employees = await Employee.find({
      'currentSubscription': { $ne: null },
      'subscription': 'true'
    });

    for (const employee of employees) {
      try {
        if (employee.currentSubscription && employee.currentSubscription.endDate) {
          const endDate = new Date(employee.currentSubscription.endDate);
          endDate.setHours(0, 0, 0, 0);
          
          // Check if expires in exactly 5 days
          if (endDate.getTime() === fiveDaysLater.getTime()) {
            const planName = employee.currentSubscription.planDetails?.name || 'Verified Badge Plan';
            await notificationService.notifyEmployeePlanExpiringSoon(
              employee._id.toString(),
              planName,
              5
            );
          }
        }
      } catch (err) {
        console.error(`Error processing subscription reminder for employee ${employee._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in sendSubscriptionExpiryReminders:', error);
  }
};

/**
 * Initialize scheduled jobs
 * Call this from your main server file (index.js)
 */
const initializeScheduledNotifications = () => {
  // Interview reminders - every hour
  cron.schedule('0 * * * *', sendInterviewReminders);

  // Job deadline reminders - daily at 9 AM
  cron.schedule('0 9 * * *', sendJobDeadlineReminders);

  // Event reminders - daily at 8 AM
  cron.schedule('0 8 * * *', sendEventReminders);

  // Application summaries - daily at 8 PM
  cron.schedule('0 20 * * *', sendApplicationSummaries);

  // Recommended jobs - daily at 9 AM
  cron.schedule('0 9 * * *', sendRecommendedJobs);

  // Subscription expiry reminders - daily at 9 AM
  cron.schedule('0 9 * * *', sendSubscriptionExpiryReminders);

  console.log('✅ Scheduled notifications initialized');
};

module.exports = {
  initializeScheduledNotifications,
  sendInterviewReminders,
  sendJobDeadlineReminders,
  sendEventReminders,
  sendApplicationSummaries,
  sendRecommendedJobs,
  sendSubscriptionExpiryReminders,
};

