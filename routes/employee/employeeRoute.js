const express = require("express");

const employeeController = require("../../controller/employeeController/employeeController");
const employeeRoute = express.Router();

const multer = require("multer");
const upload = multer({ dest: 'uploads/' });

// Existing routes
employeeRoute.post('/signup', employeeController.signUp);
employeeRoute.post('/login', employeeController.login);
employeeRoute.post('/google', employeeController.googleAuth);
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);

// File upload route
employeeRoute.post(
  '/uploadfile/:employid',
  upload.single('file'), // Multer middleware for file upload
  employeeController.uploadFile
);

// Profile update route
employeeRoute.put(
  '/updateprofile/:employid',
  employeeController.updateProfile
);

module.exports = employeeRoute;