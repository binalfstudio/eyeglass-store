const { v2: cloudinary } = require('cloudinary');

// Configure from env vars — set these in Render dashboard
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer  - file buffer from multer memoryStorage
 * @param {string} filename - original filename (used to derive public_id)
 * @returns {Promise<string>} secure_url of the uploaded image
 */
const uploadToCloudinary = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const publicId = `payment-screenshots/${Date.now()}-${filename.replace(/\.[^.]+$/, '')}`;

    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          folder: 'zvisionary/payment-screenshots',
          resource_type: 'image',
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      )
      .end(buffer);
  });

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

module.exports = { uploadToCloudinary, isCloudinaryConfigured };
