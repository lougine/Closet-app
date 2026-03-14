const mongoose = require("mongoose");

const garmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  color: {
    type: String
  },

  season: {
    type: String
  },

  imageUrl: {
    type: String
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Garment", garmentSchema);
