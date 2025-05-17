const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'dsyqzw9ft',
  api_key: '639592464425626',
  api_secret: '1bdQpon4QnDnkKOFCtORmyjU2c0',
});

const profileImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee_profile_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => `${req.params.employid}_profile_${Date.now()}`,
  },
});

const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee_resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    public_id: (req, file) => `${req.params.employid}_resume_${Date.now()}`,
  },
});

const coverLetterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee_cover_letters',
    allowed_formats: ['pdf', 'doc', 'docx'],
    public_id: (req, file) => `${req.params.employid}_cover_letter_${Date.now()}`,
  },
});

module.exports = { cloudinary, profileImageStorage, resumeStorage, coverLetterStorage };