const express = require("express");
const employeeController = require("../../controller/employeeController/employeeController");
const { profileImageStorage, resumeStorage, coverLetterStorage } = require("../../config/cloudinary");

const employeeRoute = express.Router();
const multer = require("multer");

// Determine storage based on fileType
const getStorage = (fileType) => {
  switch (fileType) {
    case 'profileImage':
      return profileImageStorage;
    case 'resume':
      return resumeStorage;
    case 'coverLetter':
      return coverLetterStorage;
    default:
      throw new Error('Invalid file type');
  }
};

const upload = (fileType) => {
  return multer({
    storage: getStorage(fileType),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = {
        profileImage: ['image/jpeg', 'image/jpg', 'image/png'],
        resume: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        coverLetter: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      };

      if (!allowedTypes[fileType].includes(file.mimetype)) {
        return cb(new Error('Invalid file format'), false);
      }
      cb(null, true);
    },
  }).single('file');
};

// Middleware to handle dynamic fileType
const uploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.body.fileType;
  if (!fileType) {
    return res.status(400).json({ message: 'File type (fileType) is required' });
  }

  try {
    upload(fileType)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid file type provided' });
  }
};

// Existing routes
employeeRoute.post('/signup', employeeController.signUp);
employeeRoute.post('/login', employeeController.login);
employeeRoute.post('/google', employeeController.googleAuth);
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);

// Upload file to Cloudinary
employeeRoute.put(
  '/uploadfile/:employid',
  uploadMiddleware,
  employeeController.uploadFile
);

// Update profile
employeeRoute.put('/updateprofile/:employid', employeeController.updateProfile);

module.exports = employeeRoute;
