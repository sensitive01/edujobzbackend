const express = require("express");
const employeeController = require("../../controller/employeeController/employeeController");
const { profileImageStorage, resumeStorage, coverLetterStorage } = require("../../config/cloudinary");

const employeeRoute = express.Router();
const multer = require("multer");

// Determine storage based on fileType
const getStorage = (fileType) => {
  switch (fileType) {
    case 'profileImage': return profileImageStorage;
    case 'resume': return resumeStorage;
    case 'coverLetter': return coverLetterStorage;
    default: return null;
  }
};


const dynamicUploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.body.fileType;
  let storage;

  switch (fileType) {
    case 'profileImage':
      storage = profileImageStorage;
      break;
    case 'resume':
      storage = resumeStorage;
      break;
    case 'coverLetter':
      storage = coverLetterStorage;
      break;
    default:
      return res.status(400).json({ message: 'Invalid file type' });
  }

  const upload = multer({ storage }).single('file');
  upload(req, res, next);
};

// Existing routes
employeeRoute.post('/signup', employeeController.signUp);
employeeRoute.post('/login', employeeController.login);
employeeRoute.post('/google', employeeController.googleAuth);
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);

// Upload file to Cloudinary
employeeRoute.post(
  '/uploadfile/:employid',
  dynamicUploadMiddleware,
  employeeController.uploadFile
);

// Update profile
employeeRoute.put('/updateprofile/:employid', employeeController.updateProfile);

module.exports = employeeRoute;
