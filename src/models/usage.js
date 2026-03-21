const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    garment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garment',
      required: true,
      index: true,
    },
    outfit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
      default: null,
      index: true,
    },
    wornDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

usageSchema.index({ user: 1, garment: 1, wornDate: -1 });
usageSchema.index({ user: 1, wornDate: -1 });

module.exports = mongoose.model('Usage', usageSchema);