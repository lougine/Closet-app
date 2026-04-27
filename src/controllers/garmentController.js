const mongoose = require('mongoose');
const fs = require('fs/promises');
const Groq = require('groq-sdk');
const Garment = require("../models/garment");
const Usage = require('../models/usage');
const { createImageUpload } = require("../middleware/imageUploadMiddleware");
const { deleteImageByUrl } = require("../utils/imageFileUtils");
const { buildImageMetadata } = require('../utils/imageMetadata');
const { fetchWithTimeout } = require('../utils/fetchWithTimeout');
const { validateOutboundImageUrl } = require('../utils/urlSafety');
const {
  ALLOWED_GARMENT_SUBCATEGORIES,
  ALLOWED_GARMENT_STYLE_TAGS,
  ALLOWED_GARMENT_SUBCATEGORY_SET,
  ALLOWED_GARMENT_STYLE_TAG_SET,
  ALLOWED_FABRIC_SET,
} = require('../constants/garmentTaxonomy');

const SERPER_IMAGE_SEARCH_URL = 'https://google.serper.dev/images';
const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_TOKEN || '';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || 'llama-3.2-11b-vision-preview';
const groqClient = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

const ALLOWED_GARMENT_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Footwear',
  'Accessories',
  'Bags',
  'Swimwear',
];

const CATEGORY_TO_SUBCATEGORIES = {
  Tops: ['t-shirt', 'blouse', 'crop top', 'tank top', 'shirt', 'hoodie', 'sweater', 'cardigan'],
  Bottoms: ['jeans', 'skirt', 'shorts', 'trousers', 'leggings', 'cargo pants', 'sweatpants'],
  Dresses: ['mini dress', 'bodycon'],
  Outerwear: ['jacket', 'blazer', 'coat', 'trench coat', 'puffer', 'leather jacket', 'denim jacket', 'vest'],
  Footwear: ['sneakers', 'heels', 'boots', 'sandals', 'platforms'],
  Accessories: ['bag', 'belt', 'hat', 'sunglasses', 'jewellery', 'scarf', 'watch'],
  Bags: ['handbag', 'tote', 'clutch', 'backpack', 'mini bag', 'shoulder bag'],
  Swimwear: ['one-piece', 'coverup', 'swim shorts'],
};

const SUBCATEGORY_TO_CATEGORY = Object.entries(CATEGORY_TO_SUBCATEGORIES).reduce((acc, [category, subcategories]) => {
  for (const subcategory of subcategories) {
    acc[subcategory] = category;
  }
  return acc;
}, {});

const ALLOWED_COLORS = [
  'Black', 'White', 'Grey', 'Brown', 'Beige', 'Red', 'Pink', 'Purple',
  'Blue', 'Navy', 'Green', 'Yellow', 'Orange', 'Gold', 'Mint', 'Cream',
];
const ALLOWED_COLOR_SET = new Set(ALLOWED_COLORS.map((value) => value.toLowerCase()));

const BLOCKED_IMAGE_HOST_TOKENS = [
  'pinterest',
  'pinimg',
  'facebook',
  'instagram',
  'tiktok',
  'x.com',
  'twitter',
  'reddit',
  'tumblr',
  'snapchat',
  'youtube',
  'temu',
  'aliexpress',
];

const PREFERRED_SOURCE_TOKENS = [
  'zara',
  'hm.com',
  'uniqlo',
  'asos',
  'mango',
  'farfetch',
  'shopify',
  'amazon',
  'walmart',
  'target',
  'nike',
  'adidas',
  'nordstrom',
  'gap',
  'forever21',
  'shein',
  'macys',
  'revolve',
  'mytheresa',
  'net-a-porter',
  'cdn',
  'ecommerce',
  'shop',
  'store',
  'product',
];

