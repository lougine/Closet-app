const Garment = require("../models/garment");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

exports.uploadImage = upload.single('image');

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
    const updateData = { ...req.body };

    // If a new image was uploaded, update the imageUrl
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const garment = await Garment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      updateData,
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
