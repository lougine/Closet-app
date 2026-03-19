const request = require('supertest');

describe('storage health endpoint', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('GET /api/health returns storage status and failure counters', async () => {
    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/services/storage', () => ({
      getStorageHealthSnapshot: () => ({
        configuredPrimaryDriver: 'cloudinary',
        effectivePrimaryDriver: 'cloudinary',
        keepLocalCopy: true,
        cloudinary: {
          configured: true,
          enabled: true,
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

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.storage.effectivePrimaryDriver).toBe('cloudinary');
    expect(response.body.storage.failures.total).toBe(1);
  });
});
