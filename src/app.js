require('./config/env');

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

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

module.exports = app;
