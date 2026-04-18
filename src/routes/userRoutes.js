const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { imageUploadErrorHandler } = require('../middleware/imageUploadMiddleware');
const { validateObjectIdField } = require('../middleware/validationMiddleware');

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.get('/me/friends', userController.getMyFriends);
router.get('/search', userController.searchUsers);
router.get(
	'/:userId/profile',
	validateObjectIdField({ source: 'params', field: 'userId', required: true }),
	userController.getPublicProfile,
);
router.get(
	'/:userId/garments',
	validateObjectIdField({ source: 'params', field: 'userId', required: true }),
	userController.getPublicUserGarments,
);
router.get(
	'/:userId/posts',
	validateObjectIdField({ source: 'params', field: 'userId', required: true }),
	userController.getPublicUserPosts,
);
router.post(
	'/:userId/style-outfits',
	validateObjectIdField({ source: 'params', field: 'userId', required: true }),
	userController.createStyledOutfitForUser,
);
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
router.put('/me/notifications', userController.updateNotificationSettings);
router.get('/me/activity', userController.getActivity);
router.post('/:userId/follow', userController.toggleFollowUser);

module.exports = router;
