const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MAX_LABEL } = require('../config/upload');

const uploadsDir = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
};

const buildStorage = (fieldName) => multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${fieldName}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const createImageUpload = (fieldName) => {
  const uploader = multer({
    storage: buildStorage(fieldName),
    limits: { fileSize: IMAGE_UPLOAD_MAX_BYTES },
    fileFilter: (req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
        return;
      }

      const err = new Error('Only image files are allowed.');
      err.code = 'INVALID_IMAGE_TYPE';
      cb(err);
    },
  });

  return uploader.single(fieldName);
};

const imageUploadErrorHandler = (err, req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `Image must be ${IMAGE_UPLOAD_MAX_LABEL} or smaller.` });
    }

    return res.status(400).json({ message: err.message || 'Upload failed.' });
  }

  if (err.code === 'INVALID_IMAGE_TYPE') {
    return res.status(400).json({ message: 'Only image files are allowed.' });
  }

  return next(err);
};

module.exports = {
  createImageUpload,
  imageUploadErrorHandler,
  uploadsDir,
};
