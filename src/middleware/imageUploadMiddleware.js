const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { fromFile: fileTypeFromFile } = require('file-type');
const imageSize = require('image-size');
const {
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_LABEL,
  IMAGE_UPLOAD_MAX_DIMENSION_PX,
  IMAGE_UPLOAD_MAX_PIXELS,
} = require('../config/upload');
const { registerUploadedFile } = require('../services/storage');

const uploadsDir = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
};

const deleteFileSilently = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`IMAGE_UPLOAD_CLEANUP_FAILED path=${filePath} message=${error.message}`);
    }
  }
};

const buildSafeExtension = (originalName) => {
  const ext = path.extname(originalName || '').toLowerCase();
  if (/^\.[a-z0-9]{1,10}$/.test(ext)) {
    return ext;
  }
  return '.img';
};

const validateUploadedImage = async (filePath) => {
  const detectedType = await fileTypeFromFile(filePath);
  if (!detectedType?.mime?.startsWith('image/')) {
    const err = new Error('Uploaded file content is not a valid image.');
    err.code = 'INVALID_IMAGE_SIGNATURE';
    throw err;
  }

  let dimensions;
  try {
    dimensions = imageSize(filePath);
  } catch (error) {
    const err = new Error('Image dimensions could not be determined.');
    err.code = 'INVALID_IMAGE_DIMENSIONS';
    throw err;
  }

  const { width, height } = dimensions || {};
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    const err = new Error('Image dimensions are invalid.');
    err.code = 'INVALID_IMAGE_DIMENSIONS';
    throw err;
  }

  if (width > IMAGE_UPLOAD_MAX_DIMENSION_PX || height > IMAGE_UPLOAD_MAX_DIMENSION_PX) {
    const err = new Error(`Image dimensions must be ${IMAGE_UPLOAD_MAX_DIMENSION_PX}px or smaller.`);
    err.code = 'IMAGE_DIMENSIONS_EXCEEDED';
    throw err;
  }

  if ((width * height) > IMAGE_UPLOAD_MAX_PIXELS) {
    const err = new Error(`Image resolution is too large. Maximum allowed is ${IMAGE_UPLOAD_MAX_PIXELS} pixels.`);
    err.code = 'IMAGE_PIXELS_EXCEEDED';
    throw err;
  }
};

const buildStorage = (fieldName) => multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${fieldName}-${uniqueSuffix}${buildSafeExtension(file.originalname)}`);
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

  return (req, res, next) => {
    uploader.single(fieldName)(req, res, async (err) => {
      if (err) {
        next(err);
        return;
      }

      if (!req.file?.path) {
        next();
        return;
      }

      try {
        await validateUploadedImage(req.file.path);
        const storageUpload = await registerUploadedFile(req.file);
        req.file.storage = storageUpload || null;
        next();
      } catch (validationError) {
        await deleteFileSilently(req.file.path);
        req.file = undefined;
        next(validationError);
      }
    });
  };
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

  if (err.code === 'INVALID_IMAGE_SIGNATURE') {
    return res.status(400).json({ message: 'Uploaded file content must be a valid image.' });
  }

  if (err.code === 'INVALID_IMAGE_DIMENSIONS') {
    return res.status(400).json({ message: 'Image dimensions are invalid.' });
  }

  if (err.code === 'IMAGE_DIMENSIONS_EXCEEDED' || err.code === 'IMAGE_PIXELS_EXCEEDED') {
    return res.status(400).json({ message: err.message || 'Image dimensions exceed limits.' });
  }

  if (err.code === 'STORAGE_UPLOAD_FAILED') {
    return res.status(502).json({ message: err.message || 'Image upload to storage failed.' });
  }

  return next(err);
};

module.exports = {
  createImageUpload,
  imageUploadErrorHandler,
  uploadsDir,
};
