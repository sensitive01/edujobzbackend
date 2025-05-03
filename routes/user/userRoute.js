const express = require("express");
const multer = require("multer");
const userRoute = express();

const userController = require("../../controller/userController/userAuthController");



userRoute.post('/signup', userController.signUp);

// Email/Mobile Login
userRoute.post('/login', userController.login);

// Google Sign-In
userRoute.post('/google', userController.googleAuth);

// Apple Sign-In
userRoute.post('/apple', userController.appleAuth);

module.exports = userRoute;
