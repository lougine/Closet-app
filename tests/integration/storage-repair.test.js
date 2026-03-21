describe('storage repair script', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('runRepair plans malformed URL fixes and applies updates', async () => {
    const writeReferenceValue = jest.fn(async () => ({ modifiedCount: 1 }));
    const mkdir = jest.fn(async () => {});
    const writeFile = jest.fn(async () => {});

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('../../scripts/storage-reference-utils', () => ({
      collectImageReferences: jest.fn(async () => ([
        {
          modelLabel: 'Outfit',
          docIdString: '65f0d9f0623f62b8c6f00aaa',
          field: 'previewImage',
          imageUrl: 'https://external.invalid/file.jpg',
          filename: null,
          emptyValue: '',
        },
      ])),
      writeReferenceValue,
    }));
    jest.doMock('fs/promises', () => ({ mkdir, writeFile }));

    const { runRepair } = require('../../scripts/repair-storage-references');
    const summary = await runRepair({
      dryRun: false,
      apply: true,
      backupPath: 'C:/tmp/repair-backup.json',
    });

    expect(summary.malformedCount).toBe(1);
    expect(summary.appliedCount).toBe(1);
    expect(summary.plannedChanges).toHaveLength(1);
    expect(writeReferenceValue).toHaveBeenCalledTimes(1);
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
