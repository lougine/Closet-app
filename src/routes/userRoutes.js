const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.put('/me/password', userController.updatePassword);
router.put('/me/privacy', userController.updatePrivacy);
router.get('/me/notifications', userController.getNotifications);
router.get('/me/activity', userController.getActivity);

module.exports = router;
