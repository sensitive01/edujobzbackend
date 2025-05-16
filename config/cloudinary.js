const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary"); // Make sure this is installed

// Cloudinary config
cloudinary.config({
  cloud_name: "dsyqzw9ft",
  api_key: "639592464425626",
  api_secret: "1bdQpon4QnDnkKOFCtORmyjU2c0",
});

// Function to upload image buffers
const profileImageStorage  = async (imageBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          return reject(new Error("Cloudinary upload failed: " + error.message));
        }
        resolve(result.secure_url);
      }
    ).end(imageBuffer);
  });
};

// Storage config for resumes
const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee/resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw'
  }
});

// Storage config for cover letters
const coverLetterStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee/cover_letters',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw'
  }
});

// Export everything you want to use
module.exports = {
  profileImageStorage,
  resumeStorage,
  coverLetterStorage
};
