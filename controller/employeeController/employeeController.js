const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Job = require('../../models/jobSchema');
const userModel = require('../../models/employeeschema');
const generateOTP = require("../../utils/generateOTP")





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
    const { userName, userMobile, userEmail, userPassword, referralCode } = req.body;
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

    // Generate and assign referral code
    newUser.referralCode = newUser.generateReferralCode();

    // Handle referral if referral code is provided
    if (referralCode) {
      const referrer = await userModel.findOne({ referralCode });
      if (referrer) {
        newUser.referredBy = referrer._id;
        
        // Update referrer's counts
        referrer.referralCount += 1;
        // You can add any referral rewards logic here
        // referrer.referralRewards += 100; // Example: add 100 points
        
        await referrer.save();
      }
    }

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: "Employee registered successfully.",
      user: newUser,
      token
    });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// Email/Mobile Login
const login = async (req, res) => {
  try {
    const { userMobile, userEmail, userPassword, fcmToken } = req.body;

    if (!userMobile && !userEmail) {
      return res.status(400).json({ message: "Mobile or email is required." });
    }

    const user = await userModel.findOne({
      $or: [
        ...(userMobile ? [{ userMobile: userMobile.toString() }] : []),
        ...(userEmail ? [{ userEmail }] : [])
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "Please check your email and password." });
    }

    const match = await bcrypt.compare(userPassword, user.userPassword);
    if (!match) {
      return res.status(400).json({ message: "Please check your email and password." });
    }

    // ✅ Optional FCM token saving logic
    if (fcmToken && typeof fcmToken === 'string' && !user.employeefcmtoken.includes(fcmToken)) {
      user.employeefcmtoken.push(fcmToken);
      await user.save(); // only if token is new
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
      resume,
     experience,
     jobrole,
  currentcity,
      profileurl // <-- Extract profileurl from body
    } = req.body;

    // Optionally validate required fields
    // if (!applicantId || !firstName) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Missing required fields'
    //   });
    // }

    const application = {
      applicantId,
      firstName,
      email,
      phone,
      jobrole,
          experience,
  currentcity,
      resume: {
        name: resume?.name || 'resume.pdf',
        url: resume?.url || ''
      },
      profileurl, // <-- Add profileurl to application
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

const getApplicationStatus = async (req, res) => {
  try {
    const { jobId, applicantId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const application = job.applications.find(app => app.applicantId === applicantId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found for this applicant'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status fetched successfully',
      status: application.status,
      application
    });

  } catch (error) {
    console.error('Error fetching application status:', error);
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



const appliedjobsfetch = async (req, res) => {
  const { applicantId } = req.params;

  try {
    const jobs = await Job.aggregate([
      {
        $match: {
          'applications.applicantId': applicantId
        }
      },
      {
        $addFields: {
          employidObject: { $toObjectId: "$employid" }
        }
      },
      {
        $lookup: {
          from: "employers",
          localField: "employidObject",
          foreignField: "_id",
          as: "employerInfo"
        }
      },
      {
        $unwind: {
          path: "$employerInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          employerProfilePic: "$employerInfo.userProfilePic",
          employerName: {
            $concat: ["$employerInfo.firstName", " ", "$employerInfo.lastName"]
          }
        }
      },
      {
        $project: {
          employerInfo: 0,
          employidObject: 0
        }
      }
    ]);

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: 'No jobs found for this applicant.' });
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error('Error fetching jobs by applicant:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const calculateProfileCompletion = (employee) => {
  let score = 0;
  const report = {
    basicInfo: 0,
    address: 0,
    education: 0,
    workExperience: 0,
    profileDetails: 0,
    documents: 0,
    socialLinks: 0,
    jobPreferences: 0,
    total: 0,
  };

  // Basic Info (20%)
  if (employee.userName) report.basicInfo += 3.33;
  if (employee.userEmail) report.basicInfo += 3.33;
  if (employee.userMobile) report.basicInfo += 3.33;
  if (employee.dob) report.basicInfo += 3.33;
  if (employee.gender) report.basicInfo += 3.33;
  if (employee.maritalStatus) report.basicInfo += 3.33;

  // Address (10%)
  if (employee.addressLine1) report.address += 2.5;
  if (employee.city) report.address += 2.5;
  if (employee.state) report.address += 2.5;
  if (employee.pincode) report.address += 2.5;

  // Education (15%)
  if (employee.education && employee.education.length > 0) report.education += 15;

  // Work Experience (15%)
  if (employee.totalExperience === 'Fresher' || (employee.workExperience && employee.workExperience.length > 0)) report.workExperience += 15;

  // Profile Details (15%)
  if (employee.userProfilePic) report.profileDetails += 3.75;
  if (employee.profilesummary) report.profileDetails += 3.75;
  if (employee.skills) report.profileDetails += 3.75;
  if (employee.languages) report.profileDetails += 3.75;

  // Documents (10%)
  if (employee.resume?.url) report.documents += 10;

  // Social/Online Links (5%)
  if (employee.github) report.socialLinks += 1.66;
  if (employee.linkedin) report.socialLinks += 1.66;
  if (employee.portfolio) report.socialLinks += 1.66;

  // Job Preferences (10%)
  // if (employee.preferredLocation) report.jobPreferences += 2;
  if (employee.expectedSalary) report.jobPreferences += 2;
  if (employee.currentCity) report.jobPreferences += 4;
 
  if (employee.gradeLevels) report.jobPreferences += 4;

  // Calculate Total
  report.total = Math.round(
    report.basicInfo + report.address + report.education + report.workExperience +
    report.profileDetails + report.documents + report.socialLinks + report.jobPreferences
  );

  return report;
};

const getProfileCompletion = async (req, res) => {
  try {
    const employee = await userModel.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const percentageReport = calculateProfileCompletion(employee);
    res.json({ total: percentageReport.total }); // Return only the total
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};


const userForgotPassword = async (req, res) => {
  try {
    const { userMobile } = req.body;

    const existUser = await userModel.findOne({userMobile:userMobile})

    if (!existUser) {
      return res.status(404).json({
        message: "User not found with the provided contact number"
      });
    }

    if (!userMobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    req.app.locals.otp = otp;


    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp,
    });
  } catch (err) {
    console.log("Error in sending OTP in forgot password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res
        .status(400)
        .json({ message: "OTP is required" });
    }

    if (req.app.locals.otp) {
      if (otp == req.app.locals.otp) {
        return res.status(200).json({
          message: "OTP verified successfully",
          success: true,
        });
      } else {
        return res.status(400).json({
          message: "Invalid OTP",
          success: false,
        });
      }
    } else {
      return res.status(400).json({
        message: "OTP has expired or is invalid",
        success: false,
      });
    }
  } catch (err) {
    console.log("Error in OTP verification:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const userChangePassword = async (req, res) => {
  try {
    console.log("Welcome to user change password");

    const { userMobile, password, confirmPassword } = req.body;

    // Validate inputs
    if (!userMobile || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find the user by contact number
    const user = await userModel.findOne({ userMobile: userMobile });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password field
    user.userPassword = hashedPassword;

    // Save the updated user to trigger schema validation and middleware
    await user.save();

    // Send success response
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in user change password:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


//hbh
module.exports = {
  signUp,
  login,
  googleAuth,
  getEmployeeDetails,
  appleAuth,
  uploadFile,
  applyForJob,
  userChangePassword,
 userForgotPassword,
 verifyOTP,
    getProfileCompletion,
 calculateProfileCompletion,
  getApplicationStatus,
  appliedjobsfetch,
  updateProfile
};