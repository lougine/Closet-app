require('./src/config/env');
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received. Starting graceful shutdown...`);

  const hardStopTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out. Exiting forcefully.');
    process.exit(1);
  }, 10000);

  if (typeof hardStopTimer.unref === 'function') {
    hardStopTimer.unref();
  }

  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error while closing MongoDB connection:', error?.message || error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));