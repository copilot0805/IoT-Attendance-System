const multer = require('multer');

const uploadPhoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = uploadPhoto;
