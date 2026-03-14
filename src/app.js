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

module.exports = app;

const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);



const authMiddleware = require('./middleware/authMiddleware');

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});


const garmentRoutes = require("./routes/garmentRoutes");

app.use("/api/garments", garmentRoutes);


const outfitRoutes = require("./routes/outfitRoutes");

app.use("/api/outfits", outfitRoutes);
