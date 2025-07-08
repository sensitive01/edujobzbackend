// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/adminSchema.js'); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const JWT_SECRET = "your_secret_key"; // Use env var in production

// Admin Signup
exports.signupAdmin = async (req, res) => {
  try {
    const { adminUsername, adminEmail, adminMobile, adminPassword, confirmPassword } = req.body;

    if (!adminUsername || !adminEmail || !adminMobile || !adminPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (adminPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingAdmin = await Admin.findOne({ adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const newAdmin = new Admin({
      uuid: uuidv4(),
      adminUsername,
      adminEmail,
      adminMobile,
      adminPassword: hashedPassword
    });

    await newAdmin.save();
    return res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { adminEmail, adminPassword } = req.body;

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ message: "Email and Password are required" });
    }

    const admin = await Admin.findOne({ adminEmail });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(adminPassword, admin.adminPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id, adminEmail: admin.adminEmail },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({ message: "Login successful", token, admin });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
