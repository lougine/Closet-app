require('dotenv').config();
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

const isTruthy = (value) => String(value || '').toLowerCase() === 'true';

const isAtlasUri = (uri) => {
  const normalized = String(uri || '').toLowerCase();
  return normalized.startsWith('mongodb+srv://') || normalized.includes('.mongodb.net');
};

const run = async () => {
  try {
    const dryRun = process.argv.includes('--dry-run');
    const retentionDays = parseRetentionDaysArg();
    const allowAtlas = process.argv.includes('--allow-atlas') || isTruthy(process.env.ALLOW_ATLAS_ORPHAN_CLEANUP);

    if (isAtlasUri(process.env.MONGO_URI) && !allowAtlas) {
      throw new Error('Refusing orphan cleanup against Atlas without explicit opt-in. Use --allow-atlas or set ALLOW_ATLAS_ORPHAN_CLEANUP=true.');
    }

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