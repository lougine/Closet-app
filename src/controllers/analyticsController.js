const mongoose = require('mongoose');

const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');

const parseLimit = (value, fallback = 6, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const wornEventMatch = {
  $or: [
    { eventStatus: 'worn' },
    { eventStatus: { $exists: false } },
    { eventStatus: null },
  ],
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

const buildOutfitDateNormalizationStages = ({ fromDate = null, toDate = null } = {}) => {
  const dateBounds = {};
  if (fromDate) dateBounds.$gte = fromDate;
  if (toDate) dateBounds.$lte = toDate;

  return [
    {
      $addFields: {
        analyticsDate: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $type: '$date' }, 'date'] },
                then: '$date',
              },
              {
                case: { $eq: [{ $type: '$date' }, 'string'] },
                then: {
                  $dateFromString: {
                    dateString: '$date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            ],
            default: null,
          },
        },
      },
    },
    {
      $match: {
        analyticsDate: {
          $ne: null,
          ...dateBounds,
        },
      },
    },
  ];
};

const buildGarmentWearAggregation = (userObjectId, options = {}) => {
  const {
    scopedToPastCalendarOutfits = false,
    now = new Date(),
    fromDate = null,
  } = options;

  const usagePipeline = [
    {
      $match: {
        ...wornEventMatch,
        $expr: {
          $and: [
            { $eq: ['$garment', '$$garmentId'] },
            { $eq: ['$user', '$$ownerId'] },
          ],
        },
      },
    },
  ];

  if (scopedToPastCalendarOutfits || fromDate) {
    usagePipeline.push({
      $match: {
        wornDate: {
          ...(fromDate ? { $gte: fromDate } : {}),
          ...(scopedToPastCalendarOutfits ? { $lte: now } : {}),
        },
      },
    });
  }

  usagePipeline.push({ $count: 'wearCount' });

  const outfitFallbackPipeline = [
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ['$owner', '$$ownerId'] },
            { $ne: ['$isLookbook', true] },
            { $in: ['$$garmentId', { $ifNull: ['$garments', []] }] },
          ],
        },
      },
    },
    {
      $addFields: {
        analyticsDate: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $type: '$date' }, 'date'] },
                then: '$date',
              },
              {
                case: { $eq: [{ $type: '$date' }, 'string'] },
                then: {
                  $dateFromString: {
                    dateString: '$date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            ],
            default: null,
          },
        },
      },
    },
    {
      $match: {
        analyticsDate: {
          $ne: null,
          ...(fromDate ? { $gte: fromDate } : {}),
          ...(scopedToPastCalendarOutfits ? { $lte: now } : {}),
        },
      },
    },
    { $count: 'wearCount' },
  ];

  return [
    { $match: { owner: userObjectId } },
    {
      $lookup: {
        from: 'usages',
        let: { garmentId: '$_id', ownerId: userObjectId },
        pipeline: usagePipeline,
        as: 'wearMeta',
      },
    },
    {
      $lookup: {
        from: 'outfits',
        let: { garmentId: '$_id', ownerId: userObjectId },
        pipeline: outfitFallbackPipeline,
        as: 'outfitWearMeta',
      },
    },
    {
      $addFields: {
        usageWearCount: { $ifNull: [{ $first: '$wearMeta.wearCount' }, 0] },
        outfitWearCount: { $ifNull: [{ $first: '$outfitWearMeta.wearCount' }, 0] },
      },
    },
    {
      $addFields: {
        // Use explicit usage logs when present, otherwise fall back to calendar outfit history.
        wearCount: {
          $cond: [
            { $gt: ['$usageWearCount', 0] },
            '$usageWearCount',
            '$outfitWearCount',
          ],
        },
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
  ];
};

exports.getOverview = async (req, res) => {
  try {
    const owner = req.user.userId;
    const ownerObjectId = new mongoose.Types.ObjectId(owner);
    const now = new Date();
    const [totalItems, totalOutfits, usageStatsResult, outfitFallbackStatsResult] = await Promise.all([
      Garment.countDocuments({ owner: ownerObjectId }),
      Outfit.aggregate([
        {
          $match: {
            owner: ownerObjectId,
            isLookbook: { $ne: true },
          },
        },
        { $count: 'total' },
      ]),
      Usage.aggregate([
        {
          $match: {
            user: ownerObjectId,
            ...wornEventMatch,
            wornDate: { $lte: now },
          },
        },
        {
          $lookup: {
            from: 'outfits',
            let: {
              usageOutfitId: '$outfit',
              ownerId: ownerObjectId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$_id', '$$usageOutfitId'] },
                      { $eq: ['$owner', '$$ownerId'] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: 'matchedOutfit',
          },
        },
        {
          $group: {
            _id: null,
            totalWearEvents: { $sum: 1 },
            uniqueGarments: { $addToSet: '$garment' },
            uniqueOutfits: {
              $addToSet: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$outfit', null] },
                      { $gt: [{ $size: '$matchedOutfit' }, 0] },
                    ],
                  },
                  '$outfit',
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalWearEvents: 1,
            wornGarmentCount: { $size: '$uniqueGarments' },
            outfitsWornCount: {
              $size: {
                $filter: {
                  input: '$uniqueOutfits',
                  as: 'outfitId',
                  cond: { $ne: ['$$outfitId', null] },
                },
              },
            },
          },
        },
      ]),
      Outfit.aggregate([
        {
          $match: {
            owner: ownerObjectId,
            isLookbook: { $ne: true },
          },
        },
        ...buildOutfitDateNormalizationStages({ toDate: now }),
        {
          $match: {
            garments: { $exists: true, $ne: [] },
          },
        },
        { $unwind: '$garments' },
        {
          $group: {
            _id: null,
            totalWearEvents: { $sum: 1 },
            uniqueGarments: { $addToSet: '$garments' },
            uniqueOutfits: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            _id: 0,
            totalWearEvents: 1,
            wornGarmentCount: { $size: '$uniqueGarments' },
            outfitsWornCount: { $size: '$uniqueOutfits' },
          },
        },
      ]),
    ]);

    const totalOutfitsCount = totalOutfits[0]?.total || 0;

    const usageStats = usageStatsResult[0] || {
      totalWearEvents: 0,
      wornGarmentCount: 0,
      outfitsWornCount: 0,
    };

    const outfitFallbackStats = outfitFallbackStatsResult[0] || {
      totalWearEvents: 0,
      wornGarmentCount: 0,
      outfitsWornCount: 0,
    };

    const stats = usageStats.totalWearEvents > 0 ? usageStats : outfitFallbackStats;

    const safeWornCount = Math.max(0, Math.min(totalItems, stats.wornGarmentCount));

    const wardrobeUsagePercent = totalItems === 0
      ? 0
      : (safeWornCount === totalItems
        ? 100
        : Math.floor((safeWornCount / totalItems) * 100));

    res.json({
      totalItems,
      wardrobeUsagePercent,
      outfitsWorn: stats.outfitsWornCount,
      totalOutfits: totalOutfitsCount,
      totalWearEvents: stats.totalWearEvents,
      averageWearPerItem: totalItems === 0
        ? 0
        : Number((stats.totalWearEvents / totalItems).toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMostWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const now = new Date();

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId, { scopedToPastCalendarOutfits: true, now }),
      { $match: { wearCount: { $gt: 0 } } },
      { $sort: { wearCount: -1, name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getLeastWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const now = new Date();

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId, { scopedToPastCalendarOutfits: true, now }),
      { $match: { wearCount: { $gt: 0 } } },
      { $sort: { wearCount: 1, name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getNeverWorn = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const now = new Date();

    const items = await Garment.aggregate([
      ...buildGarmentWearAggregation(ownerObjectId, { scopedToPastCalendarOutfits: true, now }),
      { $match: { wearCount: 0 } },
      { $sort: { name: 1 } },
      { $limit: limit },
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUsageTrends = async (req, res) => {
  try {
    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const months = parseLimit(req.query.months, 6, 24);
    const now = new Date();
    const fromDate = new Date();
    fromDate.setUTCDate(1);
    fromDate.setUTCHours(0, 0, 0, 0);
    fromDate.setUTCMonth(fromDate.getUTCMonth() - (months - 1));

    const usageTrends = await Usage.aggregate([
      {
        $match: {
          user: ownerObjectId,
          ...wornEventMatch,
          wornDate: { $gte: fromDate, $lte: now },
        },
      },
      {
        $lookup: {
          from: 'garments',
          localField: 'garment',
          foreignField: '_id',
          as: 'garmentDoc',
        },
      },
      {
        $unwind: {
          path: '$garmentDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { garmentDoc: null },
            { 'garmentDoc.owner': ownerObjectId },
          ],
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

    let result = usageTrends[0] || { monthly: [], dayOfWeek: [], byCategory: [] };

    const hasUsageTrendData = result.monthly.some((row) => row.wearCount > 0);

    if (!hasUsageTrendData) {
      const outfitTrends = await Outfit.aggregate([
        {
          $match: {
            owner: ownerObjectId,
            isLookbook: { $ne: true },
          },
        },
        ...buildOutfitDateNormalizationStages({ fromDate, toDate: now }),
        {
          $project: {
            date: '$analyticsDate',
            garments: { $ifNull: ['$garments', []] },
          },
        },
        { $unwind: '$garments' },
        {
          $lookup: {
            from: 'garments',
            localField: 'garments',
            foreignField: '_id',
            as: 'garmentDoc',
          },
        },
        {
          $unwind: {
            path: '$garmentDoc',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $facet: {
            monthly: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
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
                  _id: { $isoDayOfWeek: '$date' },
                  wearCount: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            byCategory: [
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

      result = outfitTrends[0] || result;
    }

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
    res.status(500).json({ message: 'Internal server error' });
  }
};

