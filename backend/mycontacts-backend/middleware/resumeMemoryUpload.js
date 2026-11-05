
const multer = require("multer");
const path = require("path");

const allowedExtensions = [".pdf", ".doc", ".docx"];

const resumeMemoryUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return cb(
        Object.assign(
          new Error("Only PDF, DOC, and DOCX resumes are allowed."),
          { statusCode: 400 }
        )
      );
    }

    cb(null, true);
  },
});

module.exports = resumeMemoryUpload;
