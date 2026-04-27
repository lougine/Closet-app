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

  test('POST /api/usage/log returns 400 for invalid eventStatus', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Validation Tee',
      category: 'Tops',
      color: 'White',
    });

    const response = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({
        garmentId: garment._id.toString(),
        eventStatus: 'maybe',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/eventStatus/i);
  });

  test('POST /api/usage/bulk-log returns 400 for invalid eventLocalDate', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Validation Pants',
      category: 'Bottoms',
      color: 'Black',
    });

    const response = await request(app)
      .post('/api/usage/bulk-log')
      .set(authHeader(user._id.toString()))
      .send({
        garmentIds: [garment._id.toString()],
        eventLocalDate: '2026-02-30',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/eventLocalDate/i);
  });

  test('POST /api/usage/log returns 400 for non-worn event without date', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Validation Coat',
      category: 'Outerwear',
      color: 'Brown',
    });

    const response = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({
        garmentId: garment._id.toString(),
        eventStatus: 'scheduled',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/wornDate|eventLocalDate/i);
  });

  test('POST /api/usage/log returns 400 for cancelled event with outfitId', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Validation Skirt',
      category: 'Bottoms',
      color: 'Red',
    });
    const outfit = await Outfit.create({
      owner: user._id,
      name: 'Cancelled Look',
      garments: [garment._id],
      isLookbook: false,
    });

    const response = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({
        garmentId: garment._id.toString(),
        outfitId: outfit._id.toString(),
        eventStatus: 'cancelled',
        eventLocalDate: '2026-04-17',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/outfitId/i);
  });

  test('POST /api/usage/log derives wornDate from eventLocalDate for non-worn events', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Scheduled Shirt',
      category: 'Tops',
      color: 'Blue',
    });

    const response = await request(app)
      .post('/api/usage/log')
      .set(authHeader(user._id.toString()))
      .send({
        garmentId: garment._id.toString(),
        eventStatus: 'scheduled',
        eventLocalDate: '2026-04-20',
      });

    expect(response.status).toBe(201);
    expect(response.body.eventStatus).toBe('scheduled');
    expect(response.body.eventLocalDate).toBe('2026-04-20');
    expect(response.body.wornDate.slice(0, 10)).toBe('2026-04-20');
  });
});

