const DEFAULT_MAX_MB = 5;
const DEFAULT_MAX_DIMENSION_PX = 6000;
const DEFAULT_MAX_MEGAPIXELS = 25;
const DEFAULT_ORPHAN_RETENTION_DAYS = 30;
const DEFAULT_STORAGE_PRIMARY_DRIVER = 'local';
const DEFAULT_CLOUDINARY_FOLDER = 'digital-wardrobe';

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseStorageDriver = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'local') {
    return 'local';
  }
  if (normalized === 'cloudinary') {
    return 'cloudinary';
  }
  return DEFAULT_STORAGE_PRIMARY_DRIVER;
};

const IMAGE_UPLOAD_MAX_MB = parsePositiveNumber(process.env.IMAGE_UPLOAD_MAX_MB, DEFAULT_MAX_MB);
const IMAGE_UPLOAD_MAX_BYTES = Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024);
const IMAGE_UPLOAD_MAX_LABEL = `${IMAGE_UPLOAD_MAX_MB}MB`;
const IMAGE_UPLOAD_MAX_DIMENSION_PX = Math.round(parsePositiveNumber(process.env.IMAGE_UPLOAD_MAX_DIMENSION_PX, DEFAULT_MAX_DIMENSION_PX));
const IMAGE_UPLOAD_MAX_MEGAPIXELS = parsePositiveNumber(process.env.IMAGE_UPLOAD_MAX_MEGAPIXELS, DEFAULT_MAX_MEGAPIXELS);
const IMAGE_UPLOAD_MAX_PIXELS = Math.round(IMAGE_UPLOAD_MAX_MEGAPIXELS * 1000000);
const ORPHAN_UPLOAD_RETENTION_DAYS = Math.round(parsePositiveNumber(process.env.ORPHAN_UPLOAD_RETENTION_DAYS, DEFAULT_ORPHAN_RETENTION_DAYS));
const STORAGE_PRIMARY_DRIVER = parseStorageDriver(process.env.STORAGE_PRIMARY_DRIVER);
const STORAGE_KEEP_LOCAL_COPY = false;

const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();
const CLOUDINARY_FOLDER = String(process.env.CLOUDINARY_FOLDER || DEFAULT_CLOUDINARY_FOLDER).trim() || DEFAULT_CLOUDINARY_FOLDER;

module.exports = {
  IMAGE_UPLOAD_MAX_MB,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_LABEL,
  IMAGE_UPLOAD_MAX_DIMENSION_PX,
  IMAGE_UPLOAD_MAX_MEGAPIXELS,
  IMAGE_UPLOAD_MAX_PIXELS,
  ORPHAN_UPLOAD_RETENTION_DAYS,
  STORAGE_PRIMARY_DRIVER,
  STORAGE_KEEP_LOCAL_COPY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
};
