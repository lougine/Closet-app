const Garment = require("../models/garment");

exports.createGarment = async (req, res) => {
  try {

    const garment = new Garment({
      ...req.body,
      owner: req.user.userId
    });

    await garment.save();

    res.status(201).json(garment);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getGarments = async (req, res) => {
  try {

    const { page = 1, limit = 10, category, color } = req.query;

    const filter = {
      owner: req.user.userId
    };

    if (category) filter.category = category;
    if (color) filter.color = color;

    const garments = await Garment.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(garments);

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

    const garment = await Garment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      req.body,
      { new: true }
    );

    if (!garment) {
      return res.status(404).json({ message: "Garment not found" });
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

    res.json({ message: "Garment deleted" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
