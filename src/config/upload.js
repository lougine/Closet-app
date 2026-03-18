const DEFAULT_MAX_MB = 5;

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const IMAGE_UPLOAD_MAX_MB = parsePositiveNumber(process.env.IMAGE_UPLOAD_MAX_MB, DEFAULT_MAX_MB);
const IMAGE_UPLOAD_MAX_BYTES = Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024);
const IMAGE_UPLOAD_MAX_LABEL = `${IMAGE_UPLOAD_MAX_MB}MB`;

module.exports = {
  IMAGE_UPLOAD_MAX_MB,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MAX_LABEL,
};
