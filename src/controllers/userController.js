// @ts-ignore
const User = require('../models/user');
// @ts-ignore
const bcrypt = require('bcryptjs');
const { createImageUpload } = require('../middleware/imageUploadMiddleware');
const { deleteImageByUrl } = require('../utils/imageFileUtils');
const { buildImageMetadata } = require('../utils/imageMetadata');

exports.uploadProfileImage = createImageUpload('profileImage');
exports.uploadBannerImage = createImageUpload('bannerImage');

const toClientUser = (userDoc) => {
  const payload = userDoc.toObject();
  payload.username = payload.name;
  return payload;
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Prevent password updates through this endpoint
    delete updates.password;
    delete updates.profilePicture;
    delete updates.bannerImage;

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
      select: '-password',
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'profileImage file is required.' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      await deleteImageByUrl(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const previousImage = user.profilePicture;
    user.profilePicture = `/uploads/${req.file.filename}`;
    user.profilePictureMetadata = buildImageMetadata(req.file, user.profilePicture);
    await user.save();

    if (previousImage && previousImage !== user.profilePicture) {
      await deleteImageByUrl(previousImage);
    }

    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'bannerImage file is required.' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      await deleteImageByUrl(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const previousBanner = user.bannerImage;
    user.bannerImage = `/uploads/${req.file.filename}`;
    user.bannerImageMetadata = buildImageMetadata(req.file, user.bannerImage);
    await user.save();

    if (previousBanner && previousBanner !== user.bannerImage) {
      await deleteImageByUrl(previousBanner);
    }

    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBannerPreset = async (req, res) => {
  try {
    const { bannerPreset } = req.body;

    if (!bannerPreset || typeof bannerPreset !== 'string') {
      return res.status(400).json({ message: 'bannerPreset is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { bannerPreset },
      {
        new: true,
        runValidators: true,
        select: '-password',
      },
    );

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  // Placeholder: return an empty set of notifications. Expand this as needed.
  res.json({ notifications: [] });
};

exports.updatePrivacy = async (req, res) => {
  try {
    const { privacy } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.preferences = user.preferences || {};
    user.preferences.privacy = privacy;
    await user.save();

    res.json({ message: 'Privacy updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivity = async (req, res) => {
  // Placeholder activity feed. Extend with more detailed logic as needed.
  try {
    const activities = [
      {
        _id: '1',
        type: 'outfit_logged',
        description: 'Logged a new outfit',
        date: new Date().toISOString(),
      },
    ];
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
