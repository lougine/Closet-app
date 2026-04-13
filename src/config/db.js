const mongoose = require('mongoose');
const { cleanupOrphanedUserData } = require('../utils/orphanCleanup');

const isTruthy = (value) => String(value || '').toLowerCase() === 'true';
const isAtlasUri = (uri) => {
  const normalized = String(uri || '').toLowerCase();
  return normalized.startsWith('mongodb+srv://') || normalized.includes('.mongodb.net');
};

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
  if (isAtlasUri(uri)) {
    return 'atlas';
  }

  return 'local';
};

const isSrvDnsRefusedError = (error) => {
  const message = String(error?.message || '');
  return error?.code === 'ECONNREFUSED' && message.includes('querySrv');
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set. Configure your Atlas connection string in environment variables.');
    }

    const deployment = getMongoDeploymentType(mongoUri);
    const isTestRuntime = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
    if (isTestRuntime && deployment === 'atlas' && !isTruthy(process.env.ALLOW_TEST_ATLAS)) {
      throw new Error('Refusing Atlas connection during tests. Set ALLOW_TEST_ATLAS=true to override intentionally.');
    }

    try {
      await mongoose.connect(mongoUri, getMongoConnectOptions());
    } catch (primaryConnectError) {
      const fallbackUri = process.env.MONGO_URI_FALLBACK;
      if (!fallbackUri || !isSrvDnsRefusedError(primaryConnectError)) {
        throw primaryConnectError;
      }

      console.warn('MongoDB SRV DNS lookup failed with ECONNREFUSED. Retrying with MONGO_URI_FALLBACK.');
      await mongoose.connect(fallbackUri, getMongoConnectOptions());
    }

    console.log('MongoDB connected');
    console.log(`MongoDB startup: db=${mongoose.connection.name} deployment=${deployment}`);

    if (isTruthy(process.env.AUTO_CLEANUP_ORPHANS)) {
      if (deployment === 'atlas' && !isTruthy(process.env.ALLOW_ATLAS_ORPHAN_CLEANUP)) {
        console.warn('Orphan cleanup skipped for Atlas (set ALLOW_ATLAS_ORPHAN_CLEANUP=true to allow).');
      } else {
        try {
          const summary = await cleanupOrphanedUserData();
          console.log(`Orphan cleanup complete: ${JSON.stringify(summary)}`);
        } catch (cleanupError) {
          console.error('Orphan cleanup failed:', cleanupError);
        }
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