const express = require('express');
const fs = require('fs/promises');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { isSafeFilename } = require('../utils/imageFileUtils');
const { getReadableLocalPath } = require('../services/storage');

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

    const fullPath = await getReadableLocalPath(filename);
    if (!fullPath) {
      return res.status(404).json({ message: 'Image not found.' });
    }

    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ message: 'Image not found.' });
    }

    return res.sendFile(fullPath);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
