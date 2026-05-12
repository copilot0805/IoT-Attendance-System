const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Đẩy ảnh lên Cloudinary
 * @param {Buffer} buffer - Dữ liệu ảnh thô
 * @returns {Promise<string|null>} - Trả về URL ảnh hoặc null nếu lỗi
 */
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "attendance_logs" },
      (error, result) => {
        if (error) {
          console.error("❌ [FILE SERVICE ERROR] Cloudinary sập:", error.message);
          resolve(null); // Trả về null thay vì reject để không làm dừng luồng chính
        } else {
          resolve(result.secure_url);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = { uploadToCloudinary };