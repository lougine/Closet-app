// @ts-ignore
const User = require('../models/user');
// @ts-ignore
const bcrypt = require('bcryptjs');
const { createImageUpload } = require('../middleware/imageUploadMiddleware');
const { deleteImageByUrl } = require('../utils/imageFileUtils');
const { buildImageMetadata } = require('../utils/imageMetadata');
const Garment = require('../models/garment');
const CommunityPost = require('../models/communityPost');
const Outfit = require('../models/outfit');
const Notification = require('../models/notification');

exports.uploadProfileImage = createImageUpload('profileImage');
exports.uploadBannerImage = createImageUpload('bannerImage');

const getUploadedImageUrl = (file) => {
  return file?.storage?.secureUrl || file?.storage?.managedUrl || null;
};

const toIdString = (value) => String(value);

const parseLimit = (value, fallback = 20, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const parsePage = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const toClientRelationshipUser = (userDoc, meFollowingIds = new Set()) => {
  const payload = userDoc.toObject ? userDoc.toObject() : userDoc;
  const userId = toIdString(payload._id);
  const followerCount = Array.isArray(payload.followers) ? payload.followers.length : 0;
  const followingCount = Array.isArray(payload.following) ? payload.following.length : 0;

  return {
    _id: userId,
    name: payload.name,
    username: payload.username || payload.name,
    profilePicture: payload.profilePicture || null,
    followerCount,
    followingCount,
    isFollowing: meFollowingIds.has(userId),
  };
};

const toClientUser = (userDoc) => {
  const payload = userDoc.toObject();
  payload.username = payload.username || payload.name;
  payload.followerCount = Array.isArray(payload.followers) ? payload.followers.length : 0;
  payload.followingCount = Array.isArray(payload.following) ? payload.following.length : 0;
  return payload;
};

const normalizeSearchText = (value) => String(value || '')
  .trim()
  .replace(/^@+/, '')
  .slice(0, 64);

const getNotificationSettings = (payload = {}) => ({
  dailyOutfitReminder: Boolean(payload.dailyOutfitReminder ?? true),
  outfitPlanning: Boolean(payload.outfitPlanning ?? false),
  weeklyRecap: Boolean(payload.weeklyRecap ?? true),
  streakAlerts: Boolean(payload.streakAlerts ?? true),
  newFeatures: Boolean(payload.newFeatures ?? false),
  styledOutfitShares: Boolean(payload.styledOutfitShares ?? true),
});

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(toClientUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = String(req.user.userId || '');

    const [user, notifications] = await Promise.all([
      User.findById(userId).select('preferences.notifications'),
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(50)
        .populate('actor', 'name username profilePicture')
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const settings = getNotificationSettings(user?.preferences?.notifications || {});

    res.json({
      ...settings,
      notifications: notifications.map((notification) => ({
        _id: String(notification._id),
        type: notification.type,
        message: notification.message,
        outfitId: notification.outfit ? String(notification.outfit) : null,
        communityPostId: notification.communityPost ? String(notification.communityPost) : null,
        actor: notification.actor
          ? {
            _id: String(notification.actor._id),
            name: notification.actor.name,
            username: notification.actor.username || notification.actor.name,
            profilePicture: notification.actor.profilePicture || null,
          }
          : null,
        metadata: notification.metadata || {},
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.preferences = user.preferences || {};
    const existing = getNotificationSettings(user.preferences.notifications || {});
    user.preferences.notifications = getNotificationSettings({
      ...existing,
      ...req.body,
    });
    await user.save();

    res.json(user.preferences.notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const queryText = normalizeSearchText(req.query.q || req.query.search || '');
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
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { username: { $regex: escapedQuery, $options: 'i' } },
      ],
    })
      .select('name username profilePicture followers following')
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

exports.getPublicProfile = async (req, res) => {
  try {
    const targetUserId = String(req.params.userId || '');
    const meUserId = String(req.user.userId || '');

    const [me, target] = await Promise.all([
      User.findById(meUserId).select('following'),
      User.findById(targetUserId).select('name username bio closetGoal profilePicture bannerImage followers following createdAt'),
    ]);

    if (!me || !target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const meFollowingIds = new Set((me.following || []).map((id) => String(id)));

    res.json({
      _id: String(target._id),
      name: target.name,
      username: target.username || target.name,
      bio: target.bio || target.closetGoal || '',
      profilePicture: target.profilePicture || null,
      bannerImage: target.bannerImage || null,
      followerCount: Array.isArray(target.followers) ? target.followers.length : 0,
      followingCount: Array.isArray(target.following) ? target.following.length : 0,
      isFollowing: meFollowingIds.has(String(target._id)),
      isMe: String(target._id) === meUserId,
      joinedAt: target.createdAt || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPublicUserGarments = async (req, res) => {
  try {
    const targetUserId = String(req.params.userId || '');
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 24, 60);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Garment.find({ owner: targetUserId, isHidden: { $ne: true } })
        .select('_id name category color season imageUrl createdAt')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Garment.countDocuments({ owner: targetUserId, isHidden: { $ne: true } }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPublicUserPosts = async (req, res) => {
  try {
    const targetUserId = String(req.params.userId || '');
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 12, 40);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      CommunityPost.find({ author: targetUserId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments({ author: targetUserId }),
    ]);

    res.json({
      items: posts.map((post) => ({
        _id: post._id,
        type: post.type,
        caption: post.caption,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentsCount: Number(post.commentsCount || 0),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStyledOutfitForUser = async (req, res) => {
  try {
    const stylistUserId = String(req.user.userId || '');
    const targetUserId = String(req.params.userId || '');
    const garmentIds = Array.isArray(req.body.garments)
      ? req.body.garments.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];
    const name = String(req.body.name || '').trim();
    const styleNote = String(req.body.styleNote || '').trim().slice(0, 280);
    const shareWithProfileOwner = Boolean(req.body.shareWithProfileOwner);

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    if (garmentIds.length < 2) {
      return res.status(400).json({ message: 'Select at least 2 garments' });
    }

    const [targetUser, garments] = await Promise.all([
      User.findById(targetUserId).select('name'),
      Garment.find({
        _id: { $in: garmentIds },
        owner: targetUserId,
        isHidden: { $ne: true },
      }).select('_id imageUrl'),
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (garments.length !== garmentIds.length) {
      return res.status(400).json({ message: 'One or more garments are invalid for this user' });
    }

    const previewImage = garments.find((garment) => garment.imageUrl)?.imageUrl || '';

    const outfit = await Outfit.create({
      name,
      garments: garments.map((garment) => garment._id),
      previewImage,
      owner: stylistUserId,
      styledFor: targetUserId,
      styleNote,
      isSharedWithStyledUser: shareWithProfileOwner,
    });

    let sharedPostId = null;
    if (shareWithProfileOwner) {
      const sharedPost = await CommunityPost.create({
        author: stylistUserId,
        type: 'post',
        caption: `Styled an outfit for @${targetUser.name}: ${name}${styleNote ? ` - ${styleNote}` : ''}`,
        imageUrl: previewImage || null,
        tags: [`styled-for:${targetUserId}`],
      });
      sharedPostId = sharedPost._id;

      await Notification.create({
        recipient: targetUserId,
        actor: stylistUserId,
        type: 'styled_outfit_shared',
        message: `@${targetUser.name}, a new styled outfit was created for you: ${name}`,
        outfit: outfit._id,
        communityPost: sharedPost._id,
        metadata: {
          stylistUserId,
          targetUserId,
          outfitName: name,
        },
      });
    }

    res.status(201).json({
      _id: outfit._id,
      name: outfit.name,
      styledFor: outfit.styledFor,
      garments: outfit.garments,
      styleNote: outfit.styleNote,
      isSharedWithStyledUser: outfit.isSharedWithStyledUser,
      sharedPostId,
      previewImage: outfit.previewImage,
      createdAt: outfit.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
