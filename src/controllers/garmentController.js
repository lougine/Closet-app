const mongoose = require('mongoose');
const Garment = require("../models/garment");
const Usage = require('../models/usage');
const { createImageUpload } = require("../middleware/imageUploadMiddleware");
const { deleteImageByUrl } = require("../utils/imageFileUtils");
const { buildImageMetadata } = require('../utils/imageMetadata');

const SERPER_IMAGE_SEARCH_URL = 'https://google.serper.dev/images';
const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

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
    const response = await fetch(SERPER_IMAGE_SEARCH_URL, {
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
    return res.status(502).json({
      message: 'Unable to reach image search provider right now.',
      error: error.message,
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

  try {
    const body = new URLSearchParams();
    body.append('image_url', imageUrl);
    body.append('size', size);

    const response = await fetch(REMOVE_BG_API_URL, {
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
    return res.status(502).json({
      message: 'Unable to reach background removal provider right now.',
      error: error.message,
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
      garmentData.imageUrl = `/uploads/${req.file.filename}`;
      garmentData.imageMetadata = buildImageMetadata(req.file, garmentData.imageUrl);
    }

    const garment = new Garment(garmentData);
    await garment.save();

    res.status(201).json(garment);

  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
        await deleteImageByUrl(`/uploads/${req.file.filename}`);
      }
      return res.status(404).json({ message: "Garment not found" });
    }

    const previousImageUrl = garment.imageUrl;

    Object.assign(garment, req.body);

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'imageUrl') && !req.body.imageUrl) {
      garment.imageMetadata = null;
    }

    if (req.file) {
      garment.imageUrl = `/uploads/${req.file.filename}`;
      garment.imageMetadata = buildImageMetadata(req.file, garment.imageUrl);
    }

    await garment.save();

    if (req.file && previousImageUrl && previousImageUrl !== garment.imageUrl) {
      await deleteImageByUrl(previousImageUrl);
    }

    res.json(garment);

  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};
