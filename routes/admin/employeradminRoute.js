const express = require("express");
const employeradminController = require("../../controller/employeradminController/employeradminController");
const employeeController = require("../../controller/employeeController/employeeController");
const employerController = require("../../controller/employerController/employerController");
const employeradminRoute = express.Router();
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


employeradminRoute.post('/employeradminsignup', employeradminController.employersignupAdmin);
employeradminRoute.post('/adminlogin', employeradminController.loginAdmin);
employeradminRoute.get('/fetchprofile/:id', employeradminController.getAdminById);
employeradminRoute.post('/adminforgotpassword', employeradminController.adminForgotPassword);
employeradminRoute.post('/adminverifyotp', employeradminController.adminverifyOTP);
employeradminRoute.post('/adminchangepassword', employeradminController.adminChangePassword);
employeradminRoute.post('/addemployee', employeeController.signUp);
employeradminRoute.post('/addemployer', employerController.signUp);
employeradminRoute.get('/fetchallemployee', employeradminController.getAllEmployees);
employeradminRoute.get('/fetchallemployers', employeradminController.getAllEmployers);

module.exports = employeradminRoute;