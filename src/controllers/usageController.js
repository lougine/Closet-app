const Garment = require('../models/garment');
const Usage = require('../models/usage');

exports.logUsage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { garmentId, wornDate, outfitId } = req.body;

    if (!garmentId) {
      return res.status(400).json({ message: 'garmentId is required' });
    }

    const garment = await Garment.findOne({ _id: garmentId, owner: userId }).select('_id');
    if (!garment) {
      return res.status(404).json({ message: 'Garment not found' });
    }

    const usage = await Usage.create({
      user: userId,
      garment: garmentId,
      outfit: outfitId || null,
      wornDate: wornDate ? new Date(wornDate) : new Date(),
    });

    res.status(201).json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logBulkUsage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { garmentIds, wornDate, outfitId } = req.body;

    if (!Array.isArray(garmentIds) || garmentIds.length === 0) {
      return res.status(400).json({ message: 'garmentIds must be a non-empty array' });
    }

    const ownedGarments = await Garment.find({
      _id: { $in: garmentIds },
      owner: userId,
    }).select('_id');

    if (ownedGarments.length !== garmentIds.length) {
      return res.status(400).json({ message: 'One or more garments are invalid for this user' });
    }

    const date = wornDate ? new Date(wornDate) : new Date();
    const docs = garmentIds.map((garmentId) => ({
      user: userId,
      garment: garmentId,
      outfit: outfitId || null,
      wornDate: date,
    }));

    const usages = await Usage.insertMany(docs);
    res.status(201).json({ created: usages.length, usages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsageHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { garmentId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { user: userId };
    if (garmentId) filter.garment = garmentId;

    if (startDate || endDate) {
      filter.wornDate = {};
      if (startDate) filter.wornDate.$gte = new Date(startDate);
      if (endDate) filter.wornDate.$lte = new Date(endDate);
    }

    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 20;

    const [events, total] = await Promise.all([
      Usage.find(filter)
        .sort({ wornDate: -1, _id: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit)
        .populate('garment', 'name category color imageUrl purchasePrice')
        .populate('outfit', 'name date'),
      Usage.countDocuments(filter),
    ]);

    res.json({
      events,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