const RELEVANCE_TOKENS = [
  'product',
  'ecommerce',
  'white background',
  'isolated',
  'studio',
  'fashion',
  'catalog',
  'front view',
  'full length',
  'flat lay',
  'ghost mannequin',
  'packshot',
  'lookbook',
  'apparel',
];

exports.uploadImage = createImageUpload("image");

const getUploadedImageUrl = (file) => {
  return file?.storage?.secureUrl || file?.storage?.managedUrl || null;
};

const parseThirdPartyErrorMessage = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : null;
    if (typeof firstError?.title === 'string' && firstError.title.trim()) {
      return firstError.title;
    }
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch (error) {
    // Ignore parsing errors and use fallback message.
  }

  return fallbackMessage;
};

const normalizeToken = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const normalizeUniqueTagList = (rawTags) => {
  if (!Array.isArray(rawTags)) return [];

  const normalized = rawTags
    .map((tag) => normalizeToken(tag))
    .filter(Boolean);

  return [...new Set(normalized)];
};

const normalizeColor = (value) => {
  const normalized = normalizeToken(value);
  if (!normalized) return null;

  if (normalized.includes('gray')) return 'Grey';
  if (normalized.includes('grey')) return 'Grey';

  const canonical = ALLOWED_COLORS.find((color) => normalized.includes(color.toLowerCase()));
  return canonical || null;
};

const normalizeCategory = (value) => {
  const normalized = normalizeToken(value);
  if (!normalized) return null;

  const direct = ALLOWED_GARMENT_CATEGORIES.find((category) => category.toLowerCase() === normalized);
  if (direct) return direct;

  const fuzzy = ALLOWED_GARMENT_CATEGORIES.find((category) => normalized.includes(category.toLowerCase()));
  return fuzzy || null;
};

const normalizeSubcategory = (value) => {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  if (ALLOWED_GARMENT_SUBCATEGORY_SET.has(normalized)) return normalized;

  const fuzzy = ALLOWED_GARMENT_SUBCATEGORIES.find((subcategory) => normalized.includes(subcategory));
  return fuzzy || null;
};

const normalizeFabric = (value) => {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  if (ALLOWED_FABRIC_SET.has(normalized)) return normalized;

  for (const allowed of ALLOWED_FABRIC_SET) {
    if (normalized.includes(allowed)) return allowed;
  }

  return null;
};

