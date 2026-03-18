const fs = require('fs/promises');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../uploads');

const UPLOADS_URL_PREFIX = '/uploads/';

const normalizeImageUrlPath = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  let rawPath = imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      rawPath = new URL(imageUrl).pathname;
    } catch {
      return null;
    }
  }

  const normalizedPath = decodeURIComponent(rawPath.split('?')[0] || '').replace(/\\/g, '/');
  return normalizedPath || null;
};

const extractFilenameFromImageUrl = (imageUrl) => {
  const normalizedPath = normalizeImageUrlPath(imageUrl);
  if (!normalizedPath || !normalizedPath.startsWith(UPLOADS_URL_PREFIX)) return null;

  const relativePath = normalizedPath.slice(UPLOADS_URL_PREFIX.length);
  if (!relativePath || relativePath.includes('/')) return null;
  if (!isSafeFilename(relativePath)) return null;

  return relativePath;
};

const isSafeFilename = (filename) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(filename);

const resolveUploadPath = (filename) => {
  if (!isSafeFilename(filename)) return null;

  const rootPath = path.resolve(uploadsRoot);
  const resolvedPath = path.resolve(path.join(uploadsRoot, filename));
  if (!resolvedPath.startsWith(`${rootPath}${path.sep}`)) return null;

  return resolvedPath;
};

const deleteImageByUrl = async (imageUrl) => {
  const filename = extractFilenameFromImageUrl(imageUrl);
  if (!filename) return false;

  const fullPath = resolveUploadPath(filename);
  if (!fullPath) return false;

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

const listUploadedFiles = async () => {
  try {
    const entries = await fs.readdir(uploadsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isSafeFilename(entry.name))
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

module.exports = {
  uploadsRoot,
  extractFilenameFromImageUrl,
  isSafeFilename,
  resolveUploadPath,
  listUploadedFiles,
  deleteImageByUrl,
};