describe('Analytics endpoints', () => {
  test('GET /api/analytics/overview derives wear metrics from worn usage events', async () => {
    const user = await createUser();
    const garmentA = await Garment.create({
      owner: user._id,
      name: 'Cream Tee',
      category: 'Tops',
      color: 'White',
      purchasePrice: 30,
    });
    const garmentB = await Garment.create({
      owner: user._id,
      name: 'Navy Pants',
      category: 'Bottoms',
      color: 'Blue',
      purchasePrice: 70,
    });

    const wornOutfit = await Outfit.create({
      owner: user._id,
      name: 'Office Outfit',
      garments: [garmentA._id, garmentB._id],
      date: new Date('2026-03-10T00:00:00.000Z'),
      isLookbook: false,
    });

    await Outfit.create({
      owner: user._id,
      name: 'Unworn Outfit',
      garments: [garmentA._id],
      date: new Date('2026-03-11T00:00:00.000Z'),
      isLookbook: false,
    });

    const lookbookOutfit = await Outfit.create({
      owner: user._id,
      name: 'Moodboard',
      garments: [garmentB._id],
      date: new Date('2026-03-12T00:00:00.000Z'),
      isLookbook: true,
    });

    await Usage.create({
      user: user._id,
      garment: garmentA._id,
      outfit: wornOutfit._id,
      wornDate: new Date('2026-03-10T00:00:00.000Z'),
    });

    // Lookbook/non-lookbook is not part of wear-event counting semantics.
    await Usage.create({
      user: user._id,
      garment: garmentB._id,
      outfit: lookbookOutfit._id,
      wornDate: new Date('2026-03-12T00:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(response.body.totalOutfits).toBe(2);
    expect(response.body.outfitsWorn).toBe(2);
    expect(response.body.wardrobeUsagePercent).toBe(100);
    expect(response.body.totalWearEvents).toBe(2);
  });

  test('GET /api/analytics/overview counts saved outfits even when undated', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Grey Tee',
      category: 'Tops',
      color: 'Grey',
      purchasePrice: 25,
    });

    const undatedOutfit = await Outfit.create({
      owner: user._id,
      name: 'Undated Plan',
      garments: [garment._id],
      isLookbook: false,
    });

    await Usage.create({
      user: user._id,
      garment: garment._id,
      outfit: undatedOutfit._id,
      wornDate: new Date('2026-03-05T00:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(response.body.totalOutfits).toBe(1);
    expect(response.body.outfitsWorn).toBe(1);
    expect(response.body.wardrobeUsagePercent).toBe(100);
    expect(response.body.totalWearEvents).toBe(1);
  });

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
    const thisMonthOutfit = await Outfit.create({
      owner: user._id,
      name: 'This month look',
      garments: [garment._id],
      date: thisMonthDate,
      isLookbook: false,
    });
    const previousMonthOutfit = await Outfit.create({
      owner: user._id,
      name: 'Previous month look',
      garments: [garment._id],
      date: previousMonthDate,
      isLookbook: false,
    });
    const twoMonthsAgoOutfit = await Outfit.create({
      owner: user._id,
      name: 'Two months ago look',
      garments: [garment._id],
      date: twoMonthsAgoDate,
      isLookbook: false,
    });
    const undatedOutfit = await Outfit.create({
      owner: user._id,
      name: 'Planned look',
      garments: [garment._id],
      isLookbook: false,
    });

    await Usage.insertMany([
      { user: user._id, garment: garment._id, outfit: twoMonthsAgoOutfit._id, wornDate: twoMonthsAgoDate },
      { user: user._id, garment: garment._id, outfit: previousMonthOutfit._id, wornDate: previousMonthDate },
      { user: user._id, garment: garment._id, outfit: thisMonthOutfit._id, wornDate: thisMonthDate },
      { user: user._id, garment: garment._id, outfit: undatedOutfit._id, wornDate: thisMonthDate },
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
    expect(response.body.summary.totalWearEventsInRange).toBe(4);
    expect(response.body.byCategory[0].category).toBe('Tops');
  });

  test('GET /api/analytics most/least/never worn count worn usage events regardless of outfit date', async () => {
    const user = await createUser();
    const datedGarment = await Garment.create({
      owner: user._id,
      name: 'Dated Shirt',
      category: 'Tops',
      color: 'Blue',
    });
    const undatedGarment = await Garment.create({
      owner: user._id,
      name: 'Planned Pants',
      category: 'Bottoms',
      color: 'Black',
    });

    const datedOutfit = await Outfit.create({
      owner: user._id,
      name: 'Worn Outfit',
      garments: [datedGarment._id],
      date: new Date('2026-03-15T00:00:00.000Z'),
      isLookbook: false,
    });
    const undatedOutfit = await Outfit.create({
      owner: user._id,
      name: 'Planned Outfit',
      garments: [undatedGarment._id],
      isLookbook: false,
    });

    await Usage.insertMany([
      {
        user: user._id,
        garment: datedGarment._id,
        outfit: datedOutfit._id,
        wornDate: new Date('2026-03-15T00:00:00.000Z'),
      },
      {
        user: user._id,
        garment: undatedGarment._id,
        outfit: undatedOutfit._id,
        wornDate: new Date('2026-03-16T00:00:00.000Z'),
      },
    ]);

    const headers = authHeader(user._id.toString());

    const [mostWornRes, leastWornRes, neverWornRes] = await Promise.all([
      request(app).get('/api/analytics/most-worn?limit=10').set(headers),
      request(app).get('/api/analytics/least-worn?limit=10').set(headers),
      request(app).get('/api/analytics/never-worn?limit=10').set(headers),
    ]);

    expect(mostWornRes.status).toBe(200);
    expect(leastWornRes.status).toBe(200);
    expect(neverWornRes.status).toBe(200);

    expect(mostWornRes.body.some((item) => item.name === 'Planned Pants')).toBe(true);
    expect(leastWornRes.body.some((item) => item.name === 'Planned Pants')).toBe(true);
    expect(neverWornRes.body.some((item) => item.name === 'Planned Pants')).toBe(false);
  });

  test('GET /api/analytics wear rankings fall back to dated outfits when usage events are missing', async () => {
    const user = await createUser();
    const wornViaCalendar = await Garment.create({
      owner: user._id,
      name: 'Calendar Blouse',
      category: 'Tops',
      color: 'Ivory',
    });
    const neverWorn = await Garment.create({
      owner: user._id,
      name: 'Unworn Shorts',
      category: 'Bottoms',
      color: 'Khaki',
    });

    await Outfit.create({
      owner: user._id,
      name: 'Calendar Outfit',
      garments: [wornViaCalendar._id],
      date: new Date('2026-03-20T00:00:00.000Z'),
      isLookbook: false,
    });

    const headers = authHeader(user._id.toString());

    const [mostWornRes, neverWornRes] = await Promise.all([
      request(app).get('/api/analytics/most-worn?limit=10').set(headers),
      request(app).get('/api/analytics/never-worn?limit=10').set(headers),
    ]);

    expect(mostWornRes.status).toBe(200);
    expect(neverWornRes.status).toBe(200);

    expect(mostWornRes.body.some((item) => item.name === 'Calendar Blouse')).toBe(true);
    expect(neverWornRes.body.some((item) => item.name === 'Calendar Blouse')).toBe(false);
    expect(neverWornRes.body.some((item) => item.name === 'Unworn Shorts')).toBe(true);
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
