require('dotenv').config({ override: true });
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const Garment = require('../src/models/garment');
const User = require('../src/models/user');
const Outfit = require('../src/models/outfit');
const CommunityPost = require('../src/models/communityPost');

const MODEL_BY_LABEL = {
  Garment,
  User,
  Outfit,
  CommunityPost,
};

const parseRestoreBackupPath = (argv = process.argv.slice(2)) => {
  const backupArg = argv.find((arg) => arg.startsWith('--backup='));
  if (!backupArg) {
    throw new Error('Missing --backup=<path> argument.');
  }

  return path.resolve(process.cwd(), backupArg.split('=')[1]);
};

const parseRestoreArgs = (argv = process.argv.slice(2)) => {
  return {
    dryRun: argv.includes('--dry-run'),
    backupPath: parseRestoreBackupPath(argv),
  };
};

const runRestore = async (options = {}) => {
  const { dryRun = false, backupPath } = options;

  const raw = await fs.readFile(backupPath, 'utf8');
  const parsed = JSON.parse(raw);
  const plannedChanges = Array.isArray(parsed.plannedChanges) ? parsed.plannedChanges : [];

  await connectDB();

  let restored = 0;
  if (!dryRun) {
    for (const change of plannedChanges) {
      const model = MODEL_BY_LABEL[change.model];
      if (!model || !change.docId || !change.field) {
        continue;
      }

      const result = await model.updateOne(
        { _id: change.docId },
        { $set: { [change.field]: change.from } }
      );

      if ((result.modifiedCount || 0) > 0) {
        restored += 1;
      }
    }
  }

  const summary = {
    dryRun,
    backupPath,
    changesFound: plannedChanges.length,
    restored,
  };

  return summary;
};

const runRestoreCli = async (argv = process.argv.slice(2)) => {
  const options = parseRestoreArgs(argv);
  const summary = await runRestore(options);
  console.log('STORAGE_RESTORE_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runRestoreCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('STORAGE_RESTORE_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_RESTORE_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseRestoreBackupPath,
  parseRestoreArgs,
  runRestore,
  runRestoreCli,
};
