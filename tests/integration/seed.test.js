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

const createRequester = async () => User.create({
  name: `requester-${Date.now()}-${Math.random()}`,
  email: `requester-${Date.now()}-${Math.random()}@test.com`,
  password: 'hashed-password',
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.ENABLE_SEED_ENDPOINT = 'true';
  process.env.SEED_API_SECRET = 'seed-secret';

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
  delete process.env.ENABLE_SEED_ENDPOINT;
  delete process.env.SEED_API_SECRET;
});

describe('Seed endpoint', () => {
  test('POST /api/seed/generate-user creates linked data for a generated user', async () => {
    const requester = await createRequester();

    const response = await request(app)
      .post('/api/seed/generate-user')
      .set(authHeader(requester._id.toString()))
      .set('x-seed-secret', process.env.SEED_API_SECRET)
      .send({ profile: 'medium', seed: 'integration-seed' });

    expect(response.status).toBe(201);
    expect(response.body.summary.garmentsCreated).toBe(20);
    expect(response.body.summary.outfitsCreated).toBe(10);
    expect(response.body.summary.calendarEventsCreated).toBe(10);
    expect(response.body.summary.usageEventsCreated).toBeGreaterThan(10);

    const generatedUserId = response.body.user.id;
    const generatedUser = await User.findById(generatedUserId);

    expect(generatedUser).toBeTruthy();
    expect(generatedUser.profilePicture).toMatch(/seed-profile/);
    expect(generatedUser.bannerImage).toMatch(/seed-banner/);
    expect(generatedUser.age).toBeGreaterThan(0);
    expect(generatedUser.heightCm).toBeGreaterThan(0);
    expect(generatedUser.weightKg).toBeGreaterThan(0);
    expect(Array.isArray(generatedUser.stylePreferences)).toBe(true);
    expect(generatedUser.stylePreferences.length).toBeGreaterThan(0);

    const [garmentCount, outfitCount, usageCount] = await Promise.all([
      Garment.countDocuments({ owner: generatedUserId }),
      Outfit.countDocuments({ owner: generatedUserId }),
      Usage.countDocuments({ user: generatedUserId }),
    ]);

    expect(garmentCount).toBe(20);
    expect(outfitCount).toBe(10);
    expect(usageCount).toBe(response.body.summary.usageEventsCreated);

    const outfitsWithDates = await Outfit.countDocuments({
      owner: generatedUserId,
      date: { $ne: null },
    });
    expect(outfitsWithDates).toBe(10);

    const analyticsResponse = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${response.body.credentials.token}`);

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.totalItems).toBe(20);
    expect(analyticsResponse.body.totalWearEvents).toBeGreaterThan(0);
  });

  test('POST /api/seed/generate-user returns 403 when endpoint is disabled', async () => {
    const requester = await createRequester();
    process.env.ENABLE_SEED_ENDPOINT = 'false';

    const response = await request(app)
      .post('/api/seed/generate-user')
      .set(authHeader(requester._id.toString()))
      .set('x-seed-secret', process.env.SEED_API_SECRET)
      .send({ profile: 'medium' });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/disabled/i);

    process.env.ENABLE_SEED_ENDPOINT = 'true';
  });

  test('POST /api/seed/generate-user returns 401 with missing or wrong secret', async () => {
    const requester = await createRequester();

    const missingSecretResponse = await request(app)
      .post('/api/seed/generate-user')
      .set(authHeader(requester._id.toString()))
      .send({ profile: 'medium' });

    expect(missingSecretResponse.status).toBe(401);

    const wrongSecretResponse = await request(app)
      .post('/api/seed/generate-user')
      .set(authHeader(requester._id.toString()))
      .set('x-seed-secret', 'wrong-secret')
      .send({ profile: 'medium' });

    expect(wrongSecretResponse.status).toBe(401);
  });
});
