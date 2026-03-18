const Garment = require("../models/garment");
const { createImageUpload } = require("../middleware/imageUploadMiddleware");
const { deleteImageByUrl } = require("../utils/imageFileUtils");

exports.uploadImage = createImageUpload("image");

exports.createGarment = async (req, res) => {
  try {
    const garmentData = {
      ...req.body,
      owner: req.user.userId
    };

    // If an image was uploaded, add the path to the garment data
    if (req.file) {
      garmentData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const garment = new Garment(garmentData);
    await garment.save();

    res.status(201).json(garment);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getGarments = async (req, res) => {
  try {

    const { page = 1, limit = 10, category, color } = req.query;

    const filter = { owner: req.user.userId };

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
    const garment = await Garment.findOne({
      _id: req.params.id,
      owner: req.user.userId,
    });

    if (!garment) {
      if (req.file) {
        await deleteImageByUrl(`/uploads/${req.file.filename}`);
      }
      return res.status(404).json({ message: "Garment not found" });
    }

    const previousImageUrl = garment.imageUrl;

    Object.assign(garment, req.body);
    if (req.file) {
      garment.imageUrl = `/uploads/${req.file.filename}`;
    }

    await garment.save();

    if (req.file && previousImageUrl && previousImageUrl !== garment.imageUrl) {
      await deleteImageByUrl(previousImageUrl);
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

    if (garment.imageUrl) {
      await deleteImageByUrl(garment.imageUrl);
    }

    res.json({ message: "Garment deleted" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
