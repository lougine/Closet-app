const express = require('express');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { isSafeFilename } = require('../utils/imageFileUtils');
const { getManagedReadUrl } = require('../services/storage');
const { CLOUDINARY_FOLDER } = require('../config/upload');

const router = express.Router();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildManagedPublicId = (filename) => {
  const folder = String(CLOUDINARY_FOLDER || '').trim().replace(/^\/+|\/+$/g, '');
  if (!folder || !filename) return null;
  return `${folder}/${filename}`;
};

router.use(authMiddleware);

router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: 'Invalid filename.' });
    }

    const legacyImageUrl = `/uploads/${filename}`;
    const managedReadUrl = await getManagedReadUrl(filename);
    const managedPublicId = buildManagedPublicId(filename);
    const filenameRegex = new RegExp(`${escapeRegex(filename)}(?:$|[?#])`, 'i');
    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    const [garmentExists, userImageExists, outfitImageExists] = await Promise.all([
      Garment.exists({
        owner: ownerId,
        $or: [
          { imageUrl: legacyImageUrl },
          ...(managedReadUrl ? [{ imageUrl: managedReadUrl }] : []),
          { imageUrl: { $regex: filenameRegex } },
          ...(managedPublicId ? [{ 'imageMetadata.publicId': managedPublicId }] : []),
        ],
      }),
      User.exists({
        _id: ownerId,
        $or: [
          { profilePicture: legacyImageUrl },
          { bannerImage: legacyImageUrl },
          ...(managedReadUrl ? [{ profilePicture: managedReadUrl }, { bannerImage: managedReadUrl }] : []),
          { profilePicture: { $regex: filenameRegex } },
          { bannerImage: { $regex: filenameRegex } },
          ...(managedPublicId
            ? [
              { 'profilePictureMetadata.publicId': managedPublicId },
              { 'bannerImageMetadata.publicId': managedPublicId },
            ]
            : []),
        ],
      }),
      Outfit.exists({
        owner: ownerId,
        $or: [
          { previewImage: legacyImageUrl },
          ...(managedReadUrl ? [{ previewImage: managedReadUrl }] : []),
          { previewImage: { $regex: filenameRegex } },
          ...(managedPublicId ? [{ 'previewImageMetadata.publicId': managedPublicId }] : []),
        ],
      }),
    ]);

    if (!garmentExists && !userImageExists && !outfitImageExists) {
      return res.status(404).json({ message: 'Image not found.' });
    }

    if (!managedReadUrl) {
      return res.status(404).json({ message: 'Image not found.' });
    }

    if (typeof fetch !== 'function') {
      return res.status(500).json({ message: 'Server runtime does not support remote fetch.' });
    }

    const upstream = await fetch(managedReadUrl);
    if (upstream.status === 404) {
      return res.status(404).json({ message: 'Image not found.' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ message: 'Failed to retrieve image from storage.' });
    }

    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    }

    const payload = Buffer.from(await upstream.arrayBuffer());
    return res.send(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
