const mongoose = require('mongoose');

const CommunityComment = require('../models/communityComment');
const CommunityPost = require('../models/communityPost');
const Outfit = require('../models/outfit');

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
  return name ? `Styled ${name}` : 'Styled a fit';
};

const shouldRunSelfStyledBackfill = () => {
  const now = Date.now();
  // Keep feed fast: perform this safety backfill at most once every 60 seconds.
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

  const outfitIds = outfits.map((outfit) => outfit._id);
  const existing = await CommunityPost.find({
    sourceOutfitId: { $in: outfitIds },
  })
    .select('sourceOutfitId')
    .lean();

  const existingIds = new Set(existing.map((entry) => String(entry.sourceOutfitId)));
  const missingOutfits = outfits.filter((outfit) => !existingIds.has(String(outfit._id)));

  if (!missingOutfits.length) return;

  await CommunityPost.insertMany(
    missingOutfits.map((outfit) => ({
      author: outfit.owner,
      type: 'post',
      sourceType: 'outfit',
      sourceOutfitId: outfit._id,
      caption: buildOutfitCaption(outfit),
      imageUrl: outfit.previewImage || null,
      tags: ['fit', 'styled-fit'],
      poll: { question: null, options: [], endsAt: null },
    })),
    { ordered: false }
  ).catch(() => {
    // Ignore duplicate races from parallel requests; unique index enforces consistency.
  });
};

const serializePost = (postDoc, userId) => {
  const post = postDoc.toObject();
  const likedByMe = post.likes.some((likeUserId) => String(likeUserId) === String(userId));

  const poll = post.type === 'poll'
    ? {
      question: post.poll?.question || '',
      endsAt: post.poll?.endsAt || null,
      options: (post.poll?.options || []).map((option, idx) => ({
        index: idx,
        text: option.text,
        votes: option.votes.length,
        votedByMe: option.votes.some((voteUserId) => String(voteUserId) === String(userId)),
      })),
    }
    : null;

  return {
    _id: post._id,
    type: post.type,
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
    likeCount: post.likes.length,
    likedByMe,
    commentsCount: post.commentsCount || 0,
    poll,
  };
};

exports.getFeed = async (req, res) => {
  try {
    await backfillMissingSelfStyledOutfitPosts();

    const userId = req.user.userId;
    const filter = String(req.query.filter || 'for-you').toLowerCase();
    const search = String(req.query.search || '').trim().slice(0, 80);

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 50);
    const skip = (page - 1) * limit;

    const query = {};
    if (filter === 'polls') {
      query.type = 'poll';
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

    res.json({
      filter,
      items: posts.map((post) => serializePost(post, userId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const authorId = req.user.userId;
    const {
      type = 'post',
      caption = '',
      imageUrl = null,
      tags = [],
      poll,
    } = req.body;

    if (type !== 'post' && type !== 'poll') {
      return res.status(400).json({ message: 'type must be post or poll' });
    }

    if (!String(caption || '').trim() && !imageUrl && type !== 'poll') {
      return res.status(400).json({ message: 'caption or imageUrl is required' });
    }

    let normalizedPoll = {
      question: null,
      options: [],
      endsAt: null,
    };

    if (type === 'poll') {
      const question = String(poll?.question || '').trim();
      const options = Array.isArray(poll?.options)
        ? poll.options.map((option) => String(option || '').trim()).filter(Boolean)
        : [];

      if (!question || options.length < 2) {
        return res.status(400).json({ message: 'poll requires a question and at least 2 options' });
      }

      normalizedPoll = {
        question,
        options: options.slice(0, 6).map((text) => ({ text, votes: [] })),
        endsAt: poll?.endsAt ? new Date(poll.endsAt) : null,
      };
    }

    const created = await CommunityPost.create({
      author: authorId,
      type,
      caption: String(caption || '').trim(),
      imageUrl: imageUrl || null,
      tags: Array.isArray(tags) ? tags.map((entry) => String(entry).trim()).filter(Boolean) : [],
      poll: normalizedPoll,
    });

    const post = await CommunityPost.findById(created._id).populate('author', 'name profilePicture');

    res.status(201).json(serializePost(post, authorId));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyLiked = post.likes.some((likeUserId) => String(likeUserId) === userId);

    const updated = await CommunityPost.findByIdAndUpdate(
      postId,
      alreadyLiked
        ? { $pull: { likes: userObjectId } }
        : { $addToSet: { likes: userObjectId } },
      { returnDocument: 'after' }
    ).populate('author', 'name profilePicture');

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
    if (!postExists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const [comments, total] = await Promise.all([
      CommunityComment.find({ post: postId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name profilePicture'),
      CommunityComment.countDocuments({ post: postId }),
    ]);

    res.json({
      items: comments.map((comment) => ({
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        author: comment.author,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    if (!text) {
      return res.status(400).json({ message: 'text is required' });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await CommunityComment.create({
      post: postId,
      author: userId,
      text,
    });

    await CommunityPost.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }, { returnDocument: 'after' });

    const hydrated = await CommunityComment.findById(comment._id).populate('author', 'name profilePicture');

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

exports.voteOnPoll = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const optionIndex = Number(req.body.optionIndex);

    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      return res.status(400).json({ message: 'optionIndex must be a non-negative integer' });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.type !== 'poll') {
      return res.status(400).json({ message: 'Post is not a poll' });
    }

    if (!post.poll || !Array.isArray(post.poll.options) || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    post.poll.options = post.poll.options.map((option, idx) => {
      if (idx === optionIndex) {
        const alreadyVotedThisOption = option.votes.some((voteUserId) => String(voteUserId) === userId);
        if (!alreadyVotedThisOption) {
          return {
            ...option.toObject(),
            votes: [...option.votes, userObjectId],
          };
        }
        return option;
      }

      return {
        ...option.toObject(),
        votes: option.votes.filter((voteUserId) => String(voteUserId) !== userId),
      };
    });

    await post.save();
    const hydrated = await CommunityPost.findById(post._id).populate('author', 'name profilePicture');

    res.json(serializePost(hydrated, userId));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

