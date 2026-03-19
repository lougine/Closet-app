const {
  STORAGE_PRIMARY_DRIVER,
  STORAGE_KEEP_LOCAL_COPY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require('../../config/upload');
const localStorageDriver = require('./drivers/localStorageDriver');
const cloudinaryStorageDriver = require('./drivers/cloudinaryStorageDriver');

const metrics = {
  uploadFailures: 0,
  readFailures: 0,
  deleteFailures: 0,
  listFailures: 0,
  lastFailureAt: null,
  lastFailureCode: null,
  lastFailureMessage: null,
};

const markFailure = (kind, error) => {
  if (Object.prototype.hasOwnProperty.call(metrics, kind)) {
    metrics[kind] += 1;
  }

  metrics.lastFailureAt = new Date().toISOString();
  metrics.lastFailureCode = error?.code || null;
  metrics.lastFailureMessage = error?.message || 'Unknown storage error';
};

const getPrimaryDriverName = () => {
  if (STORAGE_PRIMARY_DRIVER === 'cloudinary' && cloudinaryStorageDriver.isEnabled()) {
    return 'cloudinary';
  }

  return 'local';
};

const getPrimaryDriver = () => {
  return getPrimaryDriverName() === 'cloudinary'
    ? cloudinaryStorageDriver
    : localStorageDriver;
};

const registerUploadedFile = async (file) => {
  if (!file?.filename) {
    return null;
  }

  const primaryDriverName = getPrimaryDriverName();
  if (primaryDriverName === 'local') {
    return localStorageDriver.registerUploadedFile(file);
  }

  try {
    const result = await cloudinaryStorageDriver.registerUploadedFile(file);

    if (!STORAGE_KEEP_LOCAL_COPY) {
      await localStorageDriver.deleteManagedFile(file.filename);
    }

    return result;
  } catch (error) {
    markFailure('uploadFailures', error);
    const err = new Error(`Storage upload failed: ${error.message}`);
    err.code = 'STORAGE_UPLOAD_FAILED';
    throw err;
  }
};

const getReadableLocalPath = async (filename) => {
  return localStorageDriver.getReadableLocalPath(filename);
};

const getManagedReadUrl = async (filename) => {
  const primaryDriver = getPrimaryDriver();

  if (primaryDriver === cloudinaryStorageDriver) {
    try {
      return await cloudinaryStorageDriver.getManagedReadUrl(filename);
    } catch (error) {
      markFailure('readFailures', error);
      return null;
    }
  }

  return null;
};

const deleteManagedFile = async (filename) => {
  const results = await Promise.allSettled([
    localStorageDriver.deleteManagedFile(filename),
    cloudinaryStorageDriver.deleteManagedFile(filename),
  ]);

  const deleted = results.some((result) => result.status === 'fulfilled' && result.value === true);
  const hasUnexpectedFailure = results.some((result) => (
    result.status === 'rejected'
    && result.reason
    && result.reason.code !== 'CLOUDINARY_NOT_CONFIGURED'
  ));

  if (hasUnexpectedFailure && !deleted) {
    const failure = results.find((result) => result.status === 'rejected');
    markFailure('deleteFailures', failure.reason);
    throw failure.reason;
  }

  return deleted;
};

const listManagedFiles = async () => {
  const localFiles = await localStorageDriver.listManagedFiles();

  if (getPrimaryDriverName() !== 'cloudinary') {
    return localFiles;
  }

  try {
    const cloudFiles = await cloudinaryStorageDriver.listManagedFiles();
    return Array.from(new Set([...localFiles, ...cloudFiles]));
  } catch (error) {
    markFailure('listFailures', error);
    return localFiles;
  }
};

const getStorageHealthSnapshot = () => {
  const cloudConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
  const effectivePrimaryDriver = getPrimaryDriverName();

  return {
    configuredPrimaryDriver: STORAGE_PRIMARY_DRIVER,
    effectivePrimaryDriver,
    keepLocalCopy: STORAGE_KEEP_LOCAL_COPY,
    cloudinary: {
      configured: cloudConfigured,
      enabled: cloudinaryStorageDriver.isEnabled(),
      cloudNamePresent: Boolean(CLOUDINARY_CLOUD_NAME),
      apiKeyPresent: Boolean(CLOUDINARY_API_KEY),
      apiSecretPresent: Boolean(CLOUDINARY_API_SECRET),
    },
    failures: {
      upload: metrics.uploadFailures,
      read: metrics.readFailures,
      list: metrics.listFailures,
      delete: metrics.deleteFailures,
      total: metrics.uploadFailures + metrics.readFailures + metrics.listFailures + metrics.deleteFailures,
      lastFailureAt: metrics.lastFailureAt,
      lastFailureCode: metrics.lastFailureCode,
      lastFailureMessage: metrics.lastFailureMessage,
    },
  };
};

module.exports = {
  getPrimaryDriverName,
  registerUploadedFile,
  getReadableLocalPath,
  getManagedReadUrl,
  deleteManagedFile,
  listManagedFiles,
  getStorageHealthSnapshot,
};
