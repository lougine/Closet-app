const express = require("express");
const router = express.Router();

const garmentController = require("../controllers/garmentController");
const authMiddleware = require("../middleware/authMiddleware");
const { imageUploadErrorHandler } = require("../middleware/imageUploadMiddleware");
const {
	searchRateLimit,
	removeBackgroundRateLimit,
} = require('../middleware/rateLimitMiddleware');

router.use(authMiddleware);

router.get("/", garmentController.getGarments);
router.post('/search-images', searchRateLimit, garmentController.searchGarmentReferenceImages);
router.post('/remove-background-url', removeBackgroundRateLimit, garmentController.removeGarmentImageBackgroundByUrl);

router.post(
	"/",
	garmentController.uploadImage,
	imageUploadErrorHandler,
	garmentController.createGarment,
);
router.get("/:id", garmentController.getGarmentById);
router.patch('/:id/preferences', garmentController.updateGarmentPreferences);
router.put('/:id/preferences', garmentController.updateGarmentPreferences);
router.put(
	"/:id",
	garmentController.uploadImage,
	imageUploadErrorHandler,
	garmentController.updateGarment,
);
router.delete("/:id", garmentController.deleteGarment);

module.exports = router;
