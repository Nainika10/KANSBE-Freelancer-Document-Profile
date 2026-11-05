const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/s3");
const crypto = require("crypto");

const upload = (getPrefix) => multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      // Sanitize the filename to prevent AWS S3 signature errors
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      let prefix = '';
      if (typeof getPrefix === 'function') {
        prefix = getPrefix(req, file);
      } else {
        prefix = getPrefix; // Fallback to string if old behavior is still used somewhere
      }

      const shortId = crypto.randomBytes(3).toString('hex');
      const fileName = `${prefix}/${shortId}_${sanitizedName}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB size limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types based on mimetype and extension
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    
    const path = require('path');
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only JPG, PNG, PDF, and Word documents are allowed.');
      error.statusCode = 400;
      cb(error, false);
    }
  }
});

module.exports = upload; 