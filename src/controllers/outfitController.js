const Outfit = require("../models/outfit");

exports.createOutfit = async (req, res) => {
  try {

    const outfit = new Outfit({
      ...req.body,
      owner: req.user.userId
    });

    await outfit.save();

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

    await Outfit.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    res.json({ message: "Outfit deleted" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


