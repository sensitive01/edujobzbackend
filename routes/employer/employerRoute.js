const express = require("express");
const multer = require("multer");
const employerRoute = express();

const employeeController = require("../../controller/employerController/employerController");



employerRoute.post('/signup', employeeController.signUp);

// Email/Mobile Login
employerRoute.post('/login', employeeController.login);

// Google Sign-In
employerRoute.post('/google', employeeController.googleAuth);

// Apple Sign-In
employerRoute.post('/apple', employeeController.appleAuth);

module.exports = employerRoute;
