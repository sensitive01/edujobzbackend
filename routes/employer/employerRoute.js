const express = require("express");
const multer = require("multer");
const employerRoute = express();
const meetingController = require("../../controller/employerController/meetingController")
const employerController = require("../../controller/employerController/employerController");
const jobController = require ("../../controller/employerController/postjobcontroller");
const { profileImageStorage, resumeStorage, coverLetterStorage } = require("../../config/cloudinary");



// Determine storage based on fileType
const getStorage = (fileType) => {
  switch (fileType) {
    case 'profileImage': return profileImageStorage;
    case 'resume': return resumeStorage;
    case 'coverLetter': return coverLetterStorage;
    default: return null;
  }
};

// Dynamic middleware for fileType-based upload
const dynamicUploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.body.fileType;
  const storage = getStorage(fileType);

  if (!storage) {
    return res.status(400).json({ message: 'Invalid or missing fileType' });
  }

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds 10MB limit' });
      }
      return res.status(500).json({ message: 'Upload error', error: err.message });
    }
    next();
  });
};


employerRoute.post('/signup', employerController.signUp);

// Email/Mobile Login
employerRoute.post('/login', employerController.login);

// Google Sign-In
employerRoute.post('/google', employerController.googleAuth);

// Apple Sign-In
employerRoute.post('/apple', employerController.appleAuth);
employerRoute.get('/fetchemployer/:id', employerController.getEmployerDetails);
employerRoute.put("/updateemployer/:id", employerController.updateEmployerDetails);
employerRoute.put('/uploadprofilepic/:employid', dynamicUploadMiddleware, employerController.updateProfilePicture);


employerRoute.post('/postjob', jobController.createJob);
employerRoute.get('/fetchjobs', jobController.getAllJobs);
employerRoute.get("/viewjobs/:id", jobController.getJobById);
employerRoute.get("/fetchjob/:employid", jobController.getJobsByEmployee);
employerRoute.get("/fetchappliedcand/:id", jobController.getAppliedCandidates);
employerRoute.get("/fetchfavcand/:employid", jobController.getFavouriteCandidates);

employerRoute.get('/listallemployer', employerController.listAllEmployees);
// employerRoute.put('/updatefavoritesave/:employid/:applicantId', jobController.updateFavStatusforsavecand);
employerRoute.get("/fetchshortlistcand/:id", jobController.shortlistcand);
employerRoute.put('/updatefavorite/:jobId/:applicantId', jobController.updateFavoriteStatus);
// employerRoute.put('/update-status/:jobId/:applicantId', jobController.updateApplicantStatus);
employerRoute.put('/update-status/:applicationId/:applicantId', jobController.updateApplicantStatus);

employerRoute.get("/fetchallnonpending/:employid", jobController.getNonPendingApplicantsByEmployId);

employerRoute.get("/viewallappliedcandi/:employid", jobController.getAllApplicantsByEmployId);
// employerRoute.put('/updaee/:applicationId/:employid', jobController.updateFavStatusforsavecand);

employerRoute.put('/updaee/:applicationId/:employid', jobController.updateFavStatusforsavecand);

employerRoute.get('/fetchAllJobs', jobController.fetchAllJobs);
employerRoute.post('/toggleSaveJob', jobController.toggleSaveJob);
employerRoute.get('/fetchSavedJobs/:employid', jobController.fetchSavedJobslist);
employerRoute.get('/fetchschooljobs', jobController.getSchoolEmployerJobs);
employerRoute.get('/fetchcompanyjobs', jobController.getcompnanyEmployerJobs);

employerRoute.post("/createmeeting", meetingController.create);
employerRoute.get("/fetchmeeting/:id", meetingController.getMeetingsByVendor);

employerRoute.post("/employerforgotpassword",employerController.employerForgotPassword)
employerRoute.post("/employerverify-otp",employerController.employerverifyOTP)
employerRoute.post("/employerresend-otp",employerController.employerForgotPassword)
employerRoute.post("/employerchange-password",employerController.employerChangePassword)

module.exports = employerRoute;
