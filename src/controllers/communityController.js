const mongoose = require('mongoose');

const CommunityComment = require('../models/communityComment');
const CommunityPost = require('../models/communityPost');
const Notification = require('../models/notification');
const Outfit = require('../models/outfit');
const User = require('../models/user');

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

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SELF_STYLED_BACKFILL_BATCH_SIZE = 500;
let lastSelfStyledBackfillAt = 0;

const buildOutfitCaption = (outfit) => {
  const name = String(outfit?.name || '').trim();
  return name && name.toLowerCase() !== 'create outfit' ? name : '';
};

const shouldRunSelfStyledBackfill = () => {
  const now = Date.now();
  if (now - lastSelfStyledBackfillAt < 60000) return false;
  lastSelfStyledBackfillAt = now;
  return true;
};

const backfillMissingSelfStyledOutfitPosts = async () => {
  if (!shouldRunSelfStyledBackfill()) return;

  const outfits = await Outfit.find({
    $or: [
      { styledForUserId: null },
      { $expr: { $eq: ['$styledForUserId', '$owner'] } },
    ],
    $expr: { $eq: ['$owner', '$createdBy'] },
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(SELF_STYLED_BACKFILL_BATCH_SIZE)
    .select('_id owner name previewImage')
    .lean();

  if (!outfits.length) return;

  const outfitIds = outfits.map((o) => o._id);
  const existing = await CommunityPost.find({ sourceOutfitId: { $in: outfitIds } })
    .select('sourceOutfitId')
    .lean();

  const existingIds = new Set(existing.map((e) => String(e.sourceOutfitId)));
  const missing = outfits.filter((o) => !existingIds.has(String(o._id)));
  if (!missing.length) return;

  await CommunityPost.insertMany(
    missing.map((outfit) => ({
      author: outfit.owner,
      type: 'post',
      sourceType: 'outfit',
      sourceOutfitId: outfit._id,
      caption: buildOutfitCaption(outfit),
      imageUrl: outfit.previewImage || null,
      tags: ['outfit'],
    })),
    { ordered: false }
  ).catch(() => {});
};

const serializePost = (postDoc, userId, outfitMetaMap = new Map()) => {
  const post = postDoc.toObject ? postDoc.toObject() : postDoc;
  const likedByMe = (post.likes || []).some(
    (id) => String(id) === String(userId)
  );
  const sourceOutfitId = post.sourceOutfitId ? String(post.sourceOutfitId) : null;
  const outfitMeta = sourceOutfitId ? outfitMetaMap.get(sourceOutfitId) : null;

  return {
    _id: post._id,
    type: 'post',
    sourceType: post.sourceType || 'manual',
    sourceOutfitId,
    caption: post.caption,
    imageUrl: post.imageUrl,
    tags: post.tags,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      _id: post.author?._id,
      name: post.author?.name,
      profilePicture: post.author?.profilePicture || null,
    },
    likeCount: (post.likes || []).length,
    likedByMe,
    commentsCount: post.commentsCount || 0,
    styledForUser: outfitMeta?.styledForUser || null,
    styledByUser: outfitMeta?.styledByUser || null,
  };
};

exports.getFeed = async (req, res) => {
  try {
    await backfillMissingSelfStyledOutfitPosts();

    const userId = req.user.userId;
    const filter = String(req.query.filter || 'for-you').toLowerCase();
    const styledScope = String(req.query.styledScope || 'you').toLowerCase();
    const search = String(req.query.search || '').trim().slice(0, 80);

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 50);
    const skip = (page - 1) * limit;

    const query = {};

    if (filter === 'friends') {

      const currentUser = await User.findById(userId).select('following').lean();
      const followingIds = (currentUser?.following || []).map((id) => new mongoose.Types.ObjectId(String(id)));
      if (!followingIds.length) {

        return res.json({
          filter,
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      query.author = { $in: followingIds };
    } else if (filter === 'outfits') {

      query.sourceType = 'outfit';
      
      const selfOutfits = await Outfit.find({
        $expr: {
          $and: [
            { $eq: ['$owner', '$createdBy'] },
            {
              $or: [
                { $eq: ['$styledForUserId', null] },
                { $eq: ['$styledForUserId', '$owner'] },
              ],
            },
          ],
        },
      })
        .select('_id')
        .lean();
      const selfOutfitIds = selfOutfits.map((o) => o._id);
      query.sourceOutfitId = { $in: selfOutfitIds };
    } else if (filter === 'styled-for') {
  
      query.sourceType = 'outfit';
      let outfitCriteria = {
        styledForUserId: { $ne: null },
        $expr: {
          $and: [
            { $eq: ['$styledForUserId', '$owner'] },
            { $ne: ['$owner', '$createdBy'] },
          ],
        },
      };

      if (styledScope === 'you') {
        outfitCriteria = {
          ...outfitCriteria,
          owner: new mongoose.Types.ObjectId(String(userId)),
        };
      } else if (styledScope === 'by-you') {
        outfitCriteria = {
          ...outfitCriteria,
          createdBy: new mongoose.Types.ObjectId(String(userId)),
        };
      } else if (styledScope === 'friends') {
        const currentUser = await User.findById(userId).select('following').lean();
        const followingIds = (currentUser?.following || []).map(
          (id) => new mongoose.Types.ObjectId(String(id))
        );
        if (!followingIds.length) {
          return res.json({
            filter,
            styledScope,
            items: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
        outfitCriteria = {
          ...outfitCriteria,
          owner: { $in: followingIds },
        };
      }

      const styledForOutfits = await Outfit.find(outfitCriteria)
        .select('_id')
        .lean();
      const styledForOutfitIds = styledForOutfits.map((o) => o._id);
      query.sourceOutfitId = { $in: styledForOutfitIds };
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { caption: { $regex: safeSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(safeSearch, 'i')] } },
      ];
    }

    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name profilePicture'),
      CommunityPost.countDocuments(query),
    ]);

    const outfitIds = posts
      .map((post) => (post?.sourceOutfitId ? String(post.sourceOutfitId) : ''))
      .filter(Boolean);
    const uniqueOutfitIds = [...new Set(outfitIds)];
    const outfitMetaMap = new Map();
    if (uniqueOutfitIds.length) {
      const outfits = await Outfit.find({ _id: { $in: uniqueOutfitIds } })
        .select('_id owner createdBy styledForUserId')
        .populate('owner', 'name profilePicture')
        .populate('createdBy', 'name profilePicture')
        .populate('styledForUserId', 'name profilePicture')
        .lean();

      outfits.forEach((outfit) => {
        const owner = outfit?.owner || null;
        const createdBy = outfit?.createdBy || null;
        const styledForUserId = outfit?.styledForUserId || null;

        const styledForUser = owner || styledForUserId || null;
        const styledByUser = createdBy || null;

        outfitMetaMap.set(String(outfit._id), {
          styledForUser: styledForUser
            ? {
                _id: String(styledForUser._id || ''),
                name: String(styledForUser.name || 'User'),
                profilePicture: styledForUser.profilePicture || null,
              }
            : null,
          styledByUser: styledByUser
            ? {
                _id: String(styledByUser._id || ''),
                name: String(styledByUser.name || 'User'),
                profilePicture: styledByUser.profilePicture || null,
              }
            : null,
        });
      });
    }

    res.json({
      filter,
      ...(filter === 'styled-for' ? { styledScope } : {}),
      items: posts.map((post) => serializePost(post, userId, outfitMetaMap)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getFeed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const authorId = req.user.userId;
    const { caption = '', imageUrl = null, tags = [] } = req.body;

    if (!String(caption || '').trim() && !imageUrl) {
      return res.status(400).json({ message: 'caption or imageUrl is required' });
    }

    const created = await CommunityPost.create({
      author: authorId,
      type: 'post',
      caption: String(caption || '').trim(),
      imageUrl: imageUrl || null,
      tags: Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    });

    const post = await CommunityPost.findById(created._id).populate(
      'author',
      'name profilePicture'
    );

    try {
      const author = await User.findById(authorId).select('name followers').lean();
      if (author?.followers?.length) {
        const notifications = author.followers.map((followerId) => ({
          recipient: followerId,
          actor: authorId,
          type: 'new_post',
          message: `${author.name} added a new post`,
          communityPost: created._id,
        }));
        await Notification.insertMany(notifications, { ordered: false });
      }
    } catch (_) {
      // Non-critical — don't fail the request
    }

    res.status(201).json(serializePost(post, authorId));
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const alreadyLiked = post.likes.some((id) => String(id) === userId);

    const updated = await CommunityPost.findByIdAndUpdate(
      postId,
      alreadyLiked
        ? { $pull: { likes: userObjectId } }
        : { $addToSet: { likes: userObjectId } },
      { returnDocument: 'after' }
    ).populate('author', 'name profilePicture');

    // Notify post author when someone likes (not self-like)
    if (!alreadyLiked && String(post.author) !== userId) {
      try {
        const liker = await User.findById(userId).select('name').lean();
        await Notification.create({
          recipient: post.author,
          actor: userId,
          type: 'like',
          message: `${liker?.name || 'Someone'} liked your post`,
          communityPost: postId,
        });
      } catch (_) {}
    }

    res.json(serializePost(updated, userId));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const postId = req.params.postId;
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const postExists = await CommunityPost.exists({ _id: postId });
    if (!postExists) return res.status(404).json({ message: 'Post not found' });

    const [comments, total] = await Promise.all([
      CommunityComment.find({ post: postId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name profilePicture'),
      CommunityComment.countDocuments({ post: postId }),
    ]);

    res.json({
      items: comments.map((c) => ({
        _id: c._id,
        text: c.text,
        createdAt: c.createdAt,
        author: c.author,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.userId;
    const text = String(req.body.text || '').trim();

    if (!text) return res.status(400).json({ message: 'text is required' });

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await CommunityComment.create({ post: postId, author: userId, text });
    await CommunityPost.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    if (String(post.author) !== userId) {
      try {
        const commenter = await User.findById(userId).select('name').lean();
        await Notification.create({
          recipient: post.author,
          actor: userId,
          type: 'comment',
          message: `${commenter?.name || 'Someone'} commented on your post`,
          communityPost: postId,
        });
      } catch (_) {}
    }

    const hydrated = await CommunityComment.findById(comment._id).populate(
      'author',
      'name profilePicture'
    );

    res.status(201).json({
      _id: hydrated._id,
      text: hydrated.text,
      createdAt: hydrated.createdAt,
      author: hydrated.author,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseLimit(req.query.limit, 30, 50);
    const page = parsePage(req.query.page, 1);
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(userId)) {
      return res.json({
        items: [],
        unreadCount: 0,
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const recipientId = new mongoose.Types.ObjectId(String(userId));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name profilePicture')
        .lean(),
      Notification.countDocuments({ recipient: recipientId }),
      Notification.countDocuments({ recipient: recipientId, readAt: null }),
    ]);

    res.json({
      items: notifications.map((n) => ({
        _id: String(n._id),
        type: n.type,
        message: n.message,
        read: !!n.readAt,
        createdAt: n.createdAt,
        actor: n.actor
          ? {
              _id: String(n.actor._id),
              name: n.actor.name,
              profilePicture: n.actor.profilePicture || null,
            }
          : null,
        communityPost: n.communityPost ? String(n.communityPost) : null,
        outfit: n.outfit ? String(n.outfit) : null,
      })),
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany(
      { recipient: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
