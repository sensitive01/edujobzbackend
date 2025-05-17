const express = require("express");
const employeeController = require("../../controller/employeeController/employeeController");
const { profileImageStorage, resumeStorage, coverLetterStorage } = require("../../config/cloudinary");

const employeeRoute = express.Router();
const multer = require("multer");


const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await userModel.findById(decoded.id);
    if (!employee) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Ensure the employid in the route matches the authenticated user's ID
    if (req.params.employid && req.params.employid !== decoded.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this profile' });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

// Determine storage based on fileType
const getStorage = (fileType) => {
  const validFileTypes = ['profileImage', 'resume', 'coverLetter'];
  if (!validFileTypes.includes(fileType)) {
    throw new Error('Invalid file type. Must be one of: ' + validFileTypes.join(', '));
  }

  switch (fileType) {
    case 'profileImage':
      return profileImageStorage;
    case 'resume':
      return resumeStorage;
    case 'coverLetter':
      return coverLetterStorage;
  }
};

const upload = (fileType) => {
  return multer({
    storage: getStorage(fileType),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = {
        profileImage: ['image/jpeg', 'image/jpg', 'image/png'],
        resume: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        coverLetter: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      };

      if (!allowedTypes[fileType].includes(file.mimetype)) {
        return cb(new Error(`Invalid file format. Allowed types: ${allowedTypes[fileType].join(', ')}`), false);
      }
      cb(null, true);
    },
  }).single('file');
};

// Middleware to handle dynamic fileType
const uploadMiddleware = (req, res, next) => {
  const fileType = req.query.fileType || req.body.fileType;
  if (!fileType) {
    return res.status(400).json({ success: false, message: 'File type (fileType) is required' });
  }

  try {
    console.log(`Processing file upload for fileType: ${fileType}, employid: ${req.params.employid}`); // Debug log
    upload(fileType)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message,
        });
      } else if (err) {
        console.error('File filter error:', err);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  } catch (error) {
    console.error('Upload middleware error:', {
      message: error.message,
      fileType,
      employid: req.params.employid,
    });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Routes
employeeRoute.post('/signup', employeeController.signUp);
employeeRoute.post('/login', employeeController.login);
employeeRoute.post('/google', employeeController.googleAuth);
employeeRoute.post('/apple', employeeController.appleAuth);
employeeRoute.get('/fetchemployee/:id', authMiddleware, employeeController.getEmployeeDetails);

// Upload file to Cloudinary
employeeRoute.put(
  '/uploadfile/:employid',
  authMiddleware,
  uploadMiddleware,
  employeeController.uploadFile
);

// Update profile
employeeRoute.put(
  '/updateprofile/:employid',
  authMiddleware,
  employeeController.updateProfile
);

module.exports = employeeRoute;