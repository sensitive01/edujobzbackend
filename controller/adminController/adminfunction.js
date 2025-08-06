// controllers/employerController.js
const express = require("express");
const router = express.Router();
const employerController = require('../../controller/adminController/adminfunction');   
const Employer = require('../../models/employerSchema');
const Employee = require('../../models/employeeschema');
// Approve a single employer
exports.approveSingleEmployer = async (req, res) => {
  try {
    const { id } = req.params;

    const employer = await Employer.findByIdAndUpdate(
      id,
      { verificationstatus: 'approved' },
      { new: true }
    );

    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }

    res.json({
      message: 'Employer verification status updated to approved',
      employer
    });
  } catch (error) {
    console.error('Error approving employer:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve all employers
exports.approveAllEmployers = async (req, res) => {
  try {
    const result = await Employer.updateMany(
      {},
      { verificationstatus: 'approved' }
    );

    res.json({
      message: `Verification status updated to approved for ${result.modifiedCount} employers`
    });
  } catch (error) {
    console.error('Error approving all employers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.approveSingleEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employer = await Employee.findByIdAndUpdate(
      id,
      { verificationstatus: 'approved' },
      { new: true }
    );

    if (!employer) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      message: 'Employee verification status updated to approved',
      employer
    });
  } catch (error) {
    console.error('Error approving employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve all employers
exports.approveAllEmployee = async (req, res) => {
  try {
    const result = await Employee.updateMany(
      {},
      { verificationstatus: 'approved' }
    );

    res.json({
      message: `Verification status updated to approved for ${result.modifiedCount} employee`
    });
  } catch (error) {
    console.error('Error approving all employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
