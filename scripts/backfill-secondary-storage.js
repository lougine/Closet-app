require('dotenv').config({ override: true });
const fs = require('fs/promises');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const cloudinaryStorageDriver = require('../src/services/storage/drivers/cloudinaryStorageDriver');
const { collectImageReferences } = require('./storage-reference-utils');
const { resolveUploadPath } = require('../src/utils/imageFileUtils');

const parseBackfillArgs = (argv = process.argv.slice(2)) => {
  return {
    dryRun: argv.includes('--dry-run'),
  };
};

const runBackfill = async (options = {}) => {
  const { dryRun = false } = options;

  if (!cloudinaryStorageDriver.isEnabled()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  await connectDB();

  const references = await collectImageReferences();
  const uniqueFilenames = Array.from(new Set(references.map((ref) => ref.filename).filter(Boolean)));

  let uploaded = 0;
  let missingLocal = 0;
  const skipped = [];

  for (const filename of uniqueFilenames) {
    const localPath = resolveUploadPath(filename);
    if (!localPath) {
      skipped.push({ filename, reason: 'unsafe-or-invalid-path' });
      continue;
    }

    try {
      await fs.access(localPath);
    } catch {
      missingLocal += 1;
      skipped.push({ filename, reason: 'local-file-not-found' });
      continue;
    }

    if (dryRun) {
      uploaded += 1;
      continue;
    }

    await cloudinaryStorageDriver.registerUploadedFile({
      filename,
      path: localPath,
    });

    uploaded += 1;
  }

  const summary = {
    dryRun,
    referencesScanned: references.length,
    uniqueFilenames: uniqueFilenames.length,
    uploaded,
    missingLocal,
    skipped,
  };

  return summary;
};

const runBackfillCli = async (argv = process.argv.slice(2)) => {
  const options = parseBackfillArgs(argv);
  const summary = await runBackfill(options);
  console.log('STORAGE_BACKFILL_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runBackfillCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('STORAGE_BACKFILL_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_BACKFILL_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseBackfillArgs,
  runBackfill,
  runBackfillCli,
};
