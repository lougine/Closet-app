describe('storage backfill script', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('runBackfill dry-run reports unique filenames and skips missing files', async () => {
    const registerUploadedFile = jest.fn();
    const access = jest.fn(async (filePath) => {
      if (String(filePath).includes('missing.jpg')) {
        const err = new Error('not found');
        err.code = 'ENOENT';
        throw err;
      }
    });

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/services/storage/drivers/cloudinaryStorageDriver', () => ({
      isEnabled: () => true,
      registerUploadedFile,
    }));
    jest.doMock('../../scripts/storage-reference-utils', () => ({
      collectImageReferences: jest.fn(async () => ([
        { filename: 'ok.png' },
        { filename: 'ok.png' },
        { filename: 'missing.jpg' },
        { filename: null },
      ])),
    }));
    jest.doMock('../../src/utils/imageFileUtils', () => ({
      resolveUploadPath: jest.fn((filename) => filename ? `C:/tmp/${filename}` : null),
    }));
    jest.doMock('fs/promises', () => ({ access }));

    const { runBackfill } = require('../../scripts/backfill-secondary-storage');
    const summary = await runBackfill({ dryRun: true });

    expect(summary.dryRun).toBe(true);
    expect(summary.referencesScanned).toBe(4);
    expect(summary.uniqueFilenames).toBe(2);
    expect(summary.uploaded).toBe(1);
    expect(summary.missingLocal).toBe(1);
    expect(registerUploadedFile).not.toHaveBeenCalled();
  });

  test('runBackfill uploads files when not dry-run', async () => {
    const registerUploadedFile = jest.fn(async () => ({ ok: true }));

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../src/services/storage/drivers/cloudinaryStorageDriver', () => ({
      isEnabled: () => true,
      registerUploadedFile,
    }));
    jest.doMock('../../scripts/storage-reference-utils', () => ({
      collectImageReferences: jest.fn(async () => ([{ filename: 'ok.png' }])),
    }));
    jest.doMock('../../src/utils/imageFileUtils', () => ({
      resolveUploadPath: jest.fn((filename) => `C:/tmp/${filename}`),
    }));
    jest.doMock('fs/promises', () => ({
      access: jest.fn(async () => {}),
    }));

    const { runBackfill } = require('../../scripts/backfill-secondary-storage');
    const summary = await runBackfill({ dryRun: false });

    expect(summary.uploaded).toBe(1);
    expect(registerUploadedFile).toHaveBeenCalledTimes(1);
    expect(registerUploadedFile).toHaveBeenCalledWith({
      filename: 'ok.png',
      path: 'C:/tmp/ok.png',
    });
  });
});
