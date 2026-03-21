const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const {
	validateDateField,
	validateObjectIdArrayField,
	validateObjectIdField,
	validatePositiveIntegerQuery,
} = require('../middleware/validationMiddleware');
const usageController = require('../controllers/usageController');

const router = express.Router();

router.use(authMiddleware);

router.post(
	'/log',
	validateObjectIdField({ source: 'body', field: 'garmentId', required: true }),
	validateObjectIdField({ source: 'body', field: 'outfitId' }),
	validateDateField({ source: 'body', field: 'wornDate' }),
	usageController.logUsage
);

router.post(
	'/bulk-log',
	validateObjectIdArrayField({ source: 'body', field: 'garmentIds', required: true }),
	validateObjectIdField({ source: 'body', field: 'outfitId' }),
	validateDateField({ source: 'body', field: 'wornDate' }),
	usageController.logBulkUsage
);

router.get(
	'/history',
	validateObjectIdField({ source: 'query', field: 'garmentId' }),
	validateDateField({ source: 'query', field: 'startDate' }),
	validateDateField({ source: 'query', field: 'endDate' }),
	validatePositiveIntegerQuery({ field: 'page', min: 1 }),
	validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 100 }),
	usageController.getUsageHistory
);

module.exports = router;
