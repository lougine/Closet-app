const mongoose = require('mongoose');

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
