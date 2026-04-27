const express = require("express");
const router = express.Router();

const outfitController = require("../controllers/outfitController");
const authMiddleware = require("../middleware/authMiddleware");
const { imageUploadErrorHandler } = require('../middleware/imageUploadMiddleware');
const {
	validateDateField,
	validateObjectIdField,
	validatePositiveIntegerQuery,
} = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/randomize', outfitController.getRandomizedOutfit);
router.post('/recommendations', outfitController.getAiRecommendations);
router.post('/chat', outfitController.getStyleChatResponse);
router.post("/", outfitController.createOutfit);
router.get(
	"/",
	validatePositiveIntegerQuery({ field: 'page', min: 1 }),
	validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 100 }),
	outfitController.getOutfits
);
router.get(
	'/date/:date',
	validateDateField({ source: 'params', field: 'date', required: true }),
	validatePositiveIntegerQuery({ field: 'page', min: 1 }),
	validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 100 }),
	outfitController.getOutfitsByDate
);
router.put(
	'/:id',
	validateObjectIdField({ source: 'params', field: 'id', required: true }),
	outfitController.uploadCoverImage,
	imageUploadErrorHandler,
	outfitController.updateOutfit,
);
router.put(
	'/:id/cover',
	validateObjectIdField({ source: 'params', field: 'id', required: true }),
	outfitController.uploadCoverImage,
	imageUploadErrorHandler,
	outfitController.updateOutfitCover,
);
router.delete('/:id', validateObjectIdField({ source: 'params', field: 'id', required: true }), outfitController.deleteOutfit);

module.exports = router;
