const express = require("express");

const adminRout = express.Router();
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


// adminRoute.post('/signup', employeeController.signUp);
// adminRoute.post('/login', employeeController.login);
// adminRoute.post('/google', employeeController.googleAuth);
// adminRoute.post('/apple', employeeController.appleAuth);
// adminRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);

// Upload file to Cloudinary


module.exports = employeeRoute;