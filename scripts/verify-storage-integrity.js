require('dotenv').config({ override: true });
const fs = require('fs/promises');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const cloudinaryStorageDriver = require('../src/services/storage/drivers/cloudinaryStorageDriver');
const { collectImageReferences } = require('./storage-reference-utils');
const { resolveUploadPath } = require('../src/utils/imageFileUtils');
const { STORAGE_PRIMARY_DRIVER } = require('../src/config/upload');

const parseRequireMode = (argv = process.argv.slice(2)) => {
  const arg = argv.find((item) => item.startsWith('--require='));
  if (!arg) return 'primary';

  const mode = String(arg.split('=')[1] || '').toLowerCase();
  if (['primary', 'all', 'any'].includes(mode)) {
    return mode;
  }

  return 'primary';
};

const checkLocalExists = async (filename) => {
  const localPath = resolveUploadPath(filename);
  if (!localPath) return false;

  try {
    await fs.access(localPath);
    return true;
  } catch {
    return false;
  }
};

const checkCloudinaryExists = async (filename) => {
  if (!cloudinaryStorageDriver.isEnabled()) return false;
  const readUrl = await cloudinaryStorageDriver.getManagedReadUrl(filename);
  if (!readUrl || typeof fetch !== 'function') return false;

  const response = await fetch(readUrl, { method: 'GET' });
  return response.ok;
};

const runVerify = async (options = {}) => {
  const requireMode = options.requireMode || 'primary';

  await connectDB();
  const references = await collectImageReferences();

  const violations = [];
  for (const reference of references) {
    if (!reference.filename) {
      violations.push({
        type: 'malformed-url',
        model: reference.modelLabel,
        docId: reference.docIdString,
        field: reference.field,
        imageUrl: reference.imageUrl,
      });
      continue;
    }

    const [localExists, cloudExists] = await Promise.all([
      checkLocalExists(reference.filename),
      checkCloudinaryExists(reference.filename),
    ]);

    const primaryExists = STORAGE_PRIMARY_DRIVER === 'cloudinary' ? cloudExists : localExists;
    const existsInAny = localExists || cloudExists;
    const existsInAll = localExists && cloudExists;

    let isValid = false;
    if (requireMode === 'primary') isValid = primaryExists;
    if (requireMode === 'all') isValid = existsInAll;
    if (requireMode === 'any') isValid = existsInAny;

    if (!isValid) {
      violations.push({
        type: 'missing-file',
        model: reference.modelLabel,
        docId: reference.docIdString,
        field: reference.field,
        imageUrl: reference.imageUrl,
        filename: reference.filename,
        localExists,
        cloudExists,
        requireMode,
      });
    }
  }

  const summary = {
    requireMode,
    referencesScanned: references.length,
    violations,
    violationsCount: violations.length,
  };

  return summary;
};

const runVerifyCli = async (argv = process.argv.slice(2)) => {
  const requireMode = parseRequireMode(argv);
  const summary = await runVerify({ requireMode });
  console.log('STORAGE_VERIFY_SUMMARY=' + JSON.stringify(summary));

  if (summary.violationsCount > 0) {
    process.exitCode = 1;
  }

  return summary;
};

if (require.main === module) {
  runVerifyCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(process.exitCode || 0);
    })
    .catch(async (error) => {
      console.error('STORAGE_VERIFY_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_VERIFY_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseRequireMode,
  runVerify,
  runVerifyCli,
};
