const mongoose = require('mongoose');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');

const parseLimit = (value, fallback = 6, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const getMonthKey = (date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
);

const buildMonthSeries = (months, monthlyRows) => {
  const now = new Date();
  const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  monthStartUtc.setUTCMonth(monthStartUtc.getUTCMonth() - (months - 1));

  const wearCountByMonth = new Map(monthlyRows.map((row) => [row.month, row.wearCount]));
  const series = [];

  for (let i = 0; i < months; i += 1) {
    const cursor = new Date(monthStartUtc);
    cursor.setUTCMonth(monthStartUtc.getUTCMonth() + i);
    const month = getMonthKey(cursor);
    series.push({ month, wearCount: wearCountByMonth.get(month) || 0 });
  }

  return series;
};

const buildDayOfWeekSeries = (dayRows) => {
  const dayNames = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  const wearCountByDay = new Map(dayRows.map((row) => [row._id, row.wearCount]));

  return [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => ({
    day: dayNames[dayNumber],
    dayNumber,
    wearCount: wearCountByDay.get(dayNumber) || 0,
  }));
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
    const nonLookbookOutfitFilter = {
      owner: ownerObjectId,
      isLookbook: { $ne: true },
    };

    const [totalItems, outfitStats, usageStats] = await Promise.all([
      Garment.countDocuments({ owner: ownerObjectId }),
      Outfit.aggregate([
        { $match: nonLookbookOutfitFilter },
        {
          $lookup: {
            from: 'usages',
            let: { outfitId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$outfit', '$$outfitId'] },
                      { $eq: ['$user', ownerObjectId] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'usageHit',
          },
        },
        {
          $project: {
            isWorn: { $gt: [{ $size: '$usageHit' }, 0] },
          },
        },
        {
          $group: {
            _id: null,
            totalOutfits: { $sum: 1 },
            outfitsWornCount: {
              $sum: { $cond: ['$isWorn', 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalOutfits: 1,
            outfitsWornCount: 1,
          },
        },
      ]),
      Usage.aggregate([
        { $match: { user: ownerObjectId } },
        {
          $group: {
            _id: null,
            totalWearEvents: { $sum: 1 },
            uniqueGarments: { $addToSet: '$garment' },
          },
        },
        {
          $project: {
            _id: 0,
            totalWearEvents: 1,
            wornGarmentCount: { $size: '$uniqueGarments' },
          },
        },
      ]),
    ]);

    const outfitTotals = outfitStats[0] || {
      totalOutfits: 0,
      outfitsWornCount: 0,
    };

    const stats = usageStats[0] || {
      totalWearEvents: 0,
      wornGarmentCount: 0,
    };

    const wardrobeUsagePercent = totalItems === 0
      ? 0
      : Math.round((stats.wornGarmentCount / totalItems) * 100);

    res.json({
      totalItems,
      wardrobeUsagePercent,
      outfitsWorn: outfitTotals.outfitsWornCount,
      totalOutfits: outfitTotals.totalOutfits,
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
        $addFields: {
          normalizedCategory: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ['$category', ''] },
                      regex: '^(shoes|footwear)$',
                      options: 'i',
                    },
                  },
                  then: 'Footwear',
                },
              ],
              default: {
                $ifNull: ['$category', 'Unknown'],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$normalizedCategory',
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
    fromDate.setUTCDate(1);
    fromDate.setUTCHours(0, 0, 0, 0);
    fromDate.setUTCMonth(fromDate.getUTCMonth() - (months - 1));

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
    const result = trends[0] || { monthly: [], dayOfWeek: [], byCategory: [] };
    const monthly = buildMonthSeries(months, result.monthly);
    const dayOfWeek = buildDayOfWeekSeries(result.dayOfWeek);
    const totalWearEventsInRange = monthly.reduce((sum, item) => sum + item.wearCount, 0);
    const mostActiveDay = dayOfWeek.reduce((best, day) => {
      if (!best || day.wearCount > best.wearCount) return day;
      return best;
    }, null);

    res.json({
      rangeMonths: months,
      rangeStart: fromDate,
      monthly,
      dayOfWeek,
      byCategory: result.byCategory,
      summary: {
        totalWearEventsInRange,
        mostActiveDay: mostActiveDay && mostActiveDay.wearCount > 0
          ? { day: mostActiveDay.day, dayNumber: mostActiveDay.dayNumber, wearCount: mostActiveDay.wearCount }
          : null,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
