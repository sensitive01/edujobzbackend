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
employeradminRoute.post('/employerloginAdmin', employeradminController.employerloginAdmin);
employeradminRoute.get('/fetchprofile/:id', employeradminController.employergetAdminById);
employeradminRoute.post('/employeradminforgotpassword', employeradminController.employeradminForgotPassword);
employeradminRoute.post('/employeradminverifyotp', employeradminController.employeradminVerifyOTP);
employeradminRoute.post('/employeradminchangepassword', employeradminController.employeradminChangePassword);
employeradminRoute.post('/createemployer', employeradminController.createemployersignUp);



employeradminRoute.get('/fetchallemployee', employeradminController.getAllEmployees);
employeradminRoute.get('/fetchallemployers', employeradminController.getAllEmployers);

module.exports = employeradminRoute;