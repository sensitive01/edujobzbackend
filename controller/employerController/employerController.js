const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const generateOTP = require("../../utils/generateOTP")
const Job = require('../../models/jobSchema');
const userModel = require('../../models/employerSchema');
const jwtDecode = require('jwt-decode');
const jwksClient = require('jwks-rsa');
const { v4: uuidv4 } = require('uuid'); // Import uuid
const mongoose = require('mongoose'); // <-- Add this line
// ...existing code...
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const appleKeysClient = jwksClient({ 
  jwksUri: 'https://appleid.apple.com/auth/keys' 
});

const generateUserUUID = () => uuidv4(); // Define the function

const signUp = async (req, res) => {
  try {
    let {
      employerType,
      schoolName,
      userMobile,
      lastName,
      firstName,
      userEmail,
      userPassword,
      referralCode = ""
    } = req.body;

    // Trim all inputs
    employerType = employerType?.trim();
    schoolName = schoolName?.trim();
    userMobile = userMobile?.trim();
    lastName = lastName?.trim();
    firstName = firstName?.trim();
    userEmail = userEmail?.trim();
    userPassword = userPassword?.trim();
    referralCode = referralCode.trim();

    // Validation
    if (!userEmail && !userMobile) {
      return res.status(400).json({ message: "Email or mobile is required." });
    }

    // Check if user already exists
    const existUser = await userModel.findOne({
      $or: [{ userMobile }, { userEmail }]
    });

    if (existUser) {
      return res.status(400).json({ message: "Employer already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Handle referral code if provided
    let referredBy = null;
    if (referralCode) {
      const referringEmployer = await userModel.findOne({ referralCode });
      if (!referringEmployer) {
        return res.status(400).json({ message: "Invalid referral code." });
      }
      referredBy = referringEmployer._id;
    }

    // Create new employer
    const newEmployer = new userModel({
      uuid: uuidv4(),
      employerType,
      schoolName,
      userMobile,
      lastName,
      firstName,
      userEmail,
      userPassword: hashedPassword,
      referredBy
    });

    // Generate unique referral code
    newEmployer.referralCode = newEmployer.generateReferralCode();

    // Save the new employer
    await newEmployer.save();

    // Update referrer's counts if applicable
    if (referredBy) {
      await userModel.findByIdAndUpdate(referredBy, {
        $inc: {
          referralCount: 1,
          referralRewards: 100 // You can adjust this value
        }
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: newEmployer._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: "Employer registered successfully",
      data: {
        id: newEmployer._id,
        uuid: newEmployer.uuid,
        firstName: newEmployer.firstName,
        lastName: newEmployer.lastName,
        userEmail: newEmployer.userEmail,
        userMobile: newEmployer.userMobile,
        referralCode: newEmployer.referralCode,
        referredBy: referredBy
      },
      token
    });

  } catch (err) {
    console.error("Error in employer registration:", err.message);
    console.error(err.stack);
    
    // Handle duplicate key errors (like duplicate referral code)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Registration failed due to duplicate data",
        error: err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: err.message
    });
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
        { userMobile: userMobile ? parseInt(userMobile) : null },
        { userEmail: userEmail || "" }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: "Please check your email and password." });
    }

    const match = await bcrypt.compare(userPassword, user.userPassword);
    if (!match) {
      return res.status(400).json({ message: "Please check your email and password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: "Login successful",
      user,
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
        uuid: generateUserUUID(),
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
        uuid: generateUserUUID(),
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
const getEmployerDetails = async (req, res) => {
  try {
    // Get the employee ID from the authenticated user (from JWT)
    // OR from request params if you want to allow fetching by ID
   const employeeId = req.userId || req.params.id;


    if (!employeeId) {
      return res.status(400).json({ message: "Employer ID is required" });
    }

    // Find the employee and exclude the password
    const employee = await userModel.findById(employeeId).select('-userPassword');

    if (!employee) {
      return res.status(404).json({ message: "Employer not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error("Error fetching employer details:", err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: "Invalid employer ID format" });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

const listAllEmployees = async (req, res) => {
  try {
    // Fetch all employees, excluding the password field
    const employees = await userModel.find().select('-userPassword');

    // Check if any employees exist
    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found" });
    }

    // Return the list of employees
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const updateEmployerDetails = async (req, res) => {
  try {
    console.log('Update request body:', req.body);  // ✅ Log incoming data
    const updatedEmployer = await userModel.findByIdAndUpdate(
      req.params.id,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        userEmail: req.body.userEmail,
        userMobile: req.body.userMobile,
        address: req.body.address,
        state: req.body.state,
        pincode: req.body.pincode,
        city: req.body.city,
        schoolName: req.body.schoolName,
        website: req.body.website,
        board: req.body.board,
        institutionType: req.body.institutionType,
      },
      { new: true }
    );

    if (!updatedEmployer) {
      return res.status(404).json({ message: 'Employer not found' });
    }

    res.json(updatedEmployer);
  } catch (err) {
    console.error("Error updating employer details:", err);  // 👈 this error should reveal the issue
    res.status(500).json({ message: 'Server error' });
  }
};
const updateProfilePicture = async (req, res) => {
  try {
    const { employid } = req.params;

    // Validate employee ID
    if (!employid || !mongoose.isValidObjectId(employid)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = req.file;

    // Get file URL
    const fileUrl = result.secure_url || result.url || result.path;
    if (!fileUrl) {
      return res.status(500).json({ message: 'Cloudinary upload failed: No URL returned', details: result });
    }

    // Find current employee
    const currentEmployee = await userModel.findById(employid);
    if (!currentEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete old profile picture if exists
    if (currentEmployee.userProfilePic) {
      try {
        const publicId = currentEmployee.userProfilePic.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete old profile picture:', err);
      }
    }

    // Update with new profile picture
    currentEmployee.userProfilePic = fileUrl;
    await currentEmployee.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      file: {
        name: result.originalname || result.filename || 'Unnamed',
        url: fileUrl,
      },
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile picture',
      error: error.message,
    });
  }
};

const employerForgotPassword = async (req, res) => {
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

const employerverifyOTP = async (req, res) => {
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
const employerChangePassword = async (req, res) => {
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
// GET /api/referral-link/:userId
const getReferralLink = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userModel.findById(userId);
    if (!user || !user.referralCode) {
      return res.status(404).json({ message: 'Referral code not found.' });
    }

    // This can be dynamic based on your frontend deployment
    const referralUrl = `https://yourapp.com/signup?ref=${user.referralCode}`;

    res.json({ referralUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  signUp,
 employerForgotPassword,
  employerverifyOTP,
  employerChangePassword,
  login,
  googleAuth,
  getReferralLink,
  appleAuth,
  listAllEmployees,
  getEmployerDetails,
  updateEmployerDetails,
  updateProfilePicture,
};