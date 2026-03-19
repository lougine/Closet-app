const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/user');

(async () => {
  const uri = process.env.MONGO_URI || '';
  const dbName = process.env.MONGO_DB_NAME || '(not set)';
  const hostRedacted = uri
    ? uri.replace(/:\/\/([^:@/]+):([^@/]+)@/, '://$1:<redacted>@')
    : '(missing)';

  const options = { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 };
  if (process.env.MONGO_DB_NAME) options.dbName = process.env.MONGO_DB_NAME;

  await mongoose.connect(uri, options);

  const currentDb = mongoose.connection.name;
  const userCount = await User.countDocuments({});
  const latestUsers = await User.find({}).sort({ createdAt: -1 }).limit(5).select('email createdAt').lean();

  console.log(JSON.stringify({
    mongoTarget: hostRedacted,
    envDbName: dbName,
    connectedDb: currentDb,
    userCount,
    latestUsers,
  }, null, 2));

  await mongoose.disconnect();
})();
