const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const { seedRateLimit } = require('../middleware/rateLimitMiddleware');
const seedController = require('../controllers/seedController');

const router = express.Router();

router.use(authMiddleware);
router.post('/generate-user', seedRateLimit, seedController.generateUserWithData);

module.exports = router;