const extractFirstJsonObject = (rawValue) => {
  if (typeof rawValue !== 'string') return null;

  const stripped = rawValue
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(stripped);
  } catch (error) {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const inferFromTextHeuristics = (rawText) => {
  const text = normalizeToken(rawText);

  const inferredSubcategory = ALLOWED_GARMENT_SUBCATEGORIES.find((subcategory) => text.includes(subcategory)) || null;
  const inferredCategory = inferredSubcategory
    ? SUBCATEGORY_TO_CATEGORY[inferredSubcategory] || null
    : (text.includes('shoe') || text.includes('sneaker') ? 'Footwear'
      : text.includes('dress') ? 'Dresses'
      : text.includes('jacket') || text.includes('coat') || text.includes('blazer') ? 'Outerwear'
      : text.includes('jeans') || text.includes('pants') || text.includes('shorts') || text.includes('skirt') ? 'Bottoms'
      : text.includes('bag') || text.includes('tote') || text.includes('backpack') ? 'Bags'
      : text.includes('swim') ? 'Swimwear'
      : text.includes('belt') || text.includes('hat') || text.includes('scarf') || text.includes('watch') ? 'Accessories'
      : null);

  const inferredColor = normalizeColor(text);
  const inferredFabric = normalizeFabric(text);

  const styleTags = [];
  if (text.includes('formal') || text.includes('office') || text.includes('blazer') || text.includes('suit')) styleTags.push('formal', 'business');
  if (text.includes('casual') || text.includes('daily')) styleTags.push('casual');
  if (text.includes('sport') || text.includes('gym') || text.includes('running')) styleTags.push('sportswear', 'athleisure');
  if (text.includes('street') || text.includes('oversized') || text.includes('cargo')) styleTags.push('streetwear');
  if (text.includes('vintage') || text.includes('retro')) styleTags.push('vintage');
  if (text.includes('minimal')) styleTags.push('minimalist');
  if (text.includes('luxury') || text.includes('designer')) styleTags.push('luxury');
  if (text.includes('vacation') || text.includes('resort') || text.includes('beach')) styleTags.push('vacation');

  return {
    category: inferredCategory,
    subcategory: inferredSubcategory,
    color: inferredColor,
    fabric: inferredFabric,
    styleTags: [...new Set(styleTags)].filter((tag) => ALLOWED_GARMENT_STYLE_TAG_SET.has(tag)),
  };
};

const sanitizeDetectedAttributes = (raw, fallbackText) => {
  const fallback = inferFromTextHeuristics(fallbackText);
  const source = raw && typeof raw === 'object' ? raw : {};

  let category = normalizeCategory(source.category) || fallback.category;
  let subcategory = normalizeSubcategory(source.subcategory) || fallback.subcategory;
  let color = normalizeColor(source.color) || fallback.color;
  let fabric = normalizeFabric(source.fabric) || fallback.fabric;

  if (subcategory && !category) {
    category = SUBCATEGORY_TO_CATEGORY[subcategory] || null;
  }

  if (subcategory && category) {
    const allowedForCategory = CATEGORY_TO_SUBCATEGORIES[category] || [];
    if (!allowedForCategory.includes(subcategory)) {
      subcategory = null;
    }
  }

  const sourceTags = Array.isArray(source.styleTags)
    ? source.styleTags
    : (Array.isArray(source.tags) ? source.tags : []);

  const styleTags = normalizeUniqueTagList(sourceTags)
    .filter((tag) => ALLOWED_GARMENT_STYLE_TAG_SET.has(tag));

  const mergedStyleTags = [...new Set([...(fallback.styleTags || []), ...styleTags])].slice(0, 4);

  return {
    category: category || null,
    subcategory: subcategory || null,
    color: color || null,
    fabric: fabric || null,
    styleTags: mergedStyleTags,
  };
};

exports.autoDetectGarmentDetails = async (req, res) => {
  let uploadedImageUrl = null;
  let imageDataUrl = null;

  try {
    const bodyImageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    if (req.file) {
      uploadedImageUrl = getUploadedImageUrl(req.file);

      if (uploadedImageUrl && /^https:\/\//i.test(uploadedImageUrl)) {
        const validatedUploadedUrl = await validateOutboundImageUrl(uploadedImageUrl);
        if (!validatedUploadedUrl.ok) {
          return res.status(400).json({ message: validatedUploadedUrl.reason || 'Invalid uploaded image URL.' });
        }
        uploadedImageUrl = validatedUploadedUrl.normalizedUrl;
      } else if (req.file?.path) {
        const fileBuffer = await fs.readFile(req.file.path);
        const mimeType = req.file.mimetype || 'image/jpeg';
        imageDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      }
    }

    let imageUrl = uploadedImageUrl || null;
    if (!imageDataUrl && !imageUrl && bodyImageUrl) {
      const validatedImageUrl = await validateOutboundImageUrl(bodyImageUrl);
      if (!validatedImageUrl.ok) {
        return res.status(400).json({ message: validatedImageUrl.reason || 'Invalid image URL.' });
      }
      imageUrl = validatedImageUrl.normalizedUrl;
    }

    if (!imageDataUrl && !imageUrl) {
      return res.status(400).json({ message: 'image or imageUrl is required.' });
    }

    const visionImageSource = imageDataUrl || imageUrl;
    const fallbackText = [
      req.body?.name,
      req.body?.fileName,
      req.file?.originalname,
      imageUrl,
      bodyImageUrl,
    ].filter(Boolean).join(' ');

    let detected = sanitizeDetectedAttributes({}, fallbackText);

    if (groqClient) {
      try {
        const completion = await groqClient.chat.completions.create({
          model: GROQ_VISION_MODEL,
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            {
              role: 'system',
              content: 'You are a fashion metadata detector. Return valid JSON only with keys: category, subcategory, color, fabric, styleTags. Do not include markdown.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: [
                    'Analyze this clothing image and infer normalized metadata.',
                    `category must be one of: ${ALLOWED_GARMENT_CATEGORIES.join(', ')}`,
                    `subcategory must be one of: ${ALLOWED_GARMENT_SUBCATEGORIES.join(', ')}`,
                    `color should be one of: ${ALLOWED_COLORS.join(', ')}`,
                    `fabric should be one of: ${Array.from(ALLOWED_FABRIC_SET).join(', ')}`,
                    `styleTags should be an array from: ${ALLOWED_GARMENT_STYLE_TAGS.join(', ')}`,
                    'Use null for unknown values and return at most 4 style tags.',
                  ].join('\n'),
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: visionImageSource,
                  },
                },
              ],
            },
          ],
        });

        const content = completion?.choices?.[0]?.message?.content;
        const parsed = extractFirstJsonObject(content);
        detected = sanitizeDetectedAttributes(parsed || {}, fallbackText);
      } catch (error) {
        detected = sanitizeDetectedAttributes({}, fallbackText);
      }
    }

    return res.json({
      ...detected,
      sourceImageUrl: imageUrl || uploadedImageUrl || null,
      usedModel: groqClient ? GROQ_VISION_MODEL : null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (uploadedImageUrl) {
      try {
        await deleteImageByUrl(uploadedImageUrl);
      } catch (cleanupError) {
        // Ignore cleanup failures; response should not fail because of orphan cleanup.
      }
    }
  }
};

