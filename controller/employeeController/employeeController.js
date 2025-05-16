const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userModel = require('../../models/employeeschema');
const jwtDecode = require('jwt-decode');
const jwksClient = require('jwks-rsa');
const { v4: uuidv4 } = require('uuid'); // Import uuid
const { cloudinary, profileImageStorage, resumeStorage, coverLetterStorage } = require('../../config/cloudinary');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const appleKeysClient = jwksClient({ 
  jwksUri: 'https://appleid.apple.com/auth/keys' 
});

const generateUserUUID = () => uuidv4(); // Define the function

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
// Add this to your existing controller file

const getEmployeeDetails = async (req, res) => {
  try {
    // Get the employee ID from the authenticated user (from JWT)
    // OR from request params if you want to allow fetching by ID
   const employeeId = req.userId || req.params.id;


    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    // Find the employee and exclude the password
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
// controllers/employeeController.js

const uploadFile = async (req, res) => {
  try {
    const { employid } = req.params;
    const { fileType } = req.body; // Changed from query to body
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let result;
    let updateField = {};
    const publicId = `employee_${employid}_${Date.now()}`;

    // Configure upload options based on file type
    const uploadOptions = {
      public_id: publicId,
      folder: `employee/${fileType}s`, // Creates folders like employee/resumes, employee/profileImages
      resource_type: fileType === 'profileImage' ? 'image' : 'raw'
    };

    // Upload to Cloudinary
    result = await cloudinary.uploader.upload(req.file.path, uploadOptions);

    // Determine what to update based on file type
    switch(fileType) {
      case 'profileImage':
        updateField = { userProfilePic: result.secure_url };
        break;
      case 'resume':
        updateField = { 
          resume: {
            name: req.file.originalname,
            url: result.secure_url,
            key: result.public_id
          }
        };
        break;
      case 'coverLetter':
        updateField = {
          coverLetterFile: {
            name: req.file.originalname,
            url: result.secure_url,
            key: result.public_id
          }
        };
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    // Update the profile
    const updatedProfile = await Profile.findOneAndUpdate(
      { employId: employid },
      { $set: updateField },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      url: result.secure_url,
      fileName: req.file.originalname,
      fileType: fileType
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false,
      message: 'File upload failed',
      error: error.message 
    });
  }
};

// Update profile (with optional image upload)
// controllers/employeeController.js

const updateProfile = async (req, res) => {
  try {
    const { employid } = req.params;
    let updateData = req.body;

    // Convert string fields to arrays if needed
    if (updateData.gradeLevels && typeof updateData.gradeLevels === 'string') {
      updateData.gradeLevels = updateData.gradeLevels.split(',').map(item => item.trim());
    }

    if (updateData.skills && typeof updateData.skills === 'string') {
      updateData.skills = updateData.skills.split(',').map(item => item.trim());
    }

    // Parse education and work experience if they're strings
    try {
      if (typeof updateData.education === 'string') {
        updateData.education = JSON.parse(updateData.education);
      }
      if (typeof updateData.workExperience === 'string') {
        updateData.workExperience = JSON.parse(updateData.workExperience);
      }
    } catch (e) {
      console.log('Error parsing JSON fields, assuming they are already objects');
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { employId: employid },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
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
  updateProfile
};