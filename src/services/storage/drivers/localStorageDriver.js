const fs = require('fs/promises');
const path = require('path');

const DEFAULT_UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads');

const isSafeFilename = (filename) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(filename || '');

const resolveManagedPath = (filename) => {
  if (!isSafeFilename(filename)) return null;

  const rootPath = path.resolve(DEFAULT_UPLOADS_ROOT);
  const resolvedPath = path.resolve(path.join(DEFAULT_UPLOADS_ROOT, filename));
  if (!resolvedPath.startsWith(`${rootPath}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
};

const ensureUploadsRoot = async () => {
  await fs.mkdir(DEFAULT_UPLOADS_ROOT, { recursive: true });
};

const registerUploadedFile = async (file) => {
  await ensureUploadsRoot();

  return {
    provider: 'local',
    managedUrl: file?.filename ? `/uploads/${file.filename}` : null,
    bytes: Number.isFinite(file?.size) ? file.size : null,
    mimeType: file?.mimetype || null,
    originalFilename: file?.originalname || null,
    uploadedAt: new Date().toISOString(),
  };
};

const getReadableLocalPath = async (filename) => {
  const fullPath = resolveManagedPath(filename);
  if (!fullPath) return null;

  try {
    await fs.access(fullPath);
    return fullPath;
  } catch {
    return null;
  }
};

const deleteManagedFile = async (filename) => {
  const fullPath = resolveManagedPath(filename);
  if (!fullPath) return false;

  try {
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

const listManagedFiles = async () => {
  await ensureUploadsRoot();

  const entries = await fs.readdir(DEFAULT_UPLOADS_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isSafeFilename(entry.name))
    .map((entry) => entry.name);
};

const getManagedReadUrl = async () => null;

module.exports = {
  DEFAULT_UPLOADS_ROOT,
  isSafeFilename,
  resolveManagedPath,
  registerUploadedFile,
  getReadableLocalPath,
  deleteManagedFile,
  listManagedFiles,
  getManagedReadUrl,
};
