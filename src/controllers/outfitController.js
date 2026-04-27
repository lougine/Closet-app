const mongoose = require("mongoose");
const Outfit = require("../models/outfit");
const Garment = require('../models/garment');
const User = require('../models/user');
const Usage = require('../models/usage');
const CommunityPost = require('../models/communityPost');
const { createImageUpload } = require('../middleware/imageUploadMiddleware');
const { deleteImageByUrl } = require('../utils/imageFileUtils');
const { buildImageMetadata } = require('../utils/imageMetadata');
const { generateScoredOutfits } = require('../services/aiRecommendationService');
const { generateStyleChatReply } = require('../services/styleChatService');

const DEFAULT_RANDOMIZE_COUNT = 4;
const MAX_STYLING_COUNT = 8;
const DEFAULT_OUTFIT_PAGE_SIZE = 25;
const MAX_OUTFIT_PAGE_SIZE = 100;

const toObjectIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const getOutfitAudienceUserId = (source) => toObjectIdString(
  source?.styledForUserId ?? source?.recipientUserId ?? source?.targetUserId ?? source?.forUserId,
);

const isSelfStyledOutfit = (source) => {
  const ownerId = toObjectIdString(source?.owner);
  const creatorId = toObjectIdString(source?.createdBy);
  const audienceUserId = getOutfitAudienceUserId(source);
  if (!ownerId || !creatorId || ownerId !== creatorId) return false;
  if (!audienceUserId) return true;
  return audienceUserId === ownerId;
};

const buildOutfitCommunityCaption = (source) => {
  const outfitName = String(source?.name || '').trim();
  return outfitName ? `Styled ${outfitName}` : 'Styled a fit';
};

const upsertSelfStyledOutfitCommunityPost = async (source) => {
  if (!isSelfStyledOutfit(source)) return;

  const outfitId = source?._id;
  const authorId = source?.owner;
  if (!outfitId || !authorId) return;

  await CommunityPost.findOneAndUpdate(
    { sourceOutfitId: outfitId },
    {
      $set: {
        author: authorId,
        type: 'post',
        sourceType: 'outfit',
        sourceOutfitId: outfitId,
        caption: buildOutfitCommunityCaption(source),
        imageUrl: source?.previewImage || null,
        poll: { question: null, options: [], endsAt: null },
      },
      $setOnInsert: {
        tags: ['fit', 'styled-fit'],
      },
    },
    { upsert: true, new: true },
  );
};

const isVisibleToUser = (source, userId) => {
  const audienceUserId = getOutfitAudienceUserId(source);
  if (!audienceUserId) return true;
  return audienceUserId === String(userId);
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeStyledLayout = (rawLayout) => {
  if (!rawLayout || typeof rawLayout !== 'object') return null;

  const rawPositions = rawLayout.dragPositions && typeof rawLayout.dragPositions === 'object'
    ? rawLayout.dragPositions
    : {};
  const rawScales = rawLayout.itemScales && typeof rawLayout.itemScales === 'object'
    ? rawLayout.itemScales
    : {};
  const rawOrder = Array.isArray(rawLayout.itemOrder) ? rawLayout.itemOrder : [];
  const rawCanvasSize = rawLayout.canvasSize && typeof rawLayout.canvasSize === 'object'
    ? rawLayout.canvasSize
    : {};

  const dragPositions = Object.fromEntries(
    Object.entries(rawPositions)
      .filter(([id]) => Boolean(String(id || '').trim()))
      .map(([id, point]) => {
        const normalizedId = String(id).trim();
        const x = toFiniteNumber(point?.x, 0);
        const y = toFiniteNumber(point?.y, 0);
        return [normalizedId, { x, y }];
      }),
  );

  const itemScales = Object.fromEntries(
    Object.entries(rawScales)
      .filter(([id]) => Boolean(String(id || '').trim()))
      .map(([id, scale]) => {
        const normalizedId = String(id).trim();
        const normalizedScale = Math.max(0.1, Math.min(10, toFiniteNumber(scale, 1)));
        return [normalizedId, normalizedScale];
      }),
  );

  const itemOrder = rawOrder
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  const canvasSize = {
    width: Math.max(1, toFiniteNumber(rawCanvasSize?.width, 1)),
    height: Math.max(1, toFiniteNumber(rawCanvasSize?.height, 1)),
  };

  return {
    dragPositions,
    itemScales,
    itemOrder,
    canvasSize,
  };
};

const toUtcDayRange = (dateValue) => {
  const parsed = new Date(dateValue);
  const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const mapOutfitForCalendar = (outfitDoc) => {
  const source = typeof outfitDoc.toObject === 'function'
    ? outfitDoc.toObject()
    : outfitDoc;

  const garments = Array.isArray(source.garments) ? source.garments : [];
  const garmentIds = garments.map((garment) => toObjectIdString(garment)).filter(Boolean);
  const previewGarment = garments.find((garment) => garment && garment.imageUrl);

  return {
    ...source,
    userId: toObjectIdString(source.owner),
    garmentIds,
    previewImage: source.previewImage || previewGarment?.imageUrl || '',
  };
};

const parseCount = (value, fallback = DEFAULT_RANDOMIZE_COUNT) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_STYLING_COUNT) {
    return null;
  }
  return parsed;
};

