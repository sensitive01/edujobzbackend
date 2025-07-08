const express = require("express");
const adminController = require("../../controller/adminController/adminController");
const adminRoute = express.Router();
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


adminRoute.post('/adminsignup', adminController.signupAdmin);
adminRoute.post('/adminlogin', adminController.loginAdmin);


// Upload file to Cloudinary


module.exports = adminRoute;