const Garment = require('../models/garment');
const Usage = require('../models/usage');

const USAGE_EVENT_STATUSES = new Set(['scheduled', 'worn', 'skipped', 'cancelled']);

const normalizeEventStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (USAGE_EVENT_STATUSES.has(normalized)) {
    return normalized;
  }

  return 'worn';
};

const toDateFromIsoDateOnly = (value) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
};

const resolveEventDate = ({ eventStatus, wornDate, eventLocalDate }) => {
  if (wornDate) {
    return new Date(wornDate);
  }

  const derivedFromLocalDate = toDateFromIsoDateOnly(eventLocalDate);
  if (derivedFromLocalDate) {
    return derivedFromLocalDate;
  }

  if (eventStatus === 'worn') {
    return new Date();
  }

  return null;
};

const toIsoDateOnly = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
};

exports.logUsage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      garmentId,
      wornDate,
      outfitId,
      eventStatus,
      eventSource,
      eventTimezone,
      eventLocalDate,
      eventGroupId,
      idempotencyKey,
    } = req.body;

    if (!garmentId) {
      return res.status(400).json({ message: 'garmentId is required' });
    }

    const normalizedEventStatus = normalizeEventStatus(eventStatus);
    const resolvedEventDate = resolveEventDate({
      eventStatus: normalizedEventStatus,
      wornDate,
      eventLocalDate,
    });

    if (!resolvedEventDate) {
      return res.status(400).json({
        message: 'wornDate or eventLocalDate is required for non-worn events',
      });
    }

    const garment = await Garment.findOne({ _id: garmentId, owner: userId }).select('_id');
    if (!garment) {
      return res.status(404).json({ message: 'Garment not found' });
    }

    const usage = await Usage.create({
      user: userId,
      garment: garmentId,
      outfit: outfitId || null,
      wornDate: resolvedEventDate,
      eventStatus: normalizedEventStatus,
      eventSource: typeof eventSource === 'string' && eventSource.trim() ? eventSource.trim() : 'manual',
      eventTimezone: typeof eventTimezone === 'string' && eventTimezone.trim() ? eventTimezone.trim() : null,
      eventLocalDate: typeof eventLocalDate === 'string' && eventLocalDate.trim()
        ? eventLocalDate.trim()
        : toIsoDateOnly(resolvedEventDate),
      eventGroupId: typeof eventGroupId === 'string' && eventGroupId.trim() ? eventGroupId.trim() : null,
      idempotencyKey: typeof idempotencyKey === 'string' && idempotencyKey.trim() ? idempotencyKey.trim() : null,
    });

    res.status(201).json(usage);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
      return res.status(409).json({ message: 'Duplicate wear event ignored.' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.logBulkUsage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      garmentIds,
      wornDate,
      outfitId,
      eventStatus,
      eventSource,
      eventTimezone,
      eventLocalDate,
      eventGroupId,
      idempotencyKey,
    } = req.body;

    if (!Array.isArray(garmentIds) || garmentIds.length === 0) {
      return res.status(400).json({ message: 'garmentIds must be a non-empty array' });
    }

    const normalizedEventStatus = normalizeEventStatus(eventStatus);
    const resolvedEventDate = resolveEventDate({
      eventStatus: normalizedEventStatus,
      wornDate,
      eventLocalDate,
    });

    if (!resolvedEventDate) {
      return res.status(400).json({
        message: 'wornDate or eventLocalDate is required for non-worn events',
      });
    }

    const ownedGarments = await Garment.find({
      _id: { $in: garmentIds },
      owner: userId,
    }).select('_id');

    if (ownedGarments.length !== garmentIds.length) {
      return res.status(400).json({ message: 'One or more garments are invalid for this user' });
    }

    const docs = garmentIds.map((garmentId) => ({
      user: userId,
      garment: garmentId,
      outfit: outfitId || null,
      wornDate: resolvedEventDate,
      eventStatus: normalizedEventStatus,
      eventSource: typeof eventSource === 'string' && eventSource.trim() ? eventSource.trim() : 'manual',
      eventTimezone: typeof eventTimezone === 'string' && eventTimezone.trim() ? eventTimezone.trim() : null,
      eventLocalDate: typeof eventLocalDate === 'string' && eventLocalDate.trim()
        ? eventLocalDate.trim()
        : toIsoDateOnly(resolvedEventDate),
      eventGroupId: typeof eventGroupId === 'string' && eventGroupId.trim() ? eventGroupId.trim() : null,
      idempotencyKey: typeof idempotencyKey === 'string' && idempotencyKey.trim()
        ? `${idempotencyKey.trim()}:${garmentId}`
        : null,
    }));

    const usages = await Usage.insertMany(docs);
    res.status(201).json({ created: usages.length, usages });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
      return res.status(409).json({ message: 'Duplicate wear event ignored.' });
    }

    res.status(500).json({ message: 'Internal server error' });
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

