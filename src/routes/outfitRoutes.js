const express = require("express");
const router = express.Router();

const outfitController = require("../controllers/outfitController");
const authMiddleware = require("../middleware/authMiddleware");
const {
	validateDateField,
	validateObjectIdField,
} = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/randomize', outfitController.getRandomizedOutfit);
router.post('/recommendations', outfitController.getAiRecommendations);
router.post("/", outfitController.createOutfit);
router.get("/", outfitController.getOutfits);
router.get('/date/:date', validateDateField({ source: 'params', field: 'date', required: true }), outfitController.getOutfitsByDate);
router.delete('/:id', validateObjectIdField({ source: 'params', field: 'id', required: true }), outfitController.deleteOutfit);

module.exports = router;
