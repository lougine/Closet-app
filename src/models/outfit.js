const mongoose = require("mongoose");

const outfitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  garments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garment"
    }
  ],

  date: {
    type: Date
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Outfit", outfitSchema);
