require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const { cleanupOrphanedUserData } = require('../src/utils/orphanCleanup');

const run = async () => {
  try {
    await connectDB();
    const summary = await cleanupOrphanedUserData();
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