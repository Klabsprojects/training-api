const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError'); // Assuming you have this utility

const router = express.Router();

// --- 1. CONFIGURATION ---
const UPLOAD_SUBDIR = 'trainer-documents'; // New sub-directory name
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', UPLOAD_SUBDIR);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Increased size to 10MB for documents

// Ensure folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- 2. MULTER STORAGE SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Get original extension (e.g., .pdf, .docx)
    const ext = path.extname(file.originalname); 
    // Get base name, sanitize spaces, and append current timestamp
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});

// --- 3. FILE FILTER (RECOMMENDED) ---
// This function checks the file's MIME type and allows only documents
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // To accept the file pass `true`
    cb(null, true); 
  } else {
    // To reject the file pass `false` or an Error
    cb(new AppError('Only PDF, DOC, and DOCX files are allowed.', 415, { isOperational: true }), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE }, // Set the new limit
  fileFilter: fileFilter // Apply the document filter
});

// --- 4. ROUTE HANDLER ---
router.post('/upload-document', (req, res, next) => {
  // Use 'document' as the field name from the frontend form
  upload.single('document')(req, res, (err) => {
    try {
      if (err instanceof multer.MulterError) {
        // Multer errors (e.g., file size limit)
        return next(new AppError(err.message || 'Document upload failed', 400, { isOperational: true }));
      }
      if (err) {
        // Custom AppError from fileFilter or other errors
        return next(err);
      }

      if (!req.file) {
        // This will now catch the case where a forbidden file type was uploaded
        throw new AppError('No document file provided or file type is forbidden.', 400, { isOperational: true });
      }

      // The relative path to store in the database
      // UPLOAD_SUBDIR is 'trainer-documents'
      const filePath = `uploads/${UPLOAD_SUBDIR}/${req.file.filename}`; 

      res.status(201).json({ // Use 201 Created for a resource creation
        success: true,
        path: filePath,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      next(error); // goes to centralized logger + errorHandler
    }
  });
});

module.exports = router;