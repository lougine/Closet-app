const express = require("express");
const router = express.Router();

const outfitController = require("../controllers/outfitController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", outfitController.createOutfit);
router.get("/", outfitController.getOutfits);
router.get("/date/:date", outfitController.getOutfitsByDate);
router.delete("/:id", outfitController.deleteOutfit);

module.exports = router;
