require('./config/env');

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const app = express();

connectDB();

const buildCorsOptions = () => {
  const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.length === 0) {
    // Keep local development friction low, while defaulting to deny-by-default in production.
    return {
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true,
    };
  }

  const allowedOrigins = new Set(configuredOrigins);
  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      const err = new Error('CORS origin not allowed');
      err.statusCode = 403;
      callback(err);
    },
    credentials: true,
  };
};

app.use(cors(buildCorsOptions()));
app.use(helmet());
app.use(express.json());
app.use((req, res, next) => {
  const incomingRequestId = req.headers['x-request-id'];
  const requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim()
    ? incomingRequestId.trim()
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

app.get('/', (req, res) => {
  res.send('API is running');
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const healthRoutes = require('./routes/healthRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/health', healthRoutes);

const garmentRoutes = require("./routes/garmentRoutes");
const usageRoutes = require('./routes/usageRoutes');

app.use("/api/garments", garmentRoutes);
app.use('/api/usage', usageRoutes);

const outfitRoutes = require("./routes/outfitRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const communityRoutes = require('./routes/communityRoutes');
const seedRoutes = require('./routes/seedRoutes');

app.use("/api/outfits", outfitRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/seed', seedRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;

  if (statusCode >= 500) {
    console.error(`REQUEST_FAILED requestId=${req.requestId || 'unknown'} message=${err?.message || 'Unknown error'}`);
  }

  const message = statusCode === 403 ? 'Origin not allowed.' : 'Internal server error';
  res.status(statusCode).json({
    message,
    requestId: req.requestId || null,
  });
});

module.exports = app;
