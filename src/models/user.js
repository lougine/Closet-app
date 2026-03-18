const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {   type: String, 
  required: true, unique: true, index: true},
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null },
  bannerImage: { type: String, default: null },
  bannerPreset: { type: String, default: 'pink' },
  age: { type: Number, min: 1, max: 99, default: null },
  heightCm: { type: Number, min: 1, max: 272, default: null },
  weightKg: { type: Number, min: 1, max: 300, default: null },
  bodyType: { type: String, default: null },
  stylePreferences: { type: [String], default: [] },

  preferences: {
    style: [String],
    favoriteColors: [String]
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);