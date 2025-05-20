const express = require("express");
const multer = require("multer");
const employerRoute = express();

const employerController = require("../../controller/employerController/employerController");
const jobController = require ("../../controller/employerController/postjobcontroller");



employerRoute.post('/signup', employerController.signUp);

// Email/Mobile Login
employerRoute.post('/login', employerController.login);

// Google Sign-In
employerRoute.post('/google', employerController.googleAuth);

// Apple Sign-In
employerRoute.post('/apple', employerController.appleAuth);
employerRoute.get('/fetchemployer/:id', employerController.getEmployerDetails);
employerRoute.put("/updateemployer/:id", employerController.updateEmployerDetails);


employerRoute.post('/postjob', jobController.createJob);
employerRoute.get('/fetchjobs', jobController.getAllJobs);
employerRoute.get("/viewjobs/:id", jobController.getJobById);
employerRoute.get("/fetchjob/:employid", jobController.getJobsByEmployee);

module.exports = employerRoute;
