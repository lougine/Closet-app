const express = require("express");
const router = express.Router();

const garmentController = require("../controllers/garmentController");
const authMiddleware = require("../middleware/authMiddleware");

// Temporarily allow GET without auth for testing
router.get("/", garmentController.getGarments);

router.use(authMiddleware);

router.post("/", garmentController.uploadImage, garmentController.createGarment);
router.get("/:id", garmentController.getGarmentById);
router.put("/:id", garmentController.uploadImage, garmentController.updateGarment);
router.delete("/:id", garmentController.deleteGarment);

module.exports = router;
