const mongoose = require('mongoose');
const Garment = require("../models/garment");
const Usage = require('../models/usage');
const { createImageUpload } = require("../middleware/imageUploadMiddleware");
const { deleteImageByUrl } = require("../utils/imageFileUtils");
const { buildImageMetadata } = require('../utils/imageMetadata');

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
      garmentData.imageMetadata = buildImageMetadata(req.file, garmentData.imageUrl);
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

    const ownerObjectId = new mongoose.Types.ObjectId(req.user.userId);

    const garments = await Garment.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const garmentIds = garments.map((garment) => garment._id);
    let wearCountsByGarmentId = new Map();

    if (garmentIds.length > 0) {
      const usageCounts = await Usage.aggregate([
        {
          $match: {
            user: ownerObjectId,
            garment: { $in: garmentIds },
          },
        },
        {
          $group: {
            _id: '$garment',
            count: { $sum: 1 },
          },
        },
      ]);

      wearCountsByGarmentId = new Map(
        usageCounts.map((row) => [String(row._id), row.count])
      );
    }

    const garmentsWithWearCount = garments.map((garment) => ({
      ...garment,
      wearCount: wearCountsByGarmentId.get(String(garment._id)) || 0,
    }));

    res.json(garmentsWithWearCount);

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

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'imageUrl') && !req.body.imageUrl) {
      garment.imageMetadata = null;
    }

    if (req.file) {
      garment.imageUrl = `/uploads/${req.file.filename}`;
      garment.imageMetadata = buildImageMetadata(req.file, garment.imageUrl);
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
