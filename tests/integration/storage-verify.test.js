describe('storage verify script', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('runVerify reports malformed and missing violations in primary mode', async () => {
    global.fetch = jest.fn(async () => ({ ok: false }));

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/config/upload', () => ({ STORAGE_PRIMARY_DRIVER: 'local' }));
    jest.doMock('../../scripts/storage-reference-utils', () => ({
      collectImageReferences: jest.fn(async () => ([
        {
          modelLabel: 'Garment',
          docIdString: '1',
          field: 'imageUrl',
          imageUrl: '/uploads/ok.png',
          filename: 'ok.png',
        },
        {
          modelLabel: 'Outfit',
          docIdString: '2',
          field: 'previewImage',
          imageUrl: 'https://bad-url',
          filename: null,
        },
      ])),
    }));
    jest.doMock('../../src/utils/imageFileUtils', () => ({
      resolveUploadPath: jest.fn((filename) => `C:/tmp/${filename}`),
    }));
    jest.doMock('fs/promises', () => ({
      access: jest.fn(async (filePath) => {
        if (String(filePath).includes('ok.png')) return;
        throw new Error('ENOENT');
      }),
    }));
    jest.doMock('../../src/services/storage/drivers/cloudinaryStorageDriver', () => ({
      isEnabled: () => true,
      getManagedReadUrl: jest.fn(async (filename) => `https://example.com/${filename}`),
    }));

    const { runVerify } = require('../../scripts/verify-storage-integrity');
    const summary = await runVerify({ requireMode: 'primary' });

    expect(summary.requireMode).toBe('primary');
    expect(summary.referencesScanned).toBe(2);
    expect(summary.violationsCount).toBe(1);
    expect(summary.violations[0].type).toBe('malformed-url');
  });

  test('runVerify require=all fails when cloud copy missing', async () => {
    global.fetch = jest.fn(async () => ({ ok: false }));

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/config/upload', () => ({ STORAGE_PRIMARY_DRIVER: 'local' }));
    jest.doMock('../../scripts/storage-reference-utils', () => ({
      collectImageReferences: jest.fn(async () => ([
        {
          modelLabel: 'User',
          docIdString: '3',
          field: 'profilePicture',
          imageUrl: '/uploads/p.png',
          filename: 'p.png',
        },
      ])),
    }));
    jest.doMock('../../src/utils/imageFileUtils', () => ({
      resolveUploadPath: jest.fn(() => 'C:/tmp/p.png'),
    }));
    jest.doMock('fs/promises', () => ({
      access: jest.fn(async () => {}),
    }));
    jest.doMock('../../src/services/storage/drivers/cloudinaryStorageDriver', () => ({
      isEnabled: () => true,
      getManagedReadUrl: jest.fn(async () => 'https://example.com/p.png'),
    }));

    const { runVerify } = require('../../scripts/verify-storage-integrity');
    const summary = await runVerify({ requireMode: 'all' });

    expect(summary.violationsCount).toBe(1);
    expect(summary.violations[0].type).toBe('missing-file');
    expect(summary.violations[0].requireMode).toBe('all');
  });
});
