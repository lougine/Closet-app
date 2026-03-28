const mongoose = require('mongoose');

const Garment = require('./garment');
const Outfit = require('./outfit');
const Usage = require('./usage');

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

const deleteUserOwnedData = async (userIds = []) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  await Promise.all([
    Garment.deleteMany({ owner: { $in: userIds } }),
    Outfit.deleteMany({ owner: { $in: userIds } }),
    Usage.deleteMany({ user: { $in: userIds } }),
  ]);
};

const userSchema = new mongoose.Schema({
  name: {   type: String, 
  required: true, unique: true, index: true},
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null },
  profilePictureMetadata: { type: imageMetadataSchema, default: null },
  bannerImage: { type: String, default: null },
  bannerImageMetadata: { type: imageMetadataSchema, default: null },
  bannerPreset: { type: String, default: 'pink' },
  age: { type: Number, min: 1, max: 99, default: null },
  gender: { type: String, default: null },
  clothingSize: { type: String, default: null },
  shoesSize: { type: String, default: null },
  heightCm: { type: Number, min: 1, max: 272, default: null },
  weightKg: { type: Number, min: 1, max: 300, default: null },
  bodyType: { type: String, default: null },
  outfitFormula: { type: String, default: null },
  styleWords: { type: [String], default: [] },
  closetGoal: { type: String, default: null },
  shoppingFrequency: { type: String, default: null },
  stylePreferences: { type: [String], default: [] },

  preferences: {
    style: [String],
    favoriteColors: [String]
  }

}, { timestamps: true });

userSchema.post('findOneAndDelete', async function deletedUserCascade(doc) {
  if (!doc?._id) {
    return;
  }

  await deleteUserOwnedData([doc._id]);
});

userSchema.pre('deleteOne', { query: true, document: false }, async function deleteOneCascade() {
  const usersToDelete = await this.model.find(this.getFilter()).select('_id').lean();
  await deleteUserOwnedData(usersToDelete.map((user) => user._id));
});

userSchema.pre('deleteOne', { query: false, document: true }, async function deleteOneDocumentCascade() {
  await deleteUserOwnedData([this._id]);
});

userSchema.pre('deleteMany', { query: true, document: false }, async function deleteManyCascade() {
  const usersToDelete = await this.model.find(this.getFilter()).select('_id').lean();
  await deleteUserOwnedData(usersToDelete.map((user) => user._id));
});

module.exports = mongoose.model('User', userSchema);