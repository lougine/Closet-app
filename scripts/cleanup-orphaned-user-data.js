require('dotenv').config({ override: true });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const { cleanupOrphanedUserData } = require('../src/utils/orphanCleanup');

const parseRetentionDaysArg = () => {
  const retentionArg = process.argv.find((arg) => arg.startsWith('--retention-days='));
  if (!retentionArg) return undefined;

  const value = Number(retentionArg.split('=')[1]);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
};

const run = async () => {
  try {
    const dryRun = process.argv.includes('--dry-run');
    const retentionDays = parseRetentionDaysArg();

    await connectDB();
    const summary = await cleanupOrphanedUserData({ dryRun, retentionDays });
    console.log('ORPHAN_CLEANUP_SUMMARY=' + JSON.stringify(summary));
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('ORPHAN_CLEANUP_FAILED', error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('ORPHAN_CLEANUP_DISCONNECT_FAILED', disconnectError);
    }
    process.exit(1);
  }
};

run();