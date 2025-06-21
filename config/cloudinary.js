const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
cloudinary.config({
  cloud_name: 'dsyqzw9ft',
  api_key: '639592464425626',
  api_secret: '1bdQpon4QnDnkKOFCtORmyjU2c0',
});

// Helper function to generate unique public_id
const generatePublicId = (req, file, prefix) => {
  const timestamp = Date.now();
  const originalName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
  return `${req.params.employid}_${prefix}_${originalName}_${timestamp}`;
};

const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'employee_profile_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    public_id: generatePublicId(req, file, 'profile'),
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    resource_type: 'image'
  }),
});

const sendimage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sendimage',
    public_id: (req, file) => {
      // Try to get a unique ID from the request, fallback to uuid
      const userId = req.body.employeeId || req.body.employerId || req.body.userId || uuidv4();
      // Remove special characters from filename
      const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `${userId}_profile_${baseName}_${Date.now()}`;
    },
    // ...other params
  }
});


const chatImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'chatimage',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    public_id: generatePublicId(req, file, 'profile'),
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    resource_type: 'image'
  }),
});
const eventImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'event_images', // Save inside this folder
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1000, height: 500, crop: 'limit' }],
    resource_type: 'image'
  },
});

const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'employee_resumes',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
    public_id: generatePublicId(req, file, 'resume'),
    resource_type: 'raw',
    format: 'pdf' // Ensures consistent format for documents
  }),
});

const coverLetterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'employee_cover_letters',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
    public_id: generatePublicId(req, file, 'coverletter'),
    resource_type: 'raw',
    format: 'pdf'
  }),
});

module.exports = { cloudinary,sendimage, profileImageStorage,eventImageStorage, resumeStorage,chatImageStorage, coverLetterStorage };