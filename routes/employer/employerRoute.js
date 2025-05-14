const express = require("express");
const multer = require("multer");
const employerRoute = express();

const employerController = require("../../controller/employerController/employerController");



employerRoute.post('/signup', employerController.signUp);

// Email/Mobile Login
employerRoute.post('/login', employerController.login);

// Google Sign-In
employerRoute.post('/google', employerController.googleAuth);

// Apple Sign-In
employerRoute.post('/apple', employerController.appleAuth);

module.exports = employerRoute;
