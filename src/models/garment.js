const mongoose = require("mongoose");

const imageMetadataSchema = new mongoose.Schema({
  imageUrl: { type: String, default: null },
  provider: { type: String, default: 'local' },
  publicId: { type: String, default: null },
  secureUrl: { type: String, default: null },
  assetId: { type: String, default: null },
  version: { type: Number, default: null },
  resourceType: { type: String, default: null },
  format: { type: String, default: null },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  bytes: { type: Number, default: null },
  mimeType: { type: String, default: null },
  originalFilename: { type: String, default: null },
  uploadedAt: { type: Date, default: null },
}, { _id: false });

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

  subcategory: {
    type: String,
    default: null,
  },

  tags: {
    type: [String],
    default: [],
  },

  purchasePrice: {
    type: Number,
    min: 0
  },

  imageUrl: {
    type: String
  },

  imageMetadata: {
    type: imageMetadataSchema,
    default: null,
  },

  isFavorite: {
    type: Boolean,
    default: false,
  },

  isHidden: {
    type: Boolean,
    default: false,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

garmentSchema.index({ owner: 1, createdAt: -1 });
garmentSchema.index({ owner: 1, category: 1, color: 1 });

module.exports = mongoose.model("Garment", garmentSchema);
