const express = require("express");
const router = express.Router();
const employeradminController = require("../../controller/employeradminController/employeradminController");
const emailverifycontroller = require("../../controller/employerController/emailverfycontoller")
const employerAdminRoute = express.Router();
const multer = require("multer");

const profileImageStorage = multer.memoryStorage();
const resumeStorage = multer.memoryStorage();
const coverLetterStorage = multer.memoryStorage();
const profileVideoStorage = multer.memoryStorage();
const audioStorage = multer.memoryStorage();
// const {
//   profileImageStorage,


// } = require('../../config/cloudinary');
// Determine storage based on fileType
const getStorage = (fileType) => {
  switch (fileType) {
    case 'profileImage': return profileImageStorage;
    case 'resume': return resumeStorage;
    case 'coverLetter': return coverLetterStorage;
    case 'profileVideo': return profileVideoStorage;
    case 'audio': return audioStorage;
    default: return null;
  }
};


// Dynamic middleware for fileType-based upload
const dynamicUploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.headers['filetype'] || req.body.fileType;

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

employerAdminRoute.post('/sendemailotp', emailverifycontroller.sendOtpToEmailEmployer);
employerAdminRoute.post('/verifyemailotp', emailverifycontroller.verifyEmailOtpEmployer);

employerAdminRoute.post('/employeradminsignup', employeradminController.employersignupAdmin);
employerAdminRoute.post('/employerloginAdmin', employeradminController.employerloginAdmin);
employerAdminRoute.get('/fetchprofile/:id', employeradminController.employergetAdminById);
employerAdminRoute.post('/employeradminforgotpassword', employeradminController.employeradminForgotPassword);
employerAdminRoute.post('/employeradminverifyotp', employeradminController.employeradminVerifyOTP);
employerAdminRoute.post('/employeradminchangepassword', employeradminController.employeradminChangePassword);
employerAdminRoute.post('/createemployer', employeradminController.createemployersignUp);



employerAdminRoute.delete('/deleteunit/:id', employeradminController.deleteunit);



employerAdminRoute.get('/fetchbyorg/:organizationid', employeradminController.getEmployersByOrganizationId);

employerAdminRoute.get('/fetchallemployee', employeradminController.getAllEmployees);
employerAdminRoute.get('/fetchallemployers', employeradminController.getAllEmployers);
employerAdminRoute.put('/updateemployeradmin/:id', dynamicUploadMiddleware, employeradminController.updateEmployerAdmin);

// employeradminRoute.get('/fetchsubunitjobs/:applicantId', employeradminController.getJobsByApplicant);
employerAdminRoute.get('/getjobsbyorg/:employerAdminId', employeradminController.getJobsByEmployerAdmin);


module.exports = employerAdminRoute;