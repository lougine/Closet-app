const express = require("express");
const router = express.Router();

const garmentController = require("../controllers/garmentController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", garmentController.createGarment);
router.get("/", garmentController.getGarments);
router.get("/:id", garmentController.getGarmentById);
router.put("/:id", garmentController.updateGarment);
router.delete("/:id", garmentController.deleteGarment);

module.exports = router;
