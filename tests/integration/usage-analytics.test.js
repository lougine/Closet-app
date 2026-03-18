const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../src/models/user');
const Garment = require('../../src/models/garment');
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

const createUser = async () => {
  const user = await User.create({
    name: `user-${Date.now()}-${Math.random()}`,
    email: `user-${Date.now()}-${Math.random()}@test.com`,
    password: 'hashed-password',
  });
  return user;
};

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
    Usage.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Usage endpoints', () => {
  test('POST /api/usage/log returns 400 for invalid garmentId', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({ garmentId: 'bad-id' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/garmentId/i);
  });

  test('POST /api/usage/log and GET /api/usage/history work with valid data', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Denim Jacket',
      category: 'Outerwear',
      color: 'Blue',
      purchasePrice: 120,
    });

    const createResponse = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({ garmentId: garment._id.toString(), wornDate: '2026-03-01' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.garment.toString()).toBe(garment._id.toString());

    const historyResponse = await request(app)
      .get('/api/usage/history')
      .set(authHeader(user._id.toString()))
      .query({ garmentId: garment._id.toString(), startDate: '2026-01-01', endDate: '2026-12-31' });

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.events).toHaveLength(1);
    expect(historyResponse.body.pagination.total).toBe(1);
  });

  test('GET /api/usage/history returns 400 for invalid startDate', async () => {
    const user = await createUser();

    const response = await request(app)
      .get('/api/usage/history')
      .set(authHeader(user._id.toString()))
      .query({ startDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/startDate/i);
  });
});

describe('Analytics endpoints', () => {
  test('GET /api/analytics/cost-per-wear returns computed data', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Black Blazer',
      category: 'Outerwear',
      color: 'Black',
      purchasePrice: 200,
    });

    await Usage.create({
      user: user._id,
      garment: garment._id,
      wornDate: new Date('2026-02-01'),
    });
    await Usage.create({
      user: user._id,
      garment: garment._id,
      wornDate: new Date('2026-02-12'),
    });

    const response = await request(app)
      .get('/api/analytics/cost-per-wear?limit=10')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.summary.trackedItems).toBe(1);
    expect(response.body.items[0].wearCount).toBe(2);
    expect(response.body.items[0].costPerWear).toBe(100);
  });

  test('GET /api/analytics/usage-trends returns grouped trend data', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'White Tee',
      category: 'Tops',
      color: 'White',
      purchasePrice: 40,
    });

    const now = new Date();
    const thisMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
    const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 12));
    const twoMonthsAgoDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 18));

    await Usage.insertMany([
      { user: user._id, garment: garment._id, wornDate: twoMonthsAgoDate },
      { user: user._id, garment: garment._id, wornDate: previousMonthDate },
      { user: user._id, garment: garment._id, wornDate: thisMonthDate },
    ]);

    const response = await request(app)
      .get('/api/analytics/usage-trends?months=12')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.monthly)).toBe(true);
    expect(Array.isArray(response.body.dayOfWeek)).toBe(true);
    expect(Array.isArray(response.body.byCategory)).toBe(true);
    expect(response.body.monthly).toHaveLength(12);
    expect(response.body.dayOfWeek).toHaveLength(7);
    expect(response.body.summary.totalWearEventsInRange).toBe(3);
    expect(response.body.byCategory[0].category).toBe('Tops');
  });

  test('GET /api/analytics/usage-trends returns 400 for invalid months', async () => {
    const user = await createUser();

    const response = await request(app)
      .get('/api/analytics/usage-trends?months=abc')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/months/i);
  });
});
