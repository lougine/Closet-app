const fs = require('fs/promises');

const User = require('../models/user');
const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');
const {
  extractFilenameFromImageUrl,
  listUploadedFiles,
  resolveUploadPath,
} = require('./imageFileUtils');
const { ORPHAN_UPLOAD_RETENTION_DAYS } = require('../config/upload');

const buildMissingOwnerFilter = (existingUserIds) => {
  if (existingUserIds.length === 0) {
    return { $exists: true };
  }

  return { $nin: existingUserIds };
};

const buildReferencedImageSet = async () => {
  const [garments, users] = await Promise.all([
    Garment.find({ imageUrl: { $exists: true, $ne: null } }).select('imageUrl').lean(),
    User.find({
      $or: [
        { profilePicture: { $exists: true, $ne: null } },
        { bannerImage: { $exists: true, $ne: null } },
      ],
    }).select('profilePicture bannerImage').lean(),
  ]);

  const referencedFilenames = new Set();

  for (const garment of garments) {
    const filename = extractFilenameFromImageUrl(garment.imageUrl);
    if (filename) referencedFilenames.add(filename);
  }

  for (const user of users) {
    const profileFilename = extractFilenameFromImageUrl(user.profilePicture);
    const bannerFilename = extractFilenameFromImageUrl(user.bannerImage);
    if (profileFilename) referencedFilenames.add(profileFilename);
    if (bannerFilename) referencedFilenames.add(bannerFilename);
  }

  return referencedFilenames;
};

const cleanupOrphanedUploadFiles = async (options = {}) => {
  const {
    dryRun = false,
    retentionDays = ORPHAN_UPLOAD_RETENTION_DAYS,
    now = new Date(),
  } = options;

  const safeRetentionDays = Number.isFinite(Number(retentionDays)) && Number(retentionDays) >= 0
    ? Number(retentionDays)
    : ORPHAN_UPLOAD_RETENTION_DAYS;
  const retentionCutoff = now.getTime() - (safeRetentionDays * 24 * 60 * 60 * 1000);

  const [referencedFilenames, uploadedFiles] = await Promise.all([
    buildReferencedImageSet(),
    listUploadedFiles(),
  ]);

  const orphanCandidates = [];

  for (const filename of uploadedFiles) {
    if (referencedFilenames.has(filename)) {
      continue;
    }

    const fullPath = resolveUploadPath(filename);
    if (!fullPath) {
      continue;
    }

    try {
      const stats = await fs.stat(fullPath);
      if (stats.mtimeMs <= retentionCutoff) {
        orphanCandidates.push({ filename, fullPath });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  let orphanFilesDeleted = 0;
  if (!dryRun) {
    for (const candidate of orphanCandidates) {
      try {
        await fs.unlink(candidate.fullPath);
        orphanFilesDeleted += 1;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  return {
    filesScanned: uploadedFiles.length,
    orphanFilesFound: orphanCandidates.length,
    orphanFilesDeleted,
    orphanFiles: orphanCandidates.map((candidate) => candidate.filename),
    orphanRetentionDays: safeRetentionDays,
    dryRun,
  };
};

const cleanupOrphanedUserData = async (options = {}) => {
  const existingUsers = await User.find({}).select('_id').lean();
  const existingUserIds = existingUsers.map((user) => user._id);

  const ownerFilter = buildMissingOwnerFilter(existingUserIds);

  const [garmentResult, outfitResult, usageResult] = await Promise.all([
    Garment.deleteMany({ owner: ownerFilter }),
    Outfit.deleteMany({ owner: ownerFilter }),
    Usage.deleteMany({ user: ownerFilter }),
  ]);

  const uploadFileSummary = await cleanupOrphanedUploadFiles(options);

  return {
    garmentsDeleted: garmentResult.deletedCount || 0,
    outfitsDeleted: outfitResult.deletedCount || 0,
    usageDeleted: usageResult.deletedCount || 0,
    ...uploadFileSummary,
  };
};

module.exports = {
  cleanupOrphanedUserData,
  cleanupOrphanedUploadFiles,
};