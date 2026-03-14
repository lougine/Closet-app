const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {   type: String, 
  required: true, unique: true, index: true},
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },

  preferences: {
    style: [String],
    favoriteColors: [String]
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);