const rateLimit = require('express-rate-limit');

const resolveLimit = (envName, fallback) => {
  const value = Number(process.env[envName]);
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
};

const buildLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
});

const isTestEnvironment = () => String(process.env.NODE_ENV || '').toLowerCase() === 'test';

const authRateLimit = buildLimiter(
  15 * 60 * 1000,
  resolveLimit('RATE_LIMIT_AUTH_MAX', 5),
  'Too many authentication attempts. Please try again later.'
);

const searchRateLimit = buildLimiter(
  60 * 60 * 1000,
  resolveLimit('RATE_LIMIT_IMAGE_SEARCH_MAX', 20),
  'Image search rate limit exceeded. Please try again later.'
);

const removeBackgroundRateLimit = buildLimiter(
  60 * 60 * 1000,
  resolveLimit('RATE_LIMIT_REMOVE_BG_MAX', 10),
  'Background removal rate limit exceeded. Please try again later.'
);

const seedRateLimit = buildLimiter(
  60 * 60 * 1000,
  resolveLimit('RATE_LIMIT_SEED_MAX', isTestEnvironment() ? 1000 : 1),
  'Seed endpoint rate limit exceeded. Please try again later.'
);

module.exports = {
  authRateLimit,
  searchRateLimit,
  removeBackgroundRateLimit,
  seedRateLimit,
};