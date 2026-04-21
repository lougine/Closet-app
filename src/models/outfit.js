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

  previewImage: {
    type: String,
    default: "",
  },

  previewImageMetadata: {
    type: imageMetadataSchema,
    default: null,
  },

  isLookbook: {
    type: Boolean,
    default: false,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  styledForUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  styledLayout: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

outfitSchema.index({ owner: 1, date: -1, createdAt: -1 });
outfitSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Outfit", outfitSchema);
