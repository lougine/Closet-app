const Garment = require('../models/garment');
const Outfit = require('../models/outfit');

function buildWornCounts(outfits = []) {
  const counts = {};
  outfits.forEach((o) => {
    (o.garments || []).forEach((g) => {
      const id = typeof g === 'object' ? g.toString() : g;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return counts;
}

exports.getOverview = async (req, res) => {
  try {
    const owner = req.user.userId;
    const garments = await Garment.find({ owner });
    const outfits = await Outfit.find({ owner }).populate('garments');

    const totalItems = garments.length;
    const totalOutfits = outfits.length;

    const wornCounts = buildWornCounts(outfits);
    const wornGarmentIds = Object.keys(wornCounts);

    const wardrobeUsagePercent = totalItems === 0
      ? 0
      : Math.round((wornGarmentIds.length / totalItems) * 100);

    res.json({
      totalItems,
      wardrobeUsagePercent,
      outfitsWorn: totalOutfits,
      totalOutfits,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const owner = req.user.userId;
    const garments = await Garment.find({ owner });
    const counts = garments.reduce((acc, g) => {
      const key = g.category || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const result = Object.entries(counts).map(([name, count]) => ({ name, count }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getColours = async (req, res) => {
  try {
    const owner = req.user.userId;
    const garments = await Garment.find({ owner });
    const counts = garments.reduce((acc, g) => {
      const key = g.color || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const result = Object.entries(counts).map(([colour, count]) => ({ colour, label: colour, count }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMostWorn = async (req, res) => {
  try {
    const owner = req.user.userId;
    const limit = Number(req.query.limit) || 6;

    const outfits = await Outfit.find({ owner }).populate('garments');
    const wornCounts = buildWornCounts(outfits);

    const garments = await Garment.find({ owner });

    const items = garments
      .map((g) => ({
        _id: g._id.toString(),
        name: g.name,
        imageUrl: g.imageUrl,
        wearCount: wornCounts[g._id.toString()] || 0,
        category: g.category,
      }))
      .filter((g) => g.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, limit);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeastWorn = async (req, res) => {
  try {
    const owner = req.user.userId;
    const limit = Number(req.query.limit) || 6;

    const outfits = await Outfit.find({ owner }).populate('garments');
    const wornCounts = buildWornCounts(outfits);

    const garments = await Garment.find({ owner });

    const items = garments
      .map((g) => ({
        _id: g._id.toString(),
        name: g.name,
        imageUrl: g.imageUrl,
        wearCount: wornCounts[g._id.toString()] || 0,
        category: g.category,
      }))
      .filter((g) => g.wearCount > 0)
      .sort((a, b) => a.wearCount - b.wearCount)
      .slice(0, limit);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNeverWorn = async (req, res) => {
  try {
    const owner = req.user.userId;
    const limit = Number(req.query.limit) || 6;

    const outfits = await Outfit.find({ owner }).populate('garments');
    const wornCounts = buildWornCounts(outfits);

    const garments = await Garment.find({ owner });

    const items = garments
      .map((g) => ({
        _id: g._id.toString(),
        name: g.name,
        imageUrl: g.imageUrl,
        wearCount: wornCounts[g._id.toString()] || 0,
        category: g.category,
      }))
      .filter((g) => g.wearCount === 0)
      .slice(0, limit);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