const scoreImage = (img) => {
  const imageUrl = typeof img?.imageUrl === 'string' ? img.imageUrl : '';
  const link = typeof img?.link === 'string'
    ? img.link
    : (typeof img?.sourceUrl === 'string' ? img.sourceUrl : '');

  const url = `${imageUrl}${link}`.toLowerCase();
  const context = `${typeof img?.title === 'string' ? img.title : ''}${typeof img?.snippet === 'string' ? img.snippet : ''}`.toLowerCase();

  if (BLOCKED_IMAGE_HOST_TOKENS.some((token) => url.includes(token))) return -1;

  let score = 0;

  if (PREFERRED_SOURCE_TOKENS.some((token) => url.includes(token))) score += 10;

  score += RELEVANCE_TOKENS.filter((token) => context.includes(token)).length * 2;

  if (imageUrl.startsWith('https')) score += 1;

  return score;
};

exports.searchGarmentReferenceImages = async (req, res) => {
  const query = typeof req.body?.q === 'string' ? req.body.q.trim() : '';
  const num = Number(req.body?.num) || 10;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required.' });
  }

  if (!process.env.SERPER_API_KEY) {
    return res.status(500).json({ message: 'Serper API key is not configured.' });
  }

  try {
    const response = await fetchWithTimeout(SERPER_IMAGE_SEARCH_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${query} product photography white background fashion ecommerce`,
        num: Math.min(Math.max(num, 1), 20),
      }),
    });

    if (!response.ok) {
      const message = await parseThirdPartyErrorMessage(response, 'Image search failed.');
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          message: 'Serper API key is invalid or missing. Update SERPER_API_KEY in backend .env and restart server.',
        });
      }
      return res.status(response.status).json({ message });
    }

    const payload = await response.json();
    const images = Array.isArray(payload?.images) ? payload.images : [];
    const cappedCount = Math.min(Math.max(num, 1), 20);

    const normalized = images
      .map((image) => ({
        imageUrl: image?.imageUrl,
        sourceUrl: image?.sourceUrl || image?.link,
        title: image?.title,
        snippet: image?.snippet,
        link: image?.link || image?.sourceUrl,
      }))
      .filter((image) => typeof image.imageUrl === 'string' && image.imageUrl.trim())
      .filter((image) => {
        const url = `${image.imageUrl}${image.link || ''}`.toLowerCase();
        return !BLOCKED_IMAGE_HOST_TOKENS.some((token) => url.includes(token));
      })
      .map((image) => ({ ...image, score: scoreImage(image) }))
      .filter((image) => image.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, cappedCount)
      .map((image) => ({
        imageUrl: image.imageUrl,
        sourceUrl: image.sourceUrl,
        title: image.title,
      }));

    if (normalized.length < 3) {
      return res.json({
        images: [],
        message: 'No good results found, try rephrasing',
      });
    }

    return res.json({ images: normalized });
  } catch (error) {
    if (error?.code === 'FETCH_TIMEOUT') {
      return res.status(502).json({
        message: 'Image search provider timed out. Please try again.',
      });
    }

    return res.status(502).json({
      message: 'Unable to reach image search provider right now.',
    });
  }
};

exports.removeGarmentImageBackgroundByUrl = async (req, res) => {
  const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
  const size = req.body?.size === 'auto' ? 'auto' : 'preview';

  if (!imageUrl) {
    return res.status(400).json({ message: 'imageUrl is required.' });
  }

  if (!process.env.REMOVE_BG_API_KEY) {
    return res.status(500).json({ message: 'Remove.bg API key is not configured.' });
  }

  const validatedImageUrl = await validateOutboundImageUrl(imageUrl);
  if (!validatedImageUrl.ok) {
    return res.status(400).json({ message: validatedImageUrl.reason || 'Invalid image URL.' });
  }

  try {
    const body = new URLSearchParams();
    body.append('image_url', validatedImageUrl.normalizedUrl);
    body.append('size', size);

    const response = await fetchWithTimeout(REMOVE_BG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        Accept: 'image/png',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const message = await parseThirdPartyErrorMessage(
        response,
        'Background removal failed. Please try again.',
      );

      const retryAfter = response.headers.get('retry-after');
      return res.status(response.status).json({
        message,
        retryAfterSeconds: retryAfter ? Number(retryAfter) || undefined : undefined,
      });
    }

    const mimeType = response.headers.get('content-type') || 'image/png';
    const outputBuffer = Buffer.from(await response.arrayBuffer());
    const base64 = outputBuffer.toString('base64');

    return res.json({
      mimeType,
      base64,
      dataUrl: `data:${mimeType};base64,${base64}`,
    });
  } catch (error) {
    if (error?.code === 'FETCH_TIMEOUT') {
      return res.status(502).json({
        message: 'Background removal provider timed out. Please try again.',
      });
    }

    return res.status(502).json({
      message: 'Unable to reach background removal provider right now.',
    });
  }
};

exports.createGarment = async (req, res) => {
  try {
    const garmentData = {
      ...req.body,
      owner: req.user.userId
    };

    // If an image was uploaded, add the path to the garment data
    if (req.file) {
      garmentData.imageUrl = getUploadedImageUrl(req.file);
      if (!garmentData.imageUrl) {
        return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
      }
      garmentData.imageMetadata = buildImageMetadata(req.file, garmentData.imageUrl);
    }

    const garment = new Garment(garmentData);
    await garment.save();

    res.status(201).json(garment);

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getGarments = async (req, res) => {
  try {

    const { page = 1, limit = 10, category, color } = req.query;

    const filter = { owner: req.user.userId };

    if (category) filter.category = category;
    if (color) filter.color = color;

    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const garments = await Garment.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const garmentIds = garments.map((garment) => garment._id);
    let wearCountsByGarmentId = new Map();

    if (garmentIds.length > 0) {
      const usageCounts = await Usage.aggregate([
        {
          $match: {
            user: ownerObjectId,
            garment: { $in: garmentIds },
          },
        },
        {
          $group: {
            _id: '$garment',
            count: { $sum: 1 },
          },
        },
      ]);

      wearCountsByGarmentId = new Map(
        usageCounts.map((row) => [String(row._id), row.count])
      );
    }

    const garmentsWithWearCount = garments.map((garment) => ({
      ...garment,
      wearCount: wearCountsByGarmentId.get(String(garment._id)) || 0,
    }));

    res.json(garmentsWithWearCount);

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getGarmentById = async (req, res) => {
  try {

    const garment = await Garment.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!garment) {
      return res.status(404).json({ message: "Garment not found" });
    }

    res.json(garment);

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateGarmentPreferences = async (req, res) => {
  try {
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'isFavorite')) {
      updates.isFavorite = Boolean(req.body.isFavorite);
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'isHidden')) {
      updates.isHidden = Boolean(req.body.isHidden);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No preference fields provided.' });
    }

    const garment = await Garment.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!garment) {
      return res.status(404).json({ message: 'Garment not found' });
    }

    res.json(garment);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateGarmentSubcategory = async (req, res) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'subcategory')) {
      return res.status(400).json({ message: 'subcategory is required.' });
    }

    const normalizedSubcategory = normalizeToken(req.body.subcategory);
    const nextSubcategory = normalizedSubcategory || null;

    if (nextSubcategory && !ALLOWED_GARMENT_SUBCATEGORY_SET.has(nextSubcategory)) {
      return res.status(400).json({
        message: 'Invalid subcategory value.',
        allowedSubcategories: ALLOWED_GARMENT_SUBCATEGORIES,
      });
    }

    const garment = await Garment.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId,
      },
      {
        subcategory: nextSubcategory,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!garment) {
      return res.status(404).json({ message: 'Garment not found' });
    }

    return res.json(garment);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateGarmentTags = async (req, res) => {
  try {
    if (!Array.isArray(req.body?.tags)) {
      return res.status(400).json({ message: 'tags must be an array.' });
    }

    const normalizedTags = normalizeUniqueTagList(req.body.tags);
    const invalidTags = normalizedTags.filter((tag) => !ALLOWED_GARMENT_STYLE_TAG_SET.has(tag));

    if (invalidTags.length > 0) {
      return res.status(400).json({
        message: 'Invalid tags provided.',
        invalidTags,
        allowedTags: ALLOWED_GARMENT_STYLE_TAGS,
      });
    }

    const garment = await Garment.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user.userId,
      },
      {
        tags: normalizedTags,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!garment) {
      return res.status(404).json({ message: 'Garment not found' });
    }

    return res.json(garment);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateGarment = async (req, res) => {
  try {
    const garment = await Garment.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!garment) {
      if (req.file) {
        await deleteImageByUrl(getUploadedImageUrl(req.file));
      }
      return res.status(404).json({ message: "Garment not found" });
    }

    const previousImageUrl = garment.imageUrl;

    Object.assign(garment, req.body);

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'imageUrl') && !req.body.imageUrl) {
      garment.imageMetadata = null;
    }

    if (req.file) {
      garment.imageUrl = getUploadedImageUrl(req.file);
      if (!garment.imageUrl) {
        return res.status(502).json({ message: 'Image upload to cloud storage failed.' });
      }
      garment.imageMetadata = buildImageMetadata(req.file, garment.imageUrl);
    }

    await garment.save();

    if (req.file && previousImageUrl && previousImageUrl !== garment.imageUrl) {
      await deleteImageByUrl(previousImageUrl);
    }

    res.json(garment);

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.deleteGarment = async (req, res) => {
  try {

    const garment = await Garment.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!garment) {
      return res.status(404).json({ message: "Garment not found" });
    }

    if (garment.imageUrl) {
      await deleteImageByUrl(garment.imageUrl);
    }

    res.json({ message: "Garment deleted" });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

