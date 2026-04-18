// @ts-ignore
const User = require('../models/user');
// @ts-ignore
const bcrypt = require('bcryptjs');
const { createImageUpload } = require('../middleware/imageUploadMiddleware');
const { deleteImageByUrl } = require('../utils/imageFileUtils');
const { buildImageMetadata } = require('../utils/imageMetadata');

exports.uploadProfileImage = createImageUpload('profileImage');
exports.uploadBannerImage = createImageUpload('bannerImage');

const getUploadedImageUrl = (file) => {
  return file?.storage?.secureUrl || file?.storage?.managedUrl || null;
};

const toIdString = (value) => String(value);

const toClientRelationshipUser = (userDoc, meFollowingIds = new Set()) => {
  const payload = userDoc.toObject ? userDoc.toObject() : userDoc;
  const userId = toIdString(payload._id);
  const followerCount = Array.isArray(payload.followers) ? payload.followers.length : 0;
  const followingCount = Array.isArray(payload.following) ? payload.following.length : 0;

  return {
    _id: userId,
    name: payload.name,
    username: payload.name,
    profilePicture: payload.profilePicture || null,
    followerCount,
    followingCount,
    isFollowing: meFollowingIds.has(userId),
  };
};

const toClientUser = (userDoc) => {
  const payload = userDoc.toObject();
  payload.username = payload.name;
  payload.followerCount = Array.isArray(payload.followers) ? payload.followers.length : 0;
  payload.followingCount = Array.isArray(payload.following) ? payload.following.length : 0;
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

    const uploadedImageUrl = getUploadedImageUrl(req.file);
    if (!uploadedImageUrl) {
      return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      await deleteImageByUrl(uploadedImageUrl);
      return res.status(404).json({ message: 'User not found' });
    }

    const previousImage = user.profilePicture;
    user.profilePicture = uploadedImageUrl;
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

    const uploadedImageUrl = getUploadedImageUrl(req.file);
    if (!uploadedImageUrl) {
      return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      await deleteImageByUrl(uploadedImageUrl);
      return res.status(404).json({ message: 'User not found' });
    }

    const previousBanner = user.bannerImage;
    user.bannerImage = uploadedImageUrl;
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

exports.searchUsers = async (req, res) => {
  try {
    const queryText = String(req.query.q || req.query.search || '').trim();
    const rawLimit = Number.parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;

    if (!queryText) {
      return res.json({ items: [] });
    }

    const me = await User.findById(req.user.userId).select('following');
    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    const meFollowingIds = new Set((me.following || []).map((id) => String(id)));
    const escapedQuery = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: req.user.userId },
      name: { $regex: escapedQuery, $options: 'i' },
    })
      .select('name profilePicture followers following')
      .limit(limit)
      .sort({ name: 1 });

    const items = users.map((user) => toClientRelationshipUser(user, meFollowingIds));
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleFollowUser = async (req, res) => {
  try {
    const targetUserId = String(req.params.userId || '');
    const meUserId = String(req.user.userId || '');

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user is required.' });
    }

    if (targetUserId === meUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const [me, target] = await Promise.all([
      User.findById(meUserId).select('following followers'),
      User.findById(targetUserId).select('name profilePicture followers following'),
    ]);

    if (!me || !target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFollowing = (me.following || []).some((id) => String(id) === targetUserId);

    if (alreadyFollowing) {
      me.following = (me.following || []).filter((id) => String(id) !== targetUserId);
      target.followers = (target.followers || []).filter((id) => String(id) !== meUserId);
    } else {
      me.following = [...(me.following || []), target._id];
      target.followers = [...(target.followers || []), me._id];
    }

    await Promise.all([me.save(), target.save()]);

    const meFollowingIds = new Set((me.following || []).map((id) => String(id)));

    res.json({
      isFollowing: !alreadyFollowing,
      targetUser: toClientRelationshipUser(target, meFollowingIds),
      me: {
        followerCount: Array.isArray(me.followers) ? me.followers.length : 0,
        followingCount: Array.isArray(me.following) ? me.following.length : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyFriends = async (req, res) => {
  try {
    const me = await User.findById(req.user.userId)
      .select('followers following')
      .populate({
        path: 'followers',
        select: 'name profilePicture followers following',
        options: { sort: { name: 1 } },
      })
      .populate({
        path: 'following',
        select: 'name profilePicture followers following',
        options: { sort: { name: 1 } },
      });

    if (!me) {
      return res.status(404).json({ message: 'User not found' });
    }

    const meFollowingIds = new Set((me.following || []).map((user) => String(user._id || user)));

    res.json({
      counts: {
        followers: Array.isArray(me.followers) ? me.followers.length : 0,
        following: Array.isArray(me.following) ? me.following.length : 0,
      },
      followers: (me.followers || []).map((user) => toClientRelationshipUser(user, meFollowingIds)),
      following: (me.following || []).map((user) => toClientRelationshipUser(user, meFollowingIds)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
