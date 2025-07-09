// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const employerAdmin = require('../../models/employeradminSchema.js'); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const JWT_SECRET = "your_secret_key"; // Use env var in production
function generateOTP(length = 4) {
  return Math.floor(1000 + Math.random() * 9000).toString().substring(0, length);
}
const Employee = require('../../models/employeeschema.js'); // adjust the path if needed
const Employer = require('../../models/employerSchema.js'); // adjust the path as needed


// Admin Signup
exports.employersignupAdmin = async (req, res) => {
  try {
    const {
      employeradminUsername,
      employeradminEmail,
      employeradminMobile,
      employeradminPassword,
      employerconfirmPassword
    } = req.body;

    // Check if passwords match
    if (employeradminPassword !== employerconfirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if admin already exists with this email
    const existingAdmin = await employerAdmin.findOne({ employeradminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(employeradminPassword, 10);

    // Create and save new admin
    const newAdmin = new employerAdmin({
      uuid: uuidv4(),
      employeradminUsername,
      employeradminEmail,
      employeradminMobile,
      employeradminPassword: hashedPassword
    });

    await newAdmin.save();

    return res.status(201).json({ message: "Employer admin registered successfully" });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
// Admin Login
// ...existing code...
exports.employerloginAdmin = async (req, res) => {
  try {
    const { employeradminEmail, employeradminPassword } = req.body;

    if (!employeradminEmail || !employeradminPassword) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    const admin = await employerAdmin.findOne({ employeradminEmail });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(employeradminPassword, admin.employeradminPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.employeradminEmail,
        username: admin.employeradminUsername
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Clone admin object and remove sensitive data
    const adminData = admin.toObject();
    delete adminData.employeradminPassword;
    delete adminData.otp;
    delete adminData.otpExpiry;

    return res.status(200).json({
      message: "Login successful",
      token,
      admin: adminData
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ...existing code...
exports.employergetAdminById = async (req, res) => {
  try {
    const admin = await employerAdmin.findById(req.params.id).select('-employeradminPassword'); // exclude password

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    return res.status(200).json({ admin });
  } catch (err) {
    console.error("Get Admin By ID Error:", err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.adminForgotPassword = async (req, res) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const admin = await Admin.findOne({ adminEmail });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found with the provided email" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 mins

    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    // In production, send email here instead of returning OTP
    console.log("Generated OTP:", otp);

    return res.status(200).json({
      message: "OTP sent successfully",
      otp: otp, // ⚠️ remove this in production
    });
  } catch (err) {
    console.error("Error in adminForgotPassword:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Admin Verify OTP
exports.adminverifyOTP = async (req, res) => {
  try {
    const { otp, adminEmail } = req.body;

    if (!otp || !adminEmail) {
      return res.status(400).json({ message: "OTP and email are required" });
    }

    const admin = await Admin.findOne({ adminEmail });

    if (!admin || !admin.otp || !admin.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired or is invalid", success: false });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (admin.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired", success: false });
    }

    // Clear OTP after successful verification
    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    return res.status(200).json({ message: "OTP verified successfully", success: true });
  } catch (err) {
    console.error("Error in adminverifyOTP:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Admin Change Password
exports.adminChangePassword = async (req, res) => {
  try {
    const { adminEmail, password, confirmPassword } = req.body;

    if (!adminEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const admin = await Admin.findOne({ adminEmail });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.adminPassword = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in adminChangePassword:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
exports.getAllEmployers = async (req, res) => {
  try {
    const employers = await Employer.find();
    res.status(200).json({
      success: true,
      count: employers.length,
      data: employers
    });
  } catch (err) {
    console.error('Error fetching employers:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};