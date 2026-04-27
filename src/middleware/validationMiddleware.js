const mongoose = require('mongoose');

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const NON_WORN_EVENT_STATUSES = new Set(['scheduled', 'skipped', 'cancelled']);

const isValidDateValue = (value) => {
  if (value === undefined || value === null || value === '') return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const badRequest = (res, message) => res.status(400).json({ message });

const validateObjectIdValue = (value) => mongoose.Types.ObjectId.isValid(String(value));

exports.validateObjectIdField = ({ source, field, required = false, message }) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  if (!validateObjectIdValue(value)) {
    return badRequest(res, message || `${field} must be a valid ObjectId`);
  }

  return next();
};

exports.validateObjectIdArrayField = ({ source, field, required = false, message }) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null) && !required) {
    return next();
  }

  if (required && !Array.isArray(value)) {
    return badRequest(res, message || `${field} must be an array of ObjectId values`);
  }

  if (!Array.isArray(value)) {
    return badRequest(res, message || `${field} must be an array of ObjectId values`);
  }

  if (required && value.length === 0) {
    return badRequest(res, message || `${field} cannot be empty`);
  }

  const hasInvalid = value.some((entry) => !validateObjectIdValue(entry));
  if (hasInvalid) {
    return badRequest(res, message || `${field} contains an invalid ObjectId`);
  }

  return next();
};

exports.validateDateField = ({ source, field, required = false, message }) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  if (!isValidDateValue(value)) {
    return badRequest(res, message || `${field} must be a valid date`);
  }

  return next();
};

exports.validatePositiveIntegerQuery = ({ field, required = false, min = 1, max, message }) => (req, res, next) => {
  const value = req?.query?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    const rangeMsg = max !== undefined
      ? `${field} must be an integer between ${min} and ${max}`
      : `${field} must be an integer greater than or equal to ${min}`;
    return badRequest(res, message || rangeMsg);
  }

  return next();
};

exports.validateEnumField = ({
  source,
  field,
  allowedValues,
  required = false,
  caseInsensitive = false,
  message,
}) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  if (typeof value !== 'string') {
    return badRequest(res, message || `${field} must be one of: ${allowedValues.join(', ')}`);
  }

  const normalizedValue = caseInsensitive ? value.trim().toLowerCase() : value.trim();
  const normalizedAllowed = caseInsensitive
    ? allowedValues.map((entry) => String(entry).toLowerCase())
    : allowedValues.map((entry) => String(entry));

  if (!normalizedAllowed.includes(normalizedValue)) {
    return badRequest(res, message || `${field} must be one of: ${allowedValues.join(', ')}`);
  }

  return next();
};

exports.validateStringField = ({ source, field, required = false, maxLength, message }) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  if (typeof value !== 'string') {
    return badRequest(res, message || `${field} must be a string`);
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    return badRequest(res, message || `${field} cannot be empty`);
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    return badRequest(res, message || `${field} must be at most ${maxLength} characters`);
  }

  return next();
};

exports.validateIsoDateOnlyField = ({ source, field, required = false, message }) => (req, res, next) => {
  const value = req?.[source]?.[field];

  if ((value === undefined || value === null || value === '') && !required) {
    return next();
  }

  if (required && (value === undefined || value === null || value === '')) {
    return badRequest(res, message || `${field} is required`);
  }

  if (typeof value !== 'string' || !ISO_DATE_ONLY_REGEX.test(value)) {
    return badRequest(res, message || `${field} must be in YYYY-MM-DD format`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return badRequest(res, message || `${field} must be a valid calendar date in YYYY-MM-DD format`);
  }

  return next();
};

exports.validateUsageEventConsistency = ({ source = 'body' } = {}) => (req, res, next) => {
  const payload = req?.[source] || {};
  const rawEventStatus = payload.eventStatus;
  const eventStatus = typeof rawEventStatus === 'string' && rawEventStatus.trim()
    ? rawEventStatus.trim().toLowerCase()
    : 'worn';

  const hasWornDate = payload.wornDate !== undefined && payload.wornDate !== null && payload.wornDate !== '';
  const hasEventLocalDate = payload.eventLocalDate !== undefined
    && payload.eventLocalDate !== null
    && payload.eventLocalDate !== '';
  const hasOutfitId = payload.outfitId !== undefined && payload.outfitId !== null && payload.outfitId !== '';

  if (NON_WORN_EVENT_STATUSES.has(eventStatus) && !hasWornDate && !hasEventLocalDate) {
    return badRequest(res, 'wornDate or eventLocalDate is required when eventStatus is scheduled, skipped, or cancelled');
  }

  if (eventStatus === 'cancelled' && hasOutfitId) {
    return badRequest(res, 'outfitId is not allowed when eventStatus is cancelled');
  }

  return next();
};
