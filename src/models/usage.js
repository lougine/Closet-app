const mongoose = require('mongoose');

const USAGE_EVENT_STATUSES = ['scheduled', 'worn', 'skipped', 'cancelled'];

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
    eventStatus: {
      type: String,
      enum: USAGE_EVENT_STATUSES,
      default: 'worn',
      index: true,
    },
    eventSource: {
      type: String,
      default: 'manual',
    },
    eventTimezone: {
      type: String,
      default: null,
    },
    eventLocalDate: {
      type: String,
      default: null,
    },
    eventGroupId: {
      type: String,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

usageSchema.index({ user: 1, garment: 1, wornDate: -1 });
usageSchema.index({ user: 1, wornDate: -1 });
usageSchema.index({ user: 1, eventStatus: 1, wornDate: -1 });
usageSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
    },
  }
);

module.exports = mongoose.model('Usage', usageSchema);