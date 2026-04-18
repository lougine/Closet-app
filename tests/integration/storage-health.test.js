const request = require('supertest');

describe('storage health endpoint', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('GET /api/health reports degraded when readiness checks fail', async () => {
    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/services/storage', () => ({
      getStorageHealthSnapshot: () => ({
        configuredPrimaryDriver: 'cloudinary',
        effectivePrimaryDriver: 'unavailable',
        keepLocalCopy: true,
        cloudinary: {
          configured: false,
          enabled: false,
          cloudNamePresent: true,
          apiKeyPresent: true,
          apiSecretPresent: true,
        },
        failures: {
          upload: 1,
          read: 0,
          list: 0,
          delete: 0,
          total: 1,
          lastFailureAt: '2026-03-19T00:00:00.000Z',
          lastFailureCode: 'STORAGE_UPLOAD_FAILED',
          lastFailureMessage: 'Storage upload failed: test',
        },
      }),
    }));

    let app;
    jest.isolateModules(() => {
      app = require('../../src/app');
    });

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.mongoReady).toBe(false);
    expect(response.body.checks.storageReady).toBe(false);
    expect(response.body.storage.effectivePrimaryDriver).toBe('unavailable');
    expect(response.body.storage.failures.total).toBe(1);
  });
});
