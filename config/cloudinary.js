const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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

module.exports = { cloudinary, profileImageStorage, resumeStorage, coverLetterStorage };