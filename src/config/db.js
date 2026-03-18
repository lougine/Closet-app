const mongoose = require('mongoose');
const { cleanupOrphanedUserData } = require('../utils/orphanCleanup');

const isTruthy = (value) => String(value || '').toLowerCase() === 'true';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    if (isTruthy(process.env.AUTO_CLEANUP_ORPHANS)) {
      try {
        const summary = await cleanupOrphanedUserData();
        console.log(`Orphan cleanup complete: ${JSON.stringify(summary)}`);
      } catch (cleanupError) {
        console.error('Orphan cleanup failed:', cleanupError);
      }
    } else {
      console.log('Orphan auto-cleanup is disabled (set AUTO_CLEANUP_ORPHANS=true to enable).');
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;