const parsePagination = (query = {}) => {
  const pageValue = Number(query.page);
  const limitValue = Number(query.limit);

  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const parsedLimit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : DEFAULT_OUTFIT_PAGE_SIZE;
  const limit = Math.min(parsedLimit, MAX_OUTFIT_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const categoryType = (category = '') => {
  const normalized = String(category).toLowerCase();
  if (/(top|shirt|blouse|tee|sweater|hoodie)/i.test(normalized)) return 'top';
  if (/(bottom|pant|jean|skirt|short)/i.test(normalized)) return 'bottom';
  if (/(footwear|shoe|sneaker|boot|sandal|heel)/i.test(normalized)) return 'footwear';
  return 'other';
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const shuffled = (items) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const buildBalancedOutfit = (garments, requestedCount) => {
  const tops = garments.filter((g) => categoryType(g.category) === 'top');
  const bottoms = garments.filter((g) => categoryType(g.category) === 'bottom');
  const footwear = garments.filter((g) => categoryType(g.category) === 'footwear');

  const chosen = [];
  if (tops.length > 0) chosen.push(pickRandom(tops));
  if (bottoms.length > 0) chosen.push(pickRandom(bottoms));
  if (footwear.length > 0) chosen.push(pickRandom(footwear));

  const chosenIds = new Set(chosen.map((g) => g._id.toString()));
  const remaining = shuffled(garments).filter((g) => !chosenIds.has(g._id.toString()));

  for (const garment of remaining) {
    if (chosen.length >= requestedCount) break;
    chosen.push(garment);
  }

  return chosen.slice(0, requestedCount);
};

const deriveSeasonPreference = (temperatureC) => {
  if (typeof temperatureC !== 'number' || Number.isNaN(temperatureC)) return [];
  if (temperatureC <= 10) return ['winter', 'fall'];
  if (temperatureC <= 20) return ['spring', 'fall'];
  return ['summer', 'spring'];
};

const isNeutralColour = (colour = '') => /black|white|gray|grey|beige|navy|brown/i.test(colour);

const scoreGarment = (garment, context) => {
  const reasons = [];
  let score = 0;

  if (context.seasons.length > 0 && garment.season && context.seasons.includes(String(garment.season).toLowerCase())) {
    score += 3;
    reasons.push('matches weather season');
  }

  if (context.isFormalEvent && isNeutralColour(garment.color || '')) {
    score += 2;
    reasons.push('formal-friendly colour');
  }

  if (!context.isFormalEvent && /(red|yellow|pink|green|orange|purple|blue)/i.test(garment.color || '')) {
    score += 1;
    reasons.push('works for casual/pop style');
  }

  if (categoryType(garment.category) !== 'other') {
    score += 1;
  }

  return { score, reasons };
};

const mapGarment = (garment) => ({
  _id: garment._id,
  name: garment.name,
  category: garment.category,
  color: garment.color,
  season: garment.season,
  imageUrl: garment.imageUrl,
});

const buildRecommendationResponse = (event, temperatureC, garments, count = 3) => {
  const currentSeason = deriveSeasonPreference(temperatureC)[0] || 'mild';
  const recommendationContext = {
    currentSeason,
    favoriteColors: [],
    dislikedItemNames: [],
    likedItemNames: [],
  };

  const aiOutfits = generateScoredOutfits(garments, recommendationContext, count);

  const recommendations = aiOutfits.map((outfit, index) => ({
    name: `${event ? `${event} ` : ''}Look ${index + 1}`.trim(),
    score: outfit.score,
    reason: outfit.reason || 'AI selected based on style and color harmony.',
    garments: outfit.garments.filter(Boolean).map(mapGarment),
  }));

  return {
    recommendations,
    context: {
      event,
      temperatureC,
      interpretedSeasons: deriveSeasonPreference(temperatureC),
      formalEventDetected: /wedding|formal|office|meeting|business|interview|ceremony/i.test(event),
    },
  };
};

exports.uploadCoverImage = createImageUpload('coverImage');

const getUploadedImageUrl = (file) => {
  return file?.storage?.secureUrl || file?.storage?.managedUrl || null;
};

const cleanupReplacedPreviewImage = async (owner, previousPreviewImage, nextPreviewImage, options = {}) => {
  if (!previousPreviewImage || previousPreviewImage === nextPreviewImage) return;

  const { excludeOutfitId } = options;
  const outfitReferenceFilter = {
    owner,
    previewImage: previousPreviewImage,
  };

  if (excludeOutfitId) {
    outfitReferenceFilter._id = { $ne: excludeOutfitId };
  }

  const [isGarmentImage, isUserProfileImage, isStillUsedByOutfit] = await Promise.all([
    Garment.exists({ owner, imageUrl: previousPreviewImage }),
    User.exists({
      _id: owner,
      $or: [{ profilePicture: previousPreviewImage }, { bannerImage: previousPreviewImage }],
    }),
    Outfit.exists(outfitReferenceFilter),
  ]);

  // Only delete files that are not referenced by garments/profile images/other outfits.
  if (!isGarmentImage && !isUserProfileImage && !isStillUsedByOutfit) {
    await deleteImageByUrl(previousPreviewImage);
  }
};

exports.createOutfit = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const styledForUserId = String(req.body.styledForUserId || req.body.recipientUserId || req.body.targetUserId || req.body.forUserId || '').trim();
    const styledLayout = sanitizeStyledLayout(req.body.styledLayout);
    const garments = Array.isArray(req.body.garments) ? req.body.garments : [];
    let defaultPreviewImage = '';

    let owner = creatorId;
    if (styledForUserId && styledForUserId !== creatorId) {
      const styledForUser = await User.findById(styledForUserId).select('_id');
      if (!styledForUser) {
        return res.status(400).json({ message: 'Styled-for user not found' });
      }

      owner = styledForUserId;
    }

    let validOwner = creatorId;
    try {
      validOwner = new mongoose.Types.ObjectId(creatorId);
    } catch (e) {
      return res.status(500).json({ message: 'Invalid user ID' });
    }

    const garmentIds = garments.filter((g) => {
      try {
        new mongoose.Types.ObjectId(g);
        return true;
      } catch (e) {
        return false;
      }
    });

    let ownerObj;
    try {
      ownerObj = new mongoose.Types.ObjectId(owner);
    } catch (e) {
      ownerObj = validOwner;
    }

    if (garments.length > 0) {
      if (garmentIds.length !== garments.length) {
        return res.status(400).json({ message: 'One or more garment IDs are invalid' });
      }

      const ownedGarments = await Garment.find({
        _id: { $in: garmentIds },
        owner: ownerObj,
      }).select('_id imageUrl');

      if (ownedGarments.length !== garmentIds.length) {
        return res.status(400).json({ message: 'One or more garments are invalid for this user' });
      }

      defaultPreviewImage = ownedGarments.find((garment) => garment.imageUrl)?.imageUrl || '';
    }

    const outfit = new Outfit({
      ...req.body,
      previewImage: req.body.previewImage || defaultPreviewImage,
      owner: ownerObj,
      createdBy: validOwner,
      styledForUserId: styledForUserId || null,
      styledLayout,
    });

    await outfit.save();
    await upsertSelfStyledOutfitCommunityPost(outfit);

    res.status(201).json(outfit);

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getOutfits = async (req, res) => {
  try {
    const { skip, limit } = parsePagination(req.query);

    const outfits = await Outfit.find({
      owner: req.user.userId
    })
      .populate('garments', '_id imageUrl name category color season')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(outfits
      .filter((outfit) => isVisibleToUser(outfit, req.user.userId))
      .map(mapOutfitForCalendar));

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getOutfitsByDate = async (req, res) => {
  try {
    const { skip, limit } = parsePagination(req.query);

    const { start, end } = toUtcDayRange(req.params.date);

    const outfits = await Outfit.find({
      owner: req.user.userId,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .populate('garments', '_id imageUrl name category color season')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(outfits
      .filter((outfit) => isVisibleToUser(outfit, req.user.userId))
      .map(mapOutfitForCalendar));

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateOutfit = async (req, res) => {
  try {
    const owner = req.user.userId;
    const hasGarmentsUpdate = Object.prototype.hasOwnProperty.call(req.body || {}, 'garments');

    if (hasGarmentsUpdate && !Array.isArray(req.body.garments)) {
      return res.status(400).json({ message: 'garments must be an array of garment ids' });
    }

    const nextGarments = hasGarmentsUpdate ? req.body.garments : [];
    if (hasGarmentsUpdate && nextGarments.length > 0) {
      const ownedGarments = await Garment.find({
        _id: { $in: nextGarments },
        owner,
      }).select('_id');

      if (ownedGarments.length !== nextGarments.length) {
        return res.status(400).json({ message: 'One or more garments are invalid for this user' });
      }
    }

    const outfit = await Outfit.findOne({
      _id: req.params.id,
      owner,
    });

    if (!outfit) {
      if (req.file) {
        await deleteImageByUrl(getUploadedImageUrl(req.file));
      }
      return res.status(404).json({ message: 'Outfit not found' });
    }

    const oldPreviewImage = outfit.previewImage;

    Object.assign(outfit, req.body);
    if (req.file) {
      outfit.previewImage = getUploadedImageUrl(req.file);
      if (!outfit.previewImage) {
        return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
      }
      outfit.previewImageMetadata = buildImageMetadata(req.file, outfit.previewImage);
    } else if (Object.prototype.hasOwnProperty.call(req.body || {}, 'previewImage') && !req.body.previewImage) {
      outfit.previewImageMetadata = null;
    }
    await outfit.save();
    await upsertSelfStyledOutfitCommunityPost(outfit);

    if (req.file) {
      await cleanupReplacedPreviewImage(owner, oldPreviewImage, outfit.previewImage, { excludeOutfitId: outfit._id });
    }

    const populated = await Outfit.findById(outfit._id)
      .populate('garments', '_id imageUrl name category color season');

    return res.json(mapOutfitForCalendar(populated));
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateOutfitCover = async (req, res) => {
  try {
    const owner = req.user.userId;

    const outfit = await Outfit.findOne({
      _id: req.params.id,
      owner,
    });

    if (!outfit) {
      if (req.file) {
        await deleteImageByUrl(getUploadedImageUrl(req.file));
      }
      return res.status(404).json({ message: 'Outfit not found' });
    }

    const previousPreviewImage = outfit.previewImage;

    if (req.file) {
      outfit.previewImage = getUploadedImageUrl(req.file);
      if (!outfit.previewImage) {
        return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
      }
      outfit.previewImageMetadata = buildImageMetadata(req.file, outfit.previewImage);
    } else if (Object.prototype.hasOwnProperty.call(req.body || {}, 'previewImage')) {
      outfit.previewImage = req.body.previewImage || '';
      if (!outfit.previewImage) {
        outfit.previewImageMetadata = null;
      }
    }

    await outfit.save();
    await upsertSelfStyledOutfitCommunityPost(outfit);

    if (req.file) {
      await cleanupReplacedPreviewImage(owner, previousPreviewImage, outfit.previewImage, { excludeOutfitId: outfit._id });
    }

    const populated = await Outfit.findById(outfit._id)
      .populate('garments', '_id imageUrl name category color season');

    return res.json(mapOutfitForCalendar(populated));
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteOutfit = async (req, res) => {
  try {

    const deletedOutfit = await Outfit.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!deletedOutfit) {
      return res.status(404).json({ message: 'Outfit not found' });
    }

    await Usage.deleteMany({
      user: req.user.userId,
      outfit: req.params.id,
    });

    await CommunityPost.deleteMany({
      sourceOutfitId: deletedOutfit._id,
    });

    if (deletedOutfit.previewImage) {
      await cleanupReplacedPreviewImage(req.user.userId, deletedOutfit.previewImage, '', {
        excludeOutfitId: deletedOutfit._id,
      });
    }

    res.json({ message: "Outfit deleted" });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getRandomizedOutfit = async (req, res) => {
  try {
    const count = parseCount(req.query.count);
    if (count === null) {
      return res.status(400).json({ message: `count must be an integer between 1 and ${MAX_STYLING_COUNT}` });
    }

    const garments = await Garment.find({ owner: req.user.userId }).lean();
    if (garments.length === 0) {
      return res.json({
        items: [],
        meta: {
          requestedCount: count,
          returnedCount: 0,
          mode: 'randomized',
        },
      });
    }

    const items = buildBalancedOutfit(garments, Math.min(count, garments.length));
    return res.json({
      items: items.map(mapGarment),
      meta: {
        requestedCount: count,
        returnedCount: items.length,
        mode: 'randomized',
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAiRecommendations = async (req, res) => {
  try {
    const count = parseCount(req.body.count, 3);
    if (count === null) {
      return res.status(400).json({ message: `count must be an integer between 1 and ${MAX_STYLING_COUNT}` });
    }

    const event = String(req.body.event || '').trim();
    const temperatureValue = req.body.temperatureC;
    const parsedTemperature = temperatureValue === undefined || temperatureValue === null || temperatureValue === ''
      ? null
      : Number(temperatureValue);

    if (parsedTemperature !== null && Number.isNaN(parsedTemperature)) {
      return res.status(400).json({ message: 'temperatureC must be a valid number' });
    }

    const garments = await Garment.find({ owner: req.user.userId }).lean();
    if (garments.length === 0) {
      return res.json({ recommendations: [], context: { event, temperatureC: parsedTemperature } });
    }

    return res.json(buildRecommendationResponse(event, parsedTemperature, garments, count));
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStyleChatResponse = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'message is required' });
    }

    const event = String(req.body.event || '').trim();
    const temperatureValue = req.body.temperatureC;
    const parsedTemperature = temperatureValue === undefined || temperatureValue === null || temperatureValue === ''
      ? null
      : Number(temperatureValue);

    if (parsedTemperature !== null && Number.isNaN(parsedTemperature)) {
      return res.status(400).json({ message: 'temperatureC must be a valid number' });
    }

    const garments = await Garment.find({ owner: req.user.userId }).lean();
    const count = parseCount(req.body.count, 3) || 3;
    const recommendationPayload = garments.length > 0
      ? buildRecommendationResponse(event || message, parsedTemperature, garments, count)
      : { recommendations: [], context: { event, temperatureC: parsedTemperature } };

    const { reply, matchedIds } = await generateStyleChatReply({
      message,
      event,
      temperatureC: parsedTemperature,
      garments,
      conversation: Array.isArray(req.body.messages) ? req.body.messages : [],
      recommendations: recommendationPayload.recommendations,
    });

    if (matchedIds && matchedIds.length > 0) {
      const aiGarments = garments
        .filter(g => matchedIds.includes(String(g._id)))
        .map(g => ({
          _id: g._id,
          name: g.name,
          category: g.category,
          imageUrl: g.imageUrl,
          color: g.color || '',
          season: g.season || '',
        }));

      if (aiGarments.length > 0) {
        recommendationPayload.recommendations.unshift({
          name: 'Chatbot Suggestion',
          score: 1.0,
          reason: 'Matches the exact items recommended in the chat.',
          garments: aiGarments,
        });
      }
    }

    return res.json({
      reply,
      ...recommendationPayload,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};



