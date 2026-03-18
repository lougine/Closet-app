const Outfit = require("../models/outfit");
const Garment = require('../models/garment');
const Usage = require('../models/usage');

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
    }).populate("garments");

    res.json(outfits);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getOutfitsByDate = async (req, res) => {
  try {

    const outfits = await Outfit.find({
      owner: req.user.userId,
      date: req.params.date
    }).populate("garments");

    res.json(outfits);

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


