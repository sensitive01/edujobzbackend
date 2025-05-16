const express = require("express");
const employeeRoute = express();

const employeeController = require("../../controller/employeeController/employeeController");

// multer & cloudinary storages
const multer = require('multer');
const {
  profileImageStorage,
  resumeStorage,
  coverLetterStorage,
} = require('../../config/cloudinary');

const uploadFileMiddleware = (req, res, next) => {
  let fileType = req.query.fileType;
  if (fileType) fileType = fileType.trim();

  const validFileTypes = ['profileImage', 'resume', 'coverLetter'];
  if (!fileType || !validFileTypes.includes(fileType)) {
    return res.status(400).json({
      message: 'Invalid or missing fileType',
      receivedFileType: fileType,
      validFileTypes,
    });
  }

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
  }

  // multer expects the file field to match fileType
  const upload = multer({ storage }).single(fileType);

  upload(req, res, function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};



// Existing routes
employeeRoute.post('/signup', employeeController.signUp);
employeeRoute.post('/login', employeeController.login);
employeeRoute.post('/google', employeeController.googleAuth);
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);
employeeRoute.put('/updateprofile/:employid', employeeController.updateProfile);

// NEW: Upload file route with middleware
employeeRoute.post('/uploadfile/:employid', uploadFileMiddleware, employeeController.uploadFile);

module.exports = employeeRoute;
