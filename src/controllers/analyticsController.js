const mongoose = require('mongoose');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');

const parseLimit = (value, fallback = 6, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const buildGarmentWearAggregation = (userObjectId) => ([
  { $match: { owner: userObjectId } },
  {
    $lookup: {
      from: 'usages',
      let: { garmentId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$garment', '$$garmentId'] },
                { $eq: ['$user', userObjectId] },
              ],
            },
          },
        },
        { $count: 'wearCount' },
      ],
      as: 'wearMeta',
    },
  },
  {
    $addFields: {
      wearCount: { $ifNull: [{ $first: '$wearMeta.wearCount' }, 0] },
    },
  },
  {
    $project: {
      _id: 1,
      name: 1,
      imageUrl: 1,
      category: 1,
      color: 1,
      purchasePrice: 1,
      wearCount: 1,
      costPerWear: {
        $cond: [
          {
            $and: [
              { $gt: ['$wearCount', 0] },
              { $ne: ['$purchasePrice', null] },
            ],
          },
          { $round: [{ $divide: ['$purchasePrice', '$wearCount'] }, 2] },
          null,
        ],
      },
    },
  },
]);

exports.getOverview = async (req, res) => {
  try {
    const owner = req.user.userId;
    const ownerObjectId = new mongoose.Types.ObjectId(owner);

    const [totalItems, totalOutfits, usageStats] = await Promise.all([
      Garment.countDocuments({ owner }),
      Outfit.countDocuments({ owner }),
      Usage.aggregate([
        { $match: { user: ownerObjectId } },
        {
          $group: {
            _id: null,
            totalWearEvents: { $sum: 1 },
            uniqueGarments: { $addToSet: '$garment' },
            uniqueOutfits: { $addToSet: '$outfit' },
          },
        },
        {
          $project: {
            _id: 0,
            totalWearEvents: 1,
            wornGarmentCount: { $size: '$uniqueGarments' },
            outfitsWornCount: {
              $size: { $setDifference: ['$uniqueOutfits', [null]] },
            },
          },
        },
      ]),
    ]);

    const stats = usageStats[0] || {
      totalWearEvents: 0,
      wornGarmentCount: 0,
      outfitsWornCount: 0,
    };

    const wardrobeUsagePercent = totalItems === 0
      ? 0
      : Math.round((stats.wornGarmentCount / totalItems) * 100);

    res.json({
      totalItems,
      wardrobeUsagePercent,
      outfitsWorn: stats.outfitsWornCount,
      totalOutfits,
      totalWearEvents: stats.totalWearEvents,
      averageWearPerItem: totalItems === 0
        ? 0
        : Number((stats.totalWearEvents / totalItems).toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const result = await Garment.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Unknown'] },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { count: -1, name: 1 } },
    ]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getColours = async (req, res) => {
  try {
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const result = await Garment.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $group: {
          _id: { $ifNull: ['$color', 'Unknown'] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          colour: '$_id',
          label: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1, colour: 1 } },
    ]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMostWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId),
      { $match: { wearCount: { $gt: 0 } } },
      { $sort: { wearCount: -1, name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeastWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId),
      { $match: { wearCount: { $gt: 0 } } },
      { $sort: { wearCount: 1, name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNeverWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId),
      { $match: { wearCount: 0 } },
      { $sort: { name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCostPerWear = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 25, 100);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const [items, summary] = await Promise.all([
      Garment.aggregate([
        ...buildGarmentWearAggregation(ownerObjectId),
        { $match: { purchasePrice: { $ne: null } } },
        {
          $sort: {
            wearCount: -1,
            costPerWear: 1,
            name: 1,
          },
        },
        { $limit: limit },
      ]),
      Garment.aggregate([
        ...buildGarmentWearAggregation(ownerObjectId),
        {
          $match: {
            wearCount: { $gt: 0 },
            costPerWear: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            trackedItems: { $sum: 1 },
            averageCostPerWear: { $avg: '$costPerWear' },
            minCostPerWear: { $min: '$costPerWear' },
            maxCostPerWear: { $max: '$costPerWear' },
          },
        },
        {
          $project: {
            _id: 0,
            trackedItems: 1,
            averageCostPerWear: { $round: ['$averageCostPerWear', 2] },
            minCostPerWear: 1,
            maxCostPerWear: 1,
          },
        },
      ]),
    ]);

    res.json({
      items,
      summary: summary[0] || {
        trackedItems: 0,
        averageCostPerWear: 0,
        minCostPerWear: 0,
        maxCostPerWear: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsageTrends = async (req, res) => {
  try {
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const months = parseLimit(req.query.months, 6, 24);
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);

    const trends = await Usage.aggregate([
      {
        $match: {
          user: ownerObjectId,
          wornDate: { $gte: fromDate },
        },
      },
      {
        $facet: {
          monthly: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$wornDate' } },
                wearCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0,
                month: '$_id',
                wearCount: 1,
              },
            },
          ],
          dayOfWeek: [
            {
              $group: {
                _id: { $isoDayOfWeek: '$wornDate' },
                wearCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          byCategory: [
            {
              $lookup: {
                from: 'garments',
                localField: 'garment',
                foreignField: '_id',
                as: 'garmentDoc',
              },
            },
            { $unwind: '$garmentDoc' },
            {
              $group: {
                _id: { $ifNull: ['$garmentDoc.category', 'Unknown'] },
                wearCount: { $sum: 1 },
              },
            },
            { $sort: { wearCount: -1, _id: 1 } },
            {
              $project: {
                _id: 0,
                category: '$_id',
                wearCount: 1,
              },
            },
          ],
        },
      },
    ]);

    const dayNames = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
      7: 'Sunday',
    };

    const result = trends[0] || { monthly: [], dayOfWeek: [], byCategory: [] };
    const dayOfWeek = result.dayOfWeek.map((item) => ({
      day: dayNames[item._id] || String(item._id),
      dayNumber: item._id,
      wearCount: item.wearCount,
    }));

    res.json({
      rangeMonths: months,
      monthly: result.monthly,
      dayOfWeek,
      byCategory: result.byCategory,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
