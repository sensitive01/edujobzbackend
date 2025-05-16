const express = require("express");
const multer = require("multer");
const employeeRoute = express();

const employeeController = require("../../controller/employeeController/employeeController");



employeeRoute.post('/signup', employeeController.signUp);

// Email/Mobile Login
employeeRoute.post('/login', employeeController.login);

// Google Sign-In
employeeRoute.post('/google', employeeController.googleAuth);

// Apple Sign-In
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', employeeController.getEmployeeDetails);


employeeRoute.post('/uploadfile/:employid', employeeController.uploadFile);
employeeRoute.put('/updateprofile/:employid', employeeController.updateProfile);


module.exports = employeeRoute;
