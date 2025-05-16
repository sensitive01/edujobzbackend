// config/cloudinary.js
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: "dsyqzw9ft",
  api_key: "639592464425626",
  api_secret: "1bdQpon4QnDnkKOFCtORmyjU2c0",
});

const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profile_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => `profile_${Date.now()}`,
  },
});

const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    public_id: (req, file) => `resume_${Date.now()}`,
  },
});

const coverLetterStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cover_letters',
    allowed_formats: ['pdf', 'doc', 'docx'],
    public_id: (req, file) => `cover_letter_${Date.now()}`,
  },
});

module.exports = { cloudinary, profileImageStorage, resumeStorage, coverLetterStorage };
