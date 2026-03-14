const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/categories', analyticsController.getCategories);
router.get('/colours', analyticsController.getColours);
router.get('/most-worn', analyticsController.getMostWorn);
router.get('/least-worn', analyticsController.getLeastWorn);
router.get('/never-worn', analyticsController.getNeverWorn);

module.exports = router;
