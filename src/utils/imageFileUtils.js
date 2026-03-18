const fs = require('fs/promises');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../uploads');

const extractFilenameFromImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const segments = imageUrl.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[segments.length - 1];
};

const isSafeFilename = (filename) => /^[a-zA-Z0-9._-]+$/.test(filename);

const deleteImageByUrl = async (imageUrl) => {
  const filename = extractFilenameFromImageUrl(imageUrl);
  if (!filename || !isSafeFilename(filename)) return false;

  const fullPath = path.join(uploadsRoot, filename);

  try {
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

module.exports = {
  uploadsRoot,
  extractFilenameFromImageUrl,
  isSafeFilename,
  deleteImageByUrl,
};
