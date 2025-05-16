const express = require("express");
const multer = require("multer");
const employeeRoute = express();
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
const employeeController = require("../../controller/employeeController/employeeController");
// ...existing code...
const { profileImageStorage, resumeStorage, coverLetterStorage } = require("../../config/cloudinary");
// ...existing code...
const uploadProfileImage = multer({ storage: profileImageStorage }).single('image');
const uploadResume = multer({ storage: resumeStorage }).single('file');
const uploadCoverLetter = multer({ storage: coverLetterStorage }).single('file');


employeeRoute.post('/signup', employeeController.signUp);

// Email/Mobile Login
employeeRoute.post('/login', employeeController.login);

// Google Sign-In
employeeRoute.post('/google', employeeController.googleAuth);

// Apple Sign-In
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);

const selectUploadMiddleware = (req, res, next) => {
  const { fileType } = req.query;

  if (fileType === 'profileImage') return uploadProfileImage(req, res, next);
  if (fileType === 'resume') return uploadResume(req, res, next);
  if (fileType === 'coverLetter') return uploadCoverLetter(req, res, next);

  return res.status(400).json({ message: 'Invalid file type' });
};

employeeRoute.post('/uploadfile/:employid', selectUploadMiddleware, employeeController.uploadFile);


employeeRoute.put('/updateprofile/:employid', uploadProfileImage, employeeController.updateProfile);

module.exports = employeeRoute;
