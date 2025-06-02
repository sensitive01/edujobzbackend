const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Job = require('../../models/jobSchema');
const userModel = require('../../models/employeeschema');
const jwtDecode = require('jwt-decode');
const jwksClient = require('jwks-rsa');
const { v4: uuidv4 } = require('uuid');
const { cloudinary, profileImageStorage, resumeStorage, coverLetterStorage } = require('../../config/cloudinary');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const appleKeysClient = jwksClient({ 
  jwksUri: 'https://appleid.apple.com/auth/keys' 
});
const mongoose = require('mongoose');

// Email/Mobile Signup
const signUp = async (req, res) => {
  try {
    const { userName, userMobile, userEmail, userPassword } = req.body;
    const mobile = parseInt(userMobile);

    const existUser = await userModel.findOne({
      $or: [{ userMobile: mobile }, { userEmail }]
    });
    if (existUser) {
      return res.status(400).json({ message: "Employee already registered." });
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10);

    const newUser = new userModel({
      uuid: uuidv4(),
      userName,
      userMobile: mobile,
      userEmail,
      userPassword: hashedPassword,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: "Employee registered successfully.", user: newUser, token });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Email/Mobile Login
const login = async (req, res) => {
  try {
    const { userMobile, userEmail, userPassword } = req.body;

    if (!userMobile && !userEmail) {
      return res.status(400).json({ message: "Mobile or email is required." });
    }

    const user = await userModel.findOne({
      $or: [
        ...(userMobile ? [{ userMobile: parseInt(userMobile) }] : []),
        ...(userEmail ? [{ userEmail }] : [])
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const match = await bcrypt.compare(userPassword, user.userPassword);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { userPassword: _, ...safeUser } = user._doc;

    res.json({
      message: "Login successful",
      user: safeUser,
      token
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Google Sign-In
const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await userModel.findOne({ googleId: payload.sub });
    if (!user) {
      user = new userModel({
        uuid: uuidv4(),
        googleId: payload.sub,
        userEmail: payload.email,
        userName: payload.name,
        userProfilePic: payload.picture,
        isVerified: true
      });      
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: "Google login successful",
      user,
      token 
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

// Apple Sign-In
const appleAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = jwtDecode(idToken);
    let user = await userModel.findOne({ appleId: decoded.sub });
    
    if (!user) {
      user = new userModel({
        uuid: uuidv4(),
        appleId: decoded.sub,
        userEmail: decoded.email,
        userName: "Apple User",
        isVerified: true
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: "Apple login successful",
      user,
      token 
    });
  } catch (err) {
    console.error("Apple auth error:", err);
    res.status(401).json({ message: 'Invalid Apple token' });
  }
};

const getEmployeeDetails = async (req, res) => {
  try {
    const employeeId = req.userId || req.params.id;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const employee = await userModel.findById(employeeId).select('-userPassword');

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee details:", err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: "Invalid employee ID format" });
    }
    res.status(500).json({ message: "Server error" });
  }
};
const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { 
      applicantId,
      firstName,
      email,
      phone,
      resume
    } = req.body;

    // Validate required fields
    if (!applicantId ||firstName ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const application = {
      applicantId,
      firstName,
      email,
      phone,
      resume: {
        name: resume.name || 'resume.pdf',
        url: resume.url
      },
      status: 'Applied'
    };

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $push: { applications: application } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: updatedJob.applications.slice(-1)[0]
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// employeeController.js

const uploadFile = async (req, res) => {
  try {
    const { employid } = req.params;
    const fileType = req.query.fileType || req.body.fileType;

    // Validate inputs
    if (!employid || !mongoose.isValidObjectId(employid)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    if (!fileType) {
      return res.status(400).json({ message: 'File type (fileType) is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = req.file;

    // Check if we have a valid URL in the result
    if (!result.secure_url && !result.url && !result.path) {
      return res.status(500).json({ 
        message: 'Cloudinary upload failed: No URL returned',
        details: result 
      });
    }

    // Use secure_url if available, otherwise fall back to url or path
    const fileUrl = result.secure_url || result.url || result.path;

    // First, get the current employee to check for existing files
    const currentEmployee = await userModel.findById(employid);
    if (!currentEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete old file from Cloudinary if it exists
    try {
      switch (fileType) {
        case 'profileImage':
          if (currentEmployee.userProfilePic) {
            const publicId = currentEmployee.userProfilePic.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
          break;
        case 'resume':
          if (currentEmployee.resume?.url) {
            const publicId = currentEmployee.resume.url.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
          }
          break;
        case 'coverLetter':
          if (currentEmployee.coverLetterFile?.url) {
            const publicId = currentEmployee.coverLetterFile.url.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
          }
          break;
      }
    } catch (deleteError) {
      console.error('Error deleting old file:', deleteError);
      // Continue with the update even if deletion fails
    }

    // Prepare field update
    let updateField;
    switch (fileType) {
      case 'profileImage':
        updateField = { userProfilePic: fileUrl };
        break;
      case 'resume':
        updateField = {
          resume: {
            name: result.originalname || result.filename || 'Unnamed',
            url: fileUrl,
          },
        };
        break;
      case 'coverLetter':
        updateField = {
          coverLetterFile: {
            name: result.originalname || result.filename || 'Unnamed',
            url: fileUrl,
          },
        };
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type provided' });
    }

    // Update employee document
    const updatedEmployee = await userModel.findByIdAndUpdate(
      employid,
      { $set: updateField },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      fileType,
      file: {
        name: result.originalname || result.filename || 'Unnamed',
        url: fileUrl,
      },
      message: 'File uploaded and saved successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { employid } = req.params;
    const profileData = req.body;

    // Update employee profile
    const updatedEmployee = await userModel.findByIdAndUpdate(
      employid,
      { $set: profileData },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: updatedEmployee,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating profile', 
      error: error.message 
    });
  }
};

module.exports = {
  signUp,
  login,
  googleAuth,
  getEmployeeDetails,
  appleAuth,
  uploadFile,
  applyForJob,
  updateProfile
};