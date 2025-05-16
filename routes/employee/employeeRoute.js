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

// Dynamic middleware for fileType-based upload
const dynamicUploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.body.fileType;
  const storage = getStorage(fileType);

  if (!storage) return res.status(400).json({ message: "Invalid or missing fileType" });

  const upload = multer({ storage }).single('file');
  upload(req, res, function (err) {
    if (err) return res.status(500).json({ message: "Upload error", error: err.message });
    next();
  });
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
