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
  name: `calendar-user-${Date.now()}-${Math.random()}`,
  email: `calendar-user-${Date.now()}-${Math.random()}@test.com`,
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

describe('Calendar outfit endpoints', () => {
  test('GET /api/outfits returns calendar-friendly fields', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Calendar Shirt',
      category: 'Tops',
      color: 'Blue',
      imageUrl: '/uploads/calendar-shirt.jpg',
    });

    await Outfit.create({
      owner: user._id,
      name: 'Work Look',
      garments: [garment._id],
      date: new Date('2026-03-18T10:30:00.000Z'),
    });

    const response = await request(app)
      .get('/api/outfits')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].userId).toBe(user._id.toString());
    expect(response.body[0].garmentIds).toEqual([garment._id.toString()]);
    expect(response.body[0].previewImage).toBe('/uploads/calendar-shirt.jpg');
  });

  test('GET /api/outfits/date/:date returns outfits within the same UTC day', async () => {
    const user = await createUser();
    const garment = await Garment.create({
      owner: user._id,
      name: 'Date Filter Top',
      category: 'Tops',
      color: 'Black',
      imageUrl: '/uploads/date-top.jpg',
    });

    await Outfit.create({
      owner: user._id,
      name: 'Morning look',
      garments: [garment._id],
      date: new Date('2026-03-20T05:00:00.000Z'),
    });

    await Outfit.create({
      owner: user._id,
      name: 'Late look',
      garments: [garment._id],
      date: new Date('2026-03-20T23:59:59.000Z'),
    });

    await Outfit.create({
      owner: user._id,
      name: 'Other day',
      garments: [garment._id],
      date: new Date('2026-03-21T01:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/outfits/date/2026-03-20')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
    const names = response.body.map((entry) => entry.name).sort();
    expect(names).toEqual(['Late look', 'Morning look']);
  });
});
