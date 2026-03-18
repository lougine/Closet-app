const Outfit = require("../models/outfit");
const Garment = require('../models/garment');
const Usage = require('../models/usage');

const DEFAULT_RANDOMIZE_COUNT = 4;
const MAX_STYLING_COUNT = 8;

const toObjectIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
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
    previewImage: previewGarment?.imageUrl || '',
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

exports.createOutfit = async (req, res) => {
  try {
    const owner = req.user.userId;
    const garments = Array.isArray(req.body.garments) ? req.body.garments : [];

    if (garments.length > 0) {
      const ownedGarments = await Garment.find({
        _id: { $in: garments },
        owner,
      }).select('_id');

      if (ownedGarments.length !== garments.length) {
        return res.status(400).json({ message: 'One or more garments are invalid for this user' });
      }
    }

    const outfit = new Outfit({
      ...req.body,
      owner
    });

    await outfit.save();

    if (garments.length > 0) {
      const wornDate = outfit.date || new Date();
      const usageDocs = garments.map((garmentId) => ({
        user: owner,
        garment: garmentId,
        outfit: outfit._id,
        wornDate,
      }));
      await Usage.insertMany(usageDocs);
    }

    res.status(201).json(outfit);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getOutfits = async (req, res) => {
  try {

    const outfits = await Outfit.find({
      owner: req.user.userId
    })
      .populate('garments', '_id imageUrl name category color season')
      .sort({ date: -1, createdAt: -1 });

    res.json(outfits.map(mapOutfitForCalendar));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getOutfitsByDate = async (req, res) => {
  try {

    const { start, end } = toUtcDayRange(req.params.date);

    const outfits = await Outfit.find({
      owner: req.user.userId,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .populate('garments', '_id imageUrl name category color season')
      .sort({ date: -1, createdAt: -1 });

    res.json(outfits.map(mapOutfitForCalendar));

  } catch (error) {
    res.status(500).json({ error: error.message });
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

    res.json({ message: "Outfit deleted" });

  } catch (error) {
    res.status(500).json({ error: error.message });
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
    return res.status(500).json({ error: error.message });
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

    const context = {
      seasons: deriveSeasonPreference(parsedTemperature),
      isFormalEvent: /wedding|formal|office|meeting|business|interview|ceremony/i.test(event),
    };

    const scored = garments
      .map((garment) => {
        const result = scoreGarment(garment, context);
        return {
          garment,
          score: result.score,
          reasons: result.reasons,
        };
      })
      .sort((a, b) => b.score - a.score || String(a.garment.name).localeCompare(String(b.garment.name)));

    const topPool = scored.slice(0, Math.max(count * 4, DEFAULT_RANDOMIZE_COUNT));
    const recommendationCount = Math.min(count, 5);
    const recommendations = [];
    const seenCombos = new Set();

    for (let i = 0; i < recommendationCount; i += 1) {
      const poolSlice = topPool.slice(i, i + 8).map((entry) => entry.garment);
      const sourcePool = poolSlice.length > 0 ? poolSlice : topPool.map((entry) => entry.garment);
      const selected = buildBalancedOutfit(sourcePool, Math.min(DEFAULT_RANDOMIZE_COUNT, sourcePool.length));
      const comboKey = selected
        .map((g) => g._id.toString())
        .sort()
        .join(':');

      if (!comboKey || seenCombos.has(comboKey)) {
        continue;
      }
      seenCombos.add(comboKey);

      const selectedScores = selected.map((garment) => (
        scored.find((entry) => entry.garment._id.toString() === garment._id.toString())
      )).filter(Boolean);

      const totalScore = selectedScores.reduce((sum, entry) => sum + entry.score, 0);
      const reasonSet = new Set(selectedScores.flatMap((entry) => entry.reasons));

      recommendations.push({
        name: `${event ? `${event} ` : ''}Look ${recommendations.length + 1}`.trim(),
        score: totalScore,
        reason: reasonSet.size > 0
          ? Array.from(reasonSet).slice(0, 3).join(', ')
          : 'balanced outfit from your wardrobe',
        garments: selected.map(mapGarment),
      });
    }

    return res.json({
      recommendations,
      context: {
        event,
        temperatureC: parsedTemperature,
        interpretedSeasons: context.seasons,
        formalEventDetected: context.isFormalEvent,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


