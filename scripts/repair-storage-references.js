require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const { collectImageReferences, writeReferenceValue } = require('./storage-reference-utils');

const parseBackupPath = (argv = process.argv.slice(2), now = Date.now()) => {
  const backupArg = argv.find((arg) => arg.startsWith('--backup='));
  if (backupArg) {
    return path.resolve(process.cwd(), backupArg.split('=')[1]);
  }

  if (argv.includes('--backup')) {
    return path.resolve(process.cwd(), `backups/storage-repair-${now}.json`);
  }

  return null;
};

const parseRepairArgs = (argv = process.argv.slice(2), now = Date.now()) => {
  return {
    dryRun: argv.includes('--dry-run'),
    apply: argv.includes('--apply'),
    backupPath: parseBackupPath(argv, now),
  };
};

const runRepair = async (options = {}) => {
  const {
    dryRun = false,
    apply = false,
    backupPath = null,
  } = options;

  await connectDB();

  const references = await collectImageReferences();
  const malformedReferences = references.filter((ref) => !ref.filename);

  const plannedChanges = malformedReferences.map((ref) => ({
    model: ref.modelLabel,
    docId: ref.docIdString,
    field: ref.field,
    from: ref.imageUrl,
    to: ref.emptyValue,
  }));

  if (backupPath && plannedChanges.length > 0) {
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify({ generatedAt: new Date().toISOString(), plannedChanges }, null, 2));
  }

  let appliedCount = 0;
  if (apply && !dryRun) {
    for (const ref of malformedReferences) {
      const result = await writeReferenceValue(ref, ref.emptyValue);
      if ((result.modifiedCount || 0) > 0) {
        appliedCount += 1;
      }
    }
  }

  const summary = {
    dryRun,
    apply,
    backupPath,
    scanned: references.length,
    malformedCount: malformedReferences.length,
    appliedCount,
    plannedChanges,
  };

  return summary;
};

const runRepairCli = async (argv = process.argv.slice(2)) => {
  const options = parseRepairArgs(argv);
  const summary = await runRepair(options);
  console.log('STORAGE_REPAIR_SUMMARY=' + JSON.stringify(summary));
  return summary;
};

if (require.main === module) {
  runRepairCli()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('STORAGE_REPAIR_FAILED', error);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error('STORAGE_REPAIR_DISCONNECT_FAILED', disconnectError);
      }
      process.exit(1);
    });
}

module.exports = {
  parseBackupPath,
  parseRepairArgs,
  runRepair,
  runRepairCli,
};
