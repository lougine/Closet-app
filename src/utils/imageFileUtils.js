const path = require('path');
const { DEFAULT_UPLOADS_ROOT } = require('../services/storage/drivers/localStorageDriver');
const { deleteManagedFile, listManagedFiles } = require('../services/storage');
const { CLOUDINARY_FOLDER } = require('../config/upload');

const uploadsRoot = path.resolve(DEFAULT_UPLOADS_ROOT);

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
  if (!normalizedPath) return null;

  if (normalizedPath.startsWith(UPLOADS_URL_PREFIX)) {
    const relativePath = normalizedPath.slice(UPLOADS_URL_PREFIX.length);
    if (!relativePath || relativePath.includes('/')) return null;
    if (!isSafeFilename(relativePath)) return null;

    return relativePath;
  }

  const folderPrefix = `/${String(CLOUDINARY_FOLDER || '').trim().replace(/^\/+|\/+$/g, '')}/`;
  const folderIndex = folderPrefix === '//' ? -1 : normalizedPath.indexOf(folderPrefix);
  if (folderIndex === -1) return null;

  const relativePath = normalizedPath.slice(folderIndex + folderPrefix.length);
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

  return deleteManagedFile(filename);
};

const listUploadedFiles = async () => {
  return listManagedFiles();
};

module.exports = {
  uploadsRoot,
  extractFilenameFromImageUrl,
  isSafeFilename,
  resolveUploadPath,
  listUploadedFiles,
  deleteImageByUrl,
};
