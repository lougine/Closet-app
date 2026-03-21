const express = require('express');

const communityController = require('../controllers/communityController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateObjectIdField,
  validatePositiveIntegerQuery,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/feed',
  validatePositiveIntegerQuery({ field: 'page', min: 1 }),
  validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 50 }),
  communityController.getFeed
);

router.post('/posts', communityController.createPost);

router.post(
  '/posts/:postId/like',
  validateObjectIdField({ source: 'params', field: 'postId', required: true }),
  communityController.toggleLike
);

router.get(
  '/posts/:postId/comments',
  validateObjectIdField({ source: 'params', field: 'postId', required: true }),
  validatePositiveIntegerQuery({ field: 'page', min: 1 }),
  validatePositiveIntegerQuery({ field: 'limit', min: 1, max: 100 }),
  communityController.getComments
);

router.post(
  '/posts/:postId/comments',
  validateObjectIdField({ source: 'params', field: 'postId', required: true }),
  communityController.addComment
);

router.post(
  '/posts/:postId/vote',
  validateObjectIdField({ source: 'params', field: 'postId', required: true }),
  communityController.voteOnPoll
);

module.exports = router;
