const User = require('../models/user');
const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');

const buildMissingOwnerFilter = (existingUserIds) => {
  if (existingUserIds.length === 0) {
    return { $exists: true };
  }

  return { $nin: existingUserIds };
};

const cleanupOrphanedUserData = async () => {
  const existingUsers = await User.find({}).select('_id').lean();
  const existingUserIds = existingUsers.map((user) => user._id);

  const ownerFilter = buildMissingOwnerFilter(existingUserIds);

  const [garmentResult, outfitResult, usageResult] = await Promise.all([
    Garment.deleteMany({ owner: ownerFilter }),
    Outfit.deleteMany({ owner: ownerFilter }),
    Usage.deleteMany({ user: ownerFilter }),
  ]);

  return {
    garmentsDeleted: garmentResult.deletedCount || 0,
    outfitsDeleted: outfitResult.deletedCount || 0,
    usageDeleted: usageResult.deletedCount || 0,
  };
};

module.exports = {
  cleanupOrphanedUserData,
};