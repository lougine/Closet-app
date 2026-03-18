const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../src/models/user');
const Garment = require('../../src/models/garment');
const Outfit = require('../../src/models/outfit');
const Usage = require('../../src/models/usage');

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
  name: `styling-user-${Date.now()}-${Math.random()}`,
  email: `styling-user-${Date.now()}-${Math.random()}@test.com`,
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
    Usage.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Styling outfit endpoints', () => {
  test('GET /api/outfits/randomize returns wardrobe-based outfit', async () => {
    const user = await createUser();

    await Garment.insertMany([
      {
        owner: user._id,
        name: 'White Shirt',
        category: 'Tops',
        color: 'White',
        season: 'spring',
      },
      {
        owner: user._id,
        name: 'Blue Jeans',
        category: 'Bottoms',
        color: 'Blue',
        season: 'spring',
      },
      {
        owner: user._id,
        name: 'White Sneakers',
        category: 'Footwear',
        color: 'White',
        season: 'summer',
      },
      {
        owner: user._id,
        name: 'Black Blazer',
        category: 'Outerwear',
        color: 'Black',
        season: 'fall',
      },
    ]);

    const response = await request(app)
      .get('/api/outfits/randomize?count=4')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBe(4);
    expect(response.body.meta.mode).toBe('randomized');
  });

  test('GET /api/outfits/randomize returns 400 for invalid count', async () => {
    const user = await createUser();

    const response = await request(app)
      .get('/api/outfits/randomize?count=abc')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/count/i);
  });

  test('POST /api/outfits/recommendations returns scored recommendations', async () => {
    const user = await createUser();

    await Garment.insertMany([
      {
        owner: user._id,
        name: 'Silk Blouse',
        category: 'Tops',
        color: 'White',
        season: 'spring',
      },
      {
        owner: user._id,
        name: 'Tailored Pants',
        category: 'Bottoms',
        color: 'Black',
        season: 'spring',
      },
      {
        owner: user._id,
        name: 'Heels',
        category: 'Footwear',
        color: 'Black',
        season: 'spring',
      },
      {
        owner: user._id,
        name: 'Beige Trench',
        category: 'Outerwear',
        color: 'Beige',
        season: 'fall',
      },
      {
        owner: user._id,
        name: 'Red Bag',
        category: 'Accessories',
        color: 'Red',
        season: 'summer',
      },
    ]);

    const response = await request(app)
      .post('/api/outfits/recommendations')
      .set(authHeader(user._id.toString()))
      .send({
        event: 'Office meeting',
        temperatureC: 18,
        count: 2,
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.recommendations)).toBe(true);
    expect(response.body.recommendations.length).toBeGreaterThan(0);
    expect(response.body.recommendations[0]).toHaveProperty('score');
    expect(response.body.recommendations[0]).toHaveProperty('garments');
    expect(Array.isArray(response.body.recommendations[0].garments)).toBe(true);
  });

  test('POST /api/outfits/recommendations returns 400 for invalid temperature', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/api/outfits/recommendations')
      .set(authHeader(user._id.toString()))
      .send({
        event: 'Dinner',
        temperatureC: 'warm',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/temperatureC/i);
  });
});
