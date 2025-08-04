const express = require("express");
const router = express.Router();
const planController = require('../../controller/employerController/employerplanController');
const mainadminRoute = express.Router();
const multer = require("multer");

mainadminRoute.get('/getallplans', planController.getAllPlans);
mainadminRoute.get('/getplans:id', planController.getPlanById);
mainadminRoute.post('/createplan',  planController.createPlan);
mainadminRoute.put('/updateplan:id',  planController.updatePlan);
mainadminRoute.delete('/deleteplan:id', planController.deletePlan);


// employeradminRoute.get('/fetchsubunitjobs/:applicantId', employeradminController.getJobsByApplicant);
module.exports = mainadminRoute;