const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {   type: String, 
  required: true, unique: true, index: true},
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null },
  bannerImage: { type: String, default: null },
  bannerPreset: { type: String, default: 'pink' },

  preferences: {
    style: [String],
    favoriteColors: [String]
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);