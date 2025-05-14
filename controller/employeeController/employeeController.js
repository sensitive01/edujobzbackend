const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userModel = require('../../models/employeeschema');
const jwtDecode = require('jwt-decode');
const jwksClient = require('jwks-rsa');
const { v4: uuidv4 } = require('uuid'); // Import uuid

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

module.exports = {
  signUp,
  login,
  googleAuth,
  appleAuth
};