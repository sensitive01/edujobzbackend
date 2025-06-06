const express = require("express");
const multer = require("multer");
const employerRoute = express();

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

// employerRoute.put('/updatefavoritesave/:employid/:applicantId', jobController.updateFavStatusforsavecand);
employerRoute.get("/fetchshortlistcand/:id", jobController.shortlistcand);
employerRoute.put('/updatefavorite/:jobId/:applicantId', jobController.updateFavoriteStatus);
// employerRoute.put('/update-status/:jobId/:applicantId', jobController.updateApplicantStatus);
employerRoute.put('/update-status/:applicationId/:applicantId', jobController.updateApplicantStatus);

employerRoute.get("/fetchallnonpending/:employid", jobController.getNonPendingApplicantsByEmployId);

employerRoute.get("/viewallappliedcandi/:employid", jobController.getAllApplicantsByEmployId);
employerRoute.put('/updaee/:applicationId/:employid', jobController.updateFavStatusforsavecand);
// Example Express route for saving jobs
employerRoute.post('/savejob', async (req, res) => {
  try {
    const { applicantId, jobId } = req.body;

    // Find the job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already saved
    const alreadySaved = job.saved.some(savedJob => 
      savedJob.applicantId === applicantId
    );

    if (alreadySaved) {
      return res.status(400).json({ message: 'Job already saved' });
    }

    // Add to saved jobs
    job.saved.push({
      applicantId,
      saved: true
    });

    await job.save();

    res.status(201).json({ message: 'Job saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving job', error: error.message });
  }
});

module.exports = employerRoute;
