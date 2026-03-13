const usageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  garment: { type: mongoose.Schema.Types.ObjectId, ref: 'Garment', index: true },
  outfit: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' },

  wornDate: { type: Date, index: true }

});

module.exports = mongoose.model('Usage', usageSchema);