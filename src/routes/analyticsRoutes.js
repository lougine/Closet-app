const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const { validatePositiveIntegerQuery } = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/categories', analyticsController.getCategories);
router.get('/colours', analyticsController.getColours);
router.get('/most-worn', validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 50 }), analyticsController.getMostWorn);
router.get('/least-worn', validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 50 }), analyticsController.getLeastWorn);
router.get('/never-worn', validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 50 }), analyticsController.getNeverWorn);
router.get('/cost-per-wear', validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 100 }), analyticsController.getCostPerWear);
router.get('/usage-trends', validatePositiveIntegerQuery({ field: 'months', min: 1, max: 24 }), analyticsController.getUsageTrends);

module.exports = router;
