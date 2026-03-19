const mongoose = require('mongoose');
const { cleanupOrphanedUserData } = require('../utils/orphanCleanup');

const isTruthy = (value) => String(value || '').toLowerCase() === 'true';

const getMongoConnectOptions = () => {
  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  };

  if (process.env.MONGO_DB_NAME) {
    options.dbName = process.env.MONGO_DB_NAME;
  }

  return options;
};

const sanitizeMongoUriForLogs = (uri) => {
  if (!uri) return '<missing>';
  return uri.replace(/:\/\/([^:@/]+):([^@/]+)@/, '://$1:<redacted>@');
};

const getMongoDeploymentType = (uri) => {
  const normalized = String(uri || '').toLowerCase();
  if (normalized.startsWith('mongodb+srv://') || normalized.includes('.mongodb.net')) {
    return 'atlas';
  }

  return 'local';
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set. Configure your Atlas connection string in environment variables.');
    }

    await mongoose.connect(mongoUri, getMongoConnectOptions());
    console.log('MongoDB connected');
    console.log(`MongoDB startup: db=${mongoose.connection.name} deployment=${getMongoDeploymentType(mongoUri)}`);

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
    const mongoUri = sanitizeMongoUriForLogs(process.env.MONGO_URI);
    console.error(`MongoDB connection failed for URI: ${mongoUri}`);
    console.error(error.message || error);
    process.exit(1);
  }
};

module.exports = connectDB;