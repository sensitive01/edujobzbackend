const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dsyqzw9ft",
  api_key: "639592464425626",
  api_secret: "1bdQpon4QnDnkKOFCtORmyjU2c0",
});

const uploadImage = async (imageBuffer, folder) => {
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

module.exports = { uploadImage };
