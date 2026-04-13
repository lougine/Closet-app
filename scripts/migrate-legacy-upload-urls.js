require('dotenv').config({ override: true });
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const cloudinaryStorageDriver = require('../src/services/storage/drivers/cloudinaryStorageDriver');
const { collectImageReferences, writeReferenceValue } = require('./storage-reference-utils');

const parseBackupPath = (argv = process.argv.slice(2), now = Date.now()) => {
  const backupArg = argv.find((arg) => arg.startsWith('--backup='));
  if (backupArg) {
    return path.resolve(process.cwd(), backupArg.split('=')[1]);
  }

  if (argv.includes('--backup')) {
    return path.resolve(process.cwd(), `backups/storage-url-migration-${now}.json`);
  }

  return null;
};

const parseArgs = (argv = process.argv.slice(2), now = Date.now()) => ({
  dryRun: argv.includes('--dry-run'),
  apply: argv.includes('--apply'),
  verifyCloudAsset: !argv.includes('--skip-verify'),
  backupPath: parseBackupPath(argv, now),
});

const isLegacyUploadUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /(^\/uploads\/)|(^https?:\/\/.*\/uploads\/)/i.test(value);
};

const checkCloudAssetExists = async (url) => {
  if (!url || typeof fetch !== 'function') return false;

  const response = await fetch(url, { method: 'GET' });
  return response.ok;
};

const runMigration = async (options = {}) => {
  const {
    dryRun = false,
    apply = false,
    verifyCloudAsset = true,
    backupPath = null,
  } = options;

  if (!cloudinaryStorageDriver.isEnabled()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  await connectDB();

  const references = await collectImageReferences();
  const legacyReferences = references.filter((ref) => isLegacyUploadUrl(ref.imageUrl));

  const plannedChanges = [];
  const skipped = [];

  for (const ref of legacyReferences) {
    if (!ref.filename) {
      skipped.push({
        model: ref.modelLabel,
        docId: ref.docIdString,
        field: ref.field,
        from: ref.imageUrl,
        reason: 'filename-not-extractable',
      });
      continue;
    }

    const targetUrl = await cloudinaryStorageDriver.getManagedReadUrl(ref.filename);
    if (!targetUrl) {
      skipped.push({
        model: ref.modelLabel,
        docId: ref.docIdString,
        field: ref.field,
        from: ref.imageUrl,
        reason: 'unable-to-build-cloud-url',
      });
      continue;
    }

    if (verifyCloudAsset) {
      const exists = await checkCloudAssetExists(targetUrl);
      if (!exists) {
        skipped.push({
          model: ref.modelLabel,
          docId: ref.docIdString,
          field: ref.field,
          from: ref.imageUrl,
          to: targetUrl,
          reason: 'cloud-asset-not-found',
        });
        continue;
      }
    }

    plannedChanges.push({
      model: ref.modelLabel,
      docId: ref.docIdString,
      field: ref.field,
      from: ref.imageUrl,
      to: targetUrl,
      ref,
    });
  }

  if (backupPath && plannedChanges.length > 0) {
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    const backupPayload = {
      generatedAt: new Date().toISOString(),
      dryRun,
      apply,
      verifyCloudAsset,
      plannedChanges: plannedChanges.map((change) => ({
        model: change.model,
        docId: change.docId,
        field: change.field,
        from: change.from,
        to: change.to,
      })),
      skipped,
    };
    await fs.writeFile(backupPath, JSON.stringify(backupPayload, null, 2));
  }

  let appliedCount = 0;
  if (apply && !dryRun) {
    for (const change of plannedChanges) {
      const result = await writeReferenceValue(change.ref, change.to);
      if ((result.modifiedCount || 0) > 0) {
        appliedCount += 1;
      }
    }
  }

  const summary = {
    dryRun,
    apply,
    verifyCloudAsset,
    backupPath,
    scanned: references.length,
    legacyReferences: legacyReferences.length,
    plannedCount: plannedChanges.length,
    skippedCount: skipped.length,
    appliedCount,
    skipped,
    plannedChanges: plannedChanges.map((change) => ({
      model: change.model,
      docId: change.docId,
      field: change.field,
      from: change.from,
      to: change.to,
    })),
  };

  return summary;
};

const runMigrationCli = async (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);
  const summary = await runMigration(options);
  console.log('STORAGE_URL_MIGRATION_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runMigrationCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('STORAGE_URL_MIGRATION_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_URL_MIGRATION_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseBackupPath,
  parseArgs,
  runMigration,
  runMigrationCli,
};
