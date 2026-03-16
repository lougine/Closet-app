const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory with authentication
const authMiddleware = require('./middleware/authMiddleware');
app.use('/api/uploads', authMiddleware, express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('API is running');
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

const garmentRoutes = require("./routes/garmentRoutes");

app.use("/api/garments", garmentRoutes);

const outfitRoutes = require("./routes/outfitRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

app.use("/api/outfits", outfitRoutes);
app.use("/api/analytics", analyticsRoutes);

module.exports = app;
