const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const {
	validateDateField,
	validateEnumField,
	validateIsoDateOnlyField,
	validateObjectIdArrayField,
	validateObjectIdField,
	validatePositiveIntegerQuery,
	validateStringField,
	validateUsageEventConsistency,
} = require('../middleware/validationMiddleware');
const usageController = require('../controllers/usageController');

const USAGE_EVENT_STATUSES = ['scheduled', 'worn', 'skipped', 'cancelled'];

const router = express.Router();

router.use(authMiddleware);

router.post(
	'/log',
	validateObjectIdField({ source: 'body', field: 'garmentId', required: true }),
	validateObjectIdField({ source: 'body', field: 'outfitId' }),
	validateDateField({ source: 'body', field: 'wornDate' }),
	validateEnumField({ source: 'body', field: 'eventStatus', allowedValues: USAGE_EVENT_STATUSES, caseInsensitive: true }),
	validateStringField({ source: 'body', field: 'eventSource', maxLength: 64 }),
	validateStringField({ source: 'body', field: 'eventTimezone', maxLength: 100 }),
	validateIsoDateOnlyField({ source: 'body', field: 'eventLocalDate' }),
	validateStringField({ source: 'body', field: 'eventGroupId', maxLength: 128 }),
	validateStringField({ source: 'body', field: 'idempotencyKey', maxLength: 128 }),
	validateUsageEventConsistency({ source: 'body' }),
	usageController.logUsage
);

router.post(
	'/bulk-log',
	validateObjectIdArrayField({ source: 'body', field: 'garmentIds', required: true }),
	validateObjectIdField({ source: 'body', field: 'outfitId' }),
	validateDateField({ source: 'body', field: 'wornDate' }),
	validateEnumField({ source: 'body', field: 'eventStatus', allowedValues: USAGE_EVENT_STATUSES, caseInsensitive: true }),
	validateStringField({ source: 'body', field: 'eventSource', maxLength: 64 }),
	validateStringField({ source: 'body', field: 'eventTimezone', maxLength: 100 }),
	validateIsoDateOnlyField({ source: 'body', field: 'eventLocalDate' }),
	validateStringField({ source: 'body', field: 'eventGroupId', maxLength: 128 }),
	validateStringField({ source: 'body', field: 'idempotencyKey', maxLength: 128 }),
	validateUsageEventConsistency({ source: 'body' }),
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
