const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory (temporarily public for testing)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('API is running');
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const garmentRoutes = require("./routes/garmentRoutes");
const usageRoutes = require('./routes/usageRoutes');

app.use("/api/garments", garmentRoutes);
app.use('/api/usage', usageRoutes);

const outfitRoutes = require("./routes/outfitRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

app.use("/api/outfits", outfitRoutes);
app.use("/api/analytics", analyticsRoutes);

module.exports = app;
