const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../src/models/user');
const Garment = require('../../src/models/garment');
const { uploadsRoot, extractFilenameFromImageUrl } = require('../../src/utils/imageFileUtils');
const { cleanupOrphanedUploadFiles } = require('../../src/utils/orphanCleanup');

let mongoServer;
let app;

const createdFilenames = new Set();

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
  name: `user-${Date.now()}-${Math.random()}`,
  email: `user-${Date.now()}-${Math.random()}@test.com`,
  password: 'hashed-password',
});

const VALID_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOQf2F8AAAAASUVORK5CYII=';
const imageBuffer = () => Buffer.from(VALID_PNG_BASE64, 'base64');

const trackImageFromResponse = (response) => {
  const imageUrl = response?.body?.imageUrl;
  const filename = extractFilenameFromImageUrl(imageUrl);
  if (filename) {
    createdFilenames.add(filename);
  }
  return filename;
};

const fileExists = async (filename) => {
  const fullPath = path.join(uploadsRoot, filename);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
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
  ]);

  await Promise.all(Array.from(createdFilenames).map(async (filename) => {
    try {
      await fs.unlink(path.join(uploadsRoot, filename));
    } catch {
      // File may already have been removed by lifecycle cleanup.
    }
  }));

  createdFilenames.clear();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Image upload endpoints', () => {
  test('POST /api/garments uploads image and stores imageUrl', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Upload Test Shirt')
      .field('category', 'Tops')
      .attach('image', imageBuffer(), { filename: 'shirt.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.imageUrl).toMatch(/^\/uploads\//);
    expect(response.body.imageMetadata).toBeTruthy();
    expect(response.body.imageMetadata.provider).toBeTruthy();
    expect(response.body.imageMetadata.bytes).toBeGreaterThan(0);

    const filename = trackImageFromResponse(response);
    expect(filename).toBeTruthy();
    expect(await fileExists(filename)).toBe(true);
  });

  test('POST /api/garments rejects non-image uploads', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Bad File')
      .field('category', 'Tops')
      .attach('image', Buffer.from('plain text'), { filename: 'bad.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/image/i);
  });

  test('POST /api/garments rejects spoofed image content', async () => {
    const user = await createUser();

    const response = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Spoofed Image')
      .field('category', 'Tops')
      .attach('image', Buffer.from('not-an-image'), { filename: 'spoofed.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/valid image/i);
  });

  test('POST /api/garments rejects files over 5MB', async () => {
    const user = await createUser();
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

    const response = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Large File')
      .field('category', 'Outerwear')
      .attach('image', oversizedBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(413);
    expect(response.body.message).toMatch(/5MB/i);
  });

  test('GET /api/uploads/:filename requires auth and ownership', async () => {
    const owner = await createUser();
    const stranger = await createUser();

    const createResponse = await request(app)
      .post('/api/garments')
      .set(authHeader(owner._id.toString()))
      .field('name', 'Owned Item')
      .field('category', 'Tops')
      .attach('image', imageBuffer(), { filename: 'owned.png', contentType: 'image/png' });

    expect(createResponse.status).toBe(201);
    const filename = trackImageFromResponse(createResponse);

    const unauthenticated = await request(app)
      .get(`/api/uploads/${filename}`);

    expect(unauthenticated.status).toBe(401);

    const nonOwner = await request(app)
      .get(`/api/uploads/${filename}`)
      .set(authHeader(stranger._id.toString()));

    expect(nonOwner.status).toBe(404);

    const ownerResponse = await request(app)
      .get(`/api/uploads/${filename}`)
      .set(authHeader(owner._id.toString()));

    expect(ownerResponse.status).toBe(200);
  });

  test('GET /api/uploads/:filename rejects invalid filenames', async () => {
    const user = await createUser();

    const response = await request(app)
      .get('/api/uploads/..%5Cprivate.txt')
      .set(authHeader(user._id.toString()));

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/invalid filename/i);
  });

  test('PUT /api/garments/:id replaces image and removes old file', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Replaceable Item')
      .field('category', 'Tops')
      .attach('image', imageBuffer(), { filename: 'old.png', contentType: 'image/png' });

    expect(createResponse.status).toBe(201);
    const oldFilename = trackImageFromResponse(createResponse);

    const updateResponse = await request(app)
      .put(`/api/garments/${createResponse.body._id}`)
      .set(authHeader(user._id.toString()))
      .attach('image', imageBuffer(), { filename: 'new.png', contentType: 'image/png' });

    expect(updateResponse.status).toBe(200);
    const newFilename = trackImageFromResponse(updateResponse);

    expect(newFilename).toBeTruthy();
    expect(newFilename).not.toBe(oldFilename);
    expect(await fileExists(newFilename)).toBe(true);
    expect(await fileExists(oldFilename)).toBe(false);
  });

  test('DELETE /api/garments/:id removes image file', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Delete Item')
      .field('category', 'Tops')
      .attach('image', imageBuffer(), { filename: 'delete.png', contentType: 'image/png' });

    expect(createResponse.status).toBe(201);
    const filename = trackImageFromResponse(createResponse);
    expect(await fileExists(filename)).toBe(true);

    const deleteResponse = await request(app)
      .delete(`/api/garments/${createResponse.body._id}`)
      .set(authHeader(user._id.toString()));

    expect(deleteResponse.status).toBe(200);
    expect(await fileExists(filename)).toBe(false);
  });

  test('PUT /api/users/me/profile-image uploads profile picture', async () => {
    const user = await createUser();

    const response = await request(app)
      .put('/api/users/me/profile-image')
      .set(authHeader(user._id.toString()))
      .attach('profileImage', imageBuffer(), { filename: 'profile.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.profilePicture).toMatch(/^\/uploads\//);
    expect(response.body.profilePictureMetadata).toBeTruthy();
    expect(response.body.profilePictureMetadata.provider).toBeTruthy();
    expect(response.body.profilePictureMetadata.bytes).toBeGreaterThan(0);

    const filename = extractFilenameFromImageUrl(response.body.profilePicture);
    createdFilenames.add(filename);

    expect(await fileExists(filename)).toBe(true);
  });

  test('PUT /api/users/me/banner-image uploads banner and saves preset updates', async () => {
    const user = await createUser();

    const uploadResponse = await request(app)
      .put('/api/users/me/banner-image')
      .set(authHeader(user._id.toString()))
      .attach('bannerImage', imageBuffer(), { filename: 'banner.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.bannerImage).toMatch(/^\/uploads\//);
    expect(uploadResponse.body.bannerImageMetadata).toBeTruthy();
    expect(uploadResponse.body.bannerImageMetadata.provider).toBeTruthy();
    expect(uploadResponse.body.bannerImageMetadata.bytes).toBeGreaterThan(0);

    const bannerFilename = extractFilenameFromImageUrl(uploadResponse.body.bannerImage);
    createdFilenames.add(bannerFilename);

    const presetResponse = await request(app)
      .put('/api/users/me/banner-preset')
      .set(authHeader(user._id.toString()))
      .send({ bannerPreset: 'mint' });

    expect(presetResponse.status).toBe(200);
    expect(presetResponse.body.bannerPreset).toBe('mint');
  });

  test('cleanupOrphanedUploadFiles removes only orphaned files outside retention window', async () => {
    const user = await createUser();

    const createResponse = await request(app)
      .post('/api/garments')
      .set(authHeader(user._id.toString()))
      .field('name', 'Orphan Candidate')
      .field('category', 'Tops')
      .attach('image', imageBuffer(), { filename: 'orphan.png', contentType: 'image/png' });

    expect(createResponse.status).toBe(201);
    const orphanFilename = trackImageFromResponse(createResponse);
    expect(await fileExists(orphanFilename)).toBe(true);

    await Garment.deleteOne({ _id: createResponse.body._id });

    const dryRunSummary = await cleanupOrphanedUploadFiles({ dryRun: true, retentionDays: 0 });
    expect(dryRunSummary.orphanFiles).toContain(orphanFilename);
    expect(dryRunSummary.orphanFilesDeleted).toBe(0);

    const cleanupSummary = await cleanupOrphanedUploadFiles({ dryRun: false, retentionDays: 0 });
    expect(cleanupSummary.orphanFiles).toContain(orphanFilename);
    expect(cleanupSummary.orphanFilesDeleted).toBeGreaterThanOrEqual(1);
    expect(await fileExists(orphanFilename)).toBe(false);

    createdFilenames.delete(orphanFilename);
  });
});
