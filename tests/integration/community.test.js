const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../src/models/user');
const CommunityPost = require('../../src/models/communityPost');
const CommunityComment = require('../../src/models/communityComment');
const Garment = require('../../src/models/garment');
const Outfit = require('../../src/models/outfit');

let mongoServer;
let app;

const waitForConnection = async () => {
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i += 1) {
    if (mongoose.connection.readyState === 1) return;
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  throw new Error('MongoDB connection was not established in time');
};

const authHeader = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
};

const createUser = async () => User.create({
  name: `community-user-${Date.now()}-${Math.random()}`,
  email: `community-user-${Date.now()}-${Math.random()}@test.com`,
  password: 'hashed-password',
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';

  app = require('../../src/app');
  await waitForConnection();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Garment.deleteMany({}),
    Outfit.deleteMany({}),
    CommunityPost.deleteMany({}),
    CommunityComment.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Community endpoints', () => {
  test('GET /api/users/search supports @username query in community user search', async () => {
    const me = await createUser();
    const other = await User.create({
      name: `stylebuddy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: `stylebuddy-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      password: 'hashed-password',
    });

    const response = await request(app)
      .get(`/api/users/search?q=@${encodeURIComponent(other.name)}`)
      .set(authHeader(me._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].username).toBe(other.name);
  });

  test('GET /api/community/users/search supports username lookups', async () => {
    const me = await createUser();
    const other = await User.create({
      name: `closetfriend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: `closetfriend-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      password: 'hashed-password',
    });

    const response = await request(app)
      .get(`/api/community/users/search?q=${encodeURIComponent(other.name)}`)
      .set(authHeader(me._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0].username).toBe(other.name);
  });

  test('GET /api/users/:userId/profile returns public profile fields', async () => {
    const me = await createUser();
    const other = await User.create({
      name: `publicprofile-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: `publicprofile-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      password: 'hashed-password',
      followers: [me._id],
      bio: 'Streetwear lover and capsule closet builder.',
    });

    const response = await request(app)
      .get(`/api/users/${other._id}/profile`)
      .set(authHeader(me._id.toString()));

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(other._id.toString());
    expect(response.body.username).toBe(other.name);
    expect(response.body.followerCount).toBe(1);
    expect(response.body.followingCount).toBe(0);
    expect(response.body.isMe).toBe(false);
    expect(response.body.bio).toMatch(/streetwear/i);
  });

  test('GET /api/users/:userId/garments and /posts return public data', async () => {
    const me = await createUser();
    const other = await createUser();

    await Garment.create({
      owner: other._id,
      name: 'Black Blazer',
      category: 'outerwear',
      color: 'black',
      imageUrl: 'https://example.com/blazer.jpg',
    });

    await CommunityPost.create({
      author: other._id,
      type: 'post',
      caption: 'Office fit check',
      imageUrl: 'https://example.com/outfit.jpg',
    });

    const garmentsResponse = await request(app)
      .get(`/api/users/${other._id}/garments?limit=10&page=1`)
      .set(authHeader(me._id.toString()));

    expect(garmentsResponse.status).toBe(200);
    expect(Array.isArray(garmentsResponse.body.items)).toBe(true);
    expect(garmentsResponse.body.items.length).toBeGreaterThan(0);
    expect(garmentsResponse.body.items[0].name).toBe('Black Blazer');

    const postsResponse = await request(app)
      .get(`/api/users/${other._id}/posts?limit=10&page=1`)
      .set(authHeader(me._id.toString()));

    expect(postsResponse.status).toBe(200);
    expect(Array.isArray(postsResponse.body.items)).toBe(true);
    expect(postsResponse.body.items.length).toBeGreaterThan(0);
    expect(postsResponse.body.items[0].caption).toBe('Office fit check');
  });

  test('POST /api/users/:userId/style-outfits creates styled outfit and optional shared post', async () => {
    const me = await createUser();
    const other = await createUser();

    const [top, bottom] = await Garment.create([
      {
        owner: other._id,
        name: 'White Tee',
        category: 'top',
        color: 'white',
        imageUrl: 'https://example.com/tee.jpg',
      },
      {
        owner: other._id,
        name: 'Blue Jeans',
        category: 'bottom',
        color: 'blue',
        imageUrl: 'https://example.com/jeans.jpg',
      },
    ]);

    const response = await request(app)
      .post(`/api/users/${other._id}/style-outfits`)
      .set(authHeader(me._id.toString()))
      .send({
        name: 'Weekend Casual',
        garments: [top._id, bottom._id],
        styleNote: 'Clean, comfortable, and easy to layer.',
        shareWithProfileOwner: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Weekend Casual');
    expect(response.body.styledFor).toBe(other._id.toString());
    expect(response.body.isSharedWithStyledUser).toBe(true);
    expect(response.body.sharedPostId).toBeTruthy();

    const savedOutfit = await Outfit.findById(response.body._id);
    expect(savedOutfit).toBeTruthy();
    expect(savedOutfit.styledFor.toString()).toBe(other._id.toString());

    const notificationsResponse = await request(app)
      .get('/api/users/me/notifications')
      .set(authHeader(other._id.toString()));

    expect(notificationsResponse.status).toBe(200);
    expect(Array.isArray(notificationsResponse.body.notifications)).toBe(true);
    expect(notificationsResponse.body.notifications.length).toBeGreaterThan(0);
    expect(notificationsResponse.body.notifications[0].type).toBe('styled_outfit_shared');
    expect(notificationsResponse.body.notifications[0].actor._id).toBe(me._id.toString());
  });

  test('POST /api/community/posts and GET /api/community/feed return created post', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({
        type: 'post',
        caption: 'Today fit check',
        tags: ['streetwear'],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.caption).toBe('Today fit check');
    expect(createResponse.body.type).toBe('post');

    const feedResponse = await request(app)
      .get('/api/community/feed?filter=for-you')
      .set(authHeader(user._id.toString()));

    expect(feedResponse.status).toBe(200);
    expect(Array.isArray(feedResponse.body.items)).toBe(true);
    expect(feedResponse.body.items).toHaveLength(1);
    expect(feedResponse.body.items[0].caption).toBe('Today fit check');
  });

  test('POST /api/community/posts/:postId/like toggles like state', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({ caption: 'Like me' });

    const postId = createResponse.body._id;

    const firstLike = await request(app)
      .post(`/api/community/posts/${postId}/like`)
      .set(authHeader(user._id.toString()));

    expect(firstLike.status).toBe(200);
    expect(firstLike.body.likedByMe).toBe(true);
    expect(firstLike.body.likeCount).toBe(1);

    const secondLike = await request(app)
      .post(`/api/community/posts/${postId}/like`)
      .set(authHeader(user._id.toString()));

    expect(secondLike.status).toBe(200);
    expect(secondLike.body.likedByMe).toBe(false);
    expect(secondLike.body.likeCount).toBe(0);
  });

  test('POST /api/community/posts/:postId/comments and GET comments works', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({ caption: 'Comment on me' });

    const postId = createResponse.body._id;

    const addCommentResponse = await request(app)
      .post(`/api/community/posts/${postId}/comments`)
      .set(authHeader(user._id.toString()))
      .send({ text: 'Love this look' });

    expect(addCommentResponse.status).toBe(201);
    expect(addCommentResponse.body.text).toBe('Love this look');

    const commentsResponse = await request(app)
      .get(`/api/community/posts/${postId}/comments`)
      .set(authHeader(user._id.toString()));

    expect(commentsResponse.status).toBe(200);
    expect(Array.isArray(commentsResponse.body.items)).toBe(true);
    expect(commentsResponse.body.items).toHaveLength(1);
    expect(commentsResponse.body.items[0].text).toBe('Love this look');

    const updatedPost = await CommunityPost.findById(postId);
    expect(updatedPost.commentsCount).toBe(1);
  });

  test('GET /api/community/feed?filter=polls returns only poll posts', async () => {
    const user = await createUser();

    const pollResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({
        type: 'poll',
        caption: 'Help me pick',
        poll: {
          question: 'What should I wear?',
          options: ['Leather jacket', 'Denim jacket'],
        },
      });

    expect(pollResponse.status).toBe(201);

    const regularPostResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({ caption: 'Non poll post' });

    expect(regularPostResponse.status).toBe(201);

    const feedResponse = await request(app)
      .get('/api/community/feed?filter=polls')
      .set(authHeader(user._id.toString()));

    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.items).toHaveLength(1);
    expect(feedResponse.body.items[0].type).toBe('poll');
    expect(feedResponse.body.items[0].poll.question).toBe('What should I wear?');
  });

  test('POST /api/community/posts/:postId/vote records poll vote', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/community/posts')
      .set(authHeader(user._id.toString()))
      .send({
        type: 'poll',
        caption: 'Vote test',
        poll: {
          question: 'Pick one',
          options: ['Option A', 'Option B'],
        },
      });

    const postId = createResponse.body._id;

    const voteResponse = await request(app)
      .post(`/api/community/posts/${postId}/vote`)
      .set(authHeader(user._id.toString()))
      .send({ optionIndex: 1 });

    expect(voteResponse.status).toBe(200);
    expect(voteResponse.body.poll.options[1].votes).toBe(1);
    expect(voteResponse.body.poll.options[1].votedByMe).toBe(true);
    expect(voteResponse.body.poll.options[0].votes).toBe(0);
  });
});
