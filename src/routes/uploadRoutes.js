const express = require('express');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { isSafeFilename } = require('../utils/imageFileUtils');
const { getManagedReadUrl } = require('../services/storage');

const router = express.Router();

router.use(authMiddleware);

router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    if (!isSafeFilename(filename)) {
      return res.status(400).json({ message: 'Invalid filename.' });
    }

    const imageUrl = `/uploads/${filename}`;
    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    const [garmentExists, userImageExists, outfitImageExists] = await Promise.all([
      Garment.exists({ owner: ownerId, imageUrl }),
      User.exists({
        _id: ownerId,
        $or: [{ profilePicture: imageUrl }, { bannerImage: imageUrl }],
      }),
      Outfit.exists({ owner: ownerId, previewImage: imageUrl }),
    ]);

    if (!garmentExists && !userImageExists && !outfitImageExists) {
      return res.status(404).json({ message: 'Image not found.' });
    }

    const managedReadUrl = await getManagedReadUrl(filename);
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
