const express = require('express');
const mongoose = require('mongoose');
const { getStorageHealthSnapshot } = require('../services/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const storage = getStorageHealthSnapshot();
  const mongoReady = mongoose.connection.readyState === 1;
  const storageReady = storage.effectivePrimaryDriver !== 'unavailable';
  const ready = mongoReady && storageReady;

  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      mongoReady,
      storageReady,
    },
    storage,
  });
});

module.exports = router;
