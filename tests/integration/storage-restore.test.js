describe('storage restore script', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('runRestore applies backup changes to mapped models', async () => {
    const garmentUpdateOne = jest.fn(async () => ({ modifiedCount: 1 }));
    const userUpdateOne = jest.fn(async () => ({ modifiedCount: 0 }));

    jest.doMock('../../src/config/db', () => jest.fn(async () => {}));
    jest.doMock('fs/promises', () => ({
      readFile: jest.fn(async () => JSON.stringify({
        plannedChanges: [
          {
            model: 'Garment',
            docId: '65f0d9f0623f62b8c6f00bbb',
            field: 'imageUrl',
            from: '/uploads/restored.png',
          },
          {
            model: 'User',
            docId: '65f0d9f0623f62b8c6f00ccc',
            field: 'profilePicture',
            from: '/uploads/p.png',
          },
        ],
      })),
    }));

    jest.doMock('../../src/models/garment', () => ({ updateOne: garmentUpdateOne }));
    jest.doMock('../../src/models/user', () => ({ updateOne: userUpdateOne }));
    jest.doMock('../../src/models/outfit', () => ({ updateOne: jest.fn(async () => ({ modifiedCount: 0 })) }));
    jest.doMock('../../src/models/communityPost', () => ({ updateOne: jest.fn(async () => ({ modifiedCount: 0 })) }));

    const { runRestore } = require('../../scripts/restore-storage-references');
    const summary = await runRestore({
      dryRun: false,
      backupPath: 'C:/tmp/repair-backup.json',
    });

    expect(summary.changesFound).toBe(2);
    expect(summary.restored).toBe(1);
    expect(garmentUpdateOne).toHaveBeenCalledTimes(1);
    expect(userUpdateOne).toHaveBeenCalledTimes(1);
  });
});
