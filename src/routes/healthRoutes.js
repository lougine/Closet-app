const express = require('express');
const { getStorageHealthSnapshot } = require('../services/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const storage = getStorageHealthSnapshot();

  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage,
  });
});

module.exports = router;
