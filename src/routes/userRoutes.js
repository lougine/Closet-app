const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { imageUploadErrorHandler } = require('../middleware/imageUploadMiddleware');

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.get('/me/friends', userController.getMyFriends);
router.get('/search', userController.searchUsers);
router.put('/me', userController.updateMe);
router.put(
	'/me/profile-image',
	userController.uploadProfileImage,
	imageUploadErrorHandler,
	userController.updateProfileImage,
);
router.put(
	'/me/banner-image',
	userController.uploadBannerImage,
	imageUploadErrorHandler,
	userController.updateBannerImage,
);
router.put('/me/banner-preset', userController.updateBannerPreset);
router.put('/me/password', userController.updatePassword);
router.put('/me/privacy', userController.updatePrivacy);
router.get('/me/notifications', userController.getNotifications);
router.get('/me/activity', userController.getActivity);
router.post('/:userId/follow', userController.toggleFollowUser);

module.exports = router;
