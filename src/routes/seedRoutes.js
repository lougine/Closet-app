const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const seedController = require('../controllers/seedController');

const router = express.Router();

router.use(authMiddleware);
router.post('/generate-user', seedController.generateUserWithData);

module.exports = router;
