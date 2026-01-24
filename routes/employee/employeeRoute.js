const express = require("express");
const employeeController = require("../../controller/employeeController/employeeController");
const {
  profileImageStorage,
  resumeStorage,
  coverLetterStorage,
  profileVideoStorage,
  audioStorage,
} = require("../../config/cloudinary");
const jobController = require("../../controller/employerController/postjobcontroller");
const feedbackController = require("../../controller/employeeController/feedbackreview");
const employeeRoute = express.Router();
const multer = require("multer");
const emailverifycontroller = require("../../controller/employerController/emailverfycontoller");
// Determine storage based on fileType
const getStorage = (fileType) => {
  switch (fileType) {
    case "profileImage":
      return profileImageStorage;
    case "resume":
      return resumeStorage;
    case "coverLetter":
      return coverLetterStorage;
    case "profileVideo":
      return profileVideoStorage;
    case "audio":
      return audioStorage;

    default:
      return null;
  }
};

// Dynamic middleware for fileType-based upload
const dynamicUploadMiddleware = (req, res, next) => {
  console.log("file info:", req.file,req.file?.mimetype, req.file?.originalname);

  const fileType =
    req.query.fileType || req.headers["filetype"] || req.body.fileType;
  console.log("fileType", fileType);

  const storage = getStorage(fileType);

  if (!storage) {
    return res.status(400).json({ message: "Invalid or missing fileType" });
  }

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  }).single("file");

  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File size exceeds 10MB limit" });
      }
      console.log("error in upload", err);
      return res
        .status(500)
        .json({ message: "Upload error", error: err.message });
    }
    next();
  });
};

employeeRoute.post("/sendemailotp", emailverifycontroller.sendOtpToEmail);
employeeRoute.post("/verifyemailotp", emailverifycontroller.verifyEmailOtp);

// Existing routes
employeeRoute.post("/signup", employeeController.signUp);
employeeRoute.post("/login", employeeController.login);
employeeRoute.post("/google", employeeController.googleAuth);
employeeRoute.post("/google-v2", employeeController.googleAuthV2);
employeeRoute.post("/apple", employeeController.appleAuth);
employeeRoute.get("/fetchemployee/:id", employeeController.getEmployeeDetails);
employeeRoute.put(
  "/uploadprofilevideo/:employeeId",
  dynamicUploadMiddleware,
  employeeController.uploadProfileVideo
);

employeeRoute.put(
  "/uploadintroaudio/:employeeId",
  dynamicUploadMiddleware,
  employeeController.uploadIntroAudio
);

employeeRoute.get("/fetchallemployee", employeeController.getAllEmployees);
// Upload file to Cloudinary
employeeRoute.put(
  "/uploadfile/:employid",
  dynamicUploadMiddleware,
  employeeController.uploadFile
);

// Update profile
employeeRoute.put("/updateprofile/:employid", employeeController.updateProfile);
employeeRoute.post("/:jobId/apply", employeeController.applyForJob);
employeeRoute.get(
  "/job/:jobId/application/:applicantId/status",
  employeeController.getApplicationStatus
);

employeeRoute.get(
  "/applicant/:applicantId",
  employeeController.appliedjobsfetch
);
employeeRoute.get(
  "/fetchshorlitstedjobsemployee/:applicantId",
  jobController.getJobsWithNonPendingApplications
);

employeeRoute.get(
  "/getrejectedjob/:applicantId",
  jobController.getPendingJobs
);



employeeRoute.get(
  "/pendingJobs/:applicantId",
  jobController.getPendingJobs
);


employeeRoute.get("/percentage/:id", employeeController.getProfileCompletion);
employeeRoute.get("/getfeedback", feedbackController.fetchFeedback);
employeeRoute.post("/createfeedback", feedbackController.addFeedback);
employeeRoute.get(
  "/feedbackbyid/:userId",
  feedbackController.fetchFeedbackByUserId
);
employeeRoute.put("/updatefeedback/:userId", feedbackController.updateFeedback);

employeeRoute.post("/forgotpassword", employeeController.userForgotPassword);
employeeRoute.post("/verify-otp", employeeController.verifyOTP);
employeeRoute.post("/resend-otp", employeeController.userForgotPassword);
employeeRoute.post("/change-password", employeeController.userChangePassword);
employeeRoute.put(
  "/employeee-change-password/:candidateId",
  employeeController.candidateChangePassword
);
employeeRoute.get(
  "/verify-the-candidate-register-or-not/:candidateEmail",
  employeeController.verifyTheCandidateRegisterOrNot
);

employeeRoute.get("/get-job-alerts", employeeController.getDesiredJobAlerts);
employeeRoute.post("/add-job-alert", employeeController.addJobAlert);
employeeRoute.post("/addjobtoken", employeeController.addwithouttoeken);
employeeRoute.get(
  "/getalretjobs",
  employeeController.getDesiredJobAlertswithouttoken
);
employeeRoute.get(
  "/fetchAvailabilityStatus/:employeeId",
  employeeController.fetchAvailabilityStatus
);
employeeRoute.put(
  "/updateAvailabilityStatus/:employeeId",
  employeeController.updateAvailabilityStatus
);


employeeRoute.delete(
  "/delete-audio-record/:employeeId",
  employeeController.deleteAudioRecord
);

employeeRoute.delete(
  "/delete-profile-video-record/:employeeId",
  employeeController.deleteProfileAudioRecord
);


employeeRoute.delete(
  "/delete-cover-letter/:employeeId",
  employeeController.deleteCoverLetter
);

employeeRoute.delete(
  "/delete-resume/:employeeId",
  employeeController.deleteResumeLetter
);

employeeRoute.get("/get-header-categories-count",employeeController.getHeaderCategoriesCount)

// Employee Referral Routes
employeeRoute.get("/referral-list/:employeeId", employeeController.getReferralList);

// Employee Help Support Routes
const employeeHelpController = require("../../controller/employeeController/employeehelpController");
employeeRoute.get("/help-support/:employeeId", employeeHelpController.getOrCreateHelpSession);
employeeRoute.post("/help-support/save-message", employeeHelpController.saveMessage);
employeeRoute.get("/help-support/messages/:sessionId", employeeHelpController.getMessages);
employeeRoute.put("/help-support/close/:sessionId", employeeHelpController.closeSession);

// Employee Notification Routes
const employeeNotificationController = require("../../controller/employeeController/notificationController");
employeeRoute.get("/notifications/:employeeId", employeeNotificationController.getEmployeeNotifications);
employeeRoute.put("/notifications/:notificationId/read", employeeNotificationController.markNotificationAsRead);
employeeRoute.get("/notifications/:employeeId/unread-count", employeeNotificationController.getUnreadCount);

// Employee Plan Routes
const employeePlanController = require("../../controller/employeeController/employeeplanController");
employeeRoute.get("/plans", employeePlanController.getPlans);
employeeRoute.post("/plans/activate", employeePlanController.activatePlan);
employeeRoute.get("/verification-status/:employeeid", employeePlanController.getVerificationStatus);

module.exports = employeeRoute;
