const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRateLimit } = require('../middleware/rateLimitMiddleware');

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.post('/google/exchange', authRateLimit, authController.exchangeGoogleToken);

module.exports = router;