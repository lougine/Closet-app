const jwt = require('jsonwebtoken');
const request = require('supertest');

const TEST_JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';

const buildAuthHeader = () => {
  const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, TEST_JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
};

const loadAppWithMockedDb = () => {
  jest.resetModules();
  global.__DIGITAL_WARDROBE_ENV_LOADED__ = true;
  jest.doMock('../../src/config/db', () => jest.fn(async () => {}));

  let app;
  jest.isolateModules(() => {
    app = require('../../src/app');
  });

  return app;
};

describe('Hardening guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      JWT_SECRET: TEST_JWT_SECRET,
      RATE_LIMIT_AUTH_MAX: '1',
      REMOVE_BG_API_KEY: 'test-remove-bg-key',
      REMOVE_BG_ALLOWED_IMAGE_HOSTS: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    delete global.__DIGITAL_WARDROBE_ENV_LOADED__;
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('POST /api/garments/remove-background-url rejects private/loopback host URLs', async () => {
    const app = loadAppWithMockedDb();

    const response = await request(app)
      .post('/api/garments/remove-background-url')
      .set(buildAuthHeader())
      .send({ imageUrl: 'https://127.0.0.1/test.png' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/private|loopback/i);
  });

  test('POST /api/auth/login enforces auth rate limit', async () => {
    const app = loadAppWithMockedDb();

    const firstAttempt = await request(app)
      .post('/api/auth/login')
      .send({});

    const secondAttempt = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(firstAttempt.status).toBe(400);
    expect(secondAttempt.status).toBe(429);
    expect(secondAttempt.body.message).toMatch(/too many authentication attempts/i);
  });

  test('GET /api/outfits rejects limit above route max', async () => {
    const app = loadAppWithMockedDb();

    const response = await request(app)
      .get('/api/outfits?limit=101&page=1')
      .set(buildAuthHeader());

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/between 1 and 100/i);
  });
});