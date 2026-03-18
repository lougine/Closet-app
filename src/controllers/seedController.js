const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');

const User = require('../models/user');
const Garment = require('../models/garment');
const Outfit = require('../models/outfit');
const Usage = require('../models/usage');
const { uploadsRoot } = require('../utils/imageFileUtils');

const PROFILE_CONFIG = {
  medium: {
    garments: 20,
    outfits: 10,
    daysBack: 60,
    extraUsageEvents: 24,
  },
};

const CATEGORY_OPTIONS = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Dresses'];
const COLOR_OPTIONS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Beige', 'Gray', 'Navy'];
const SEASON_OPTIONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All'];
const STYLE_OPTIONS = ['Casual', 'Minimal', 'Streetwear', 'Smart', 'Vintage'];
const BODY_TYPE_OPTIONS = ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle'];

const SEED_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sU2fM0AAAAASUVORK5CYII=';

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function createSeededRandom(seedText) {
  let state = hashString(seedText) || 123456789;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick(random, values) {
  const index = Math.floor(random() * values.length);
  return values[index];
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function sampleUnique(random, ids, count) {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function randomPastDate(random, daysBack) {
  const now = Date.now();
  const offsetDays = randomInt(random, 0, daysBack);
  const offsetHours = randomInt(random, 0, 23);
  const offsetMinutes = randomInt(random, 0, 59);
  const date = new Date(now - offsetDays * 24 * 60 * 60 * 1000);
  date.setUTCHours(offsetHours, offsetMinutes, 0, 0);
  return date;
}

async function cleanupGeneratedData(userId) {
  await Promise.all([
    Usage.deleteMany({ user: userId }),
    Outfit.deleteMany({ owner: userId }),
    Garment.deleteMany({ owner: userId }),
    User.deleteOne({ _id: userId }),
  ]);
}

async function ensureSeedImageFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  const filename = imageUrl.split('/').filter(Boolean).pop();
  if (!filename) return;

  await fs.mkdir(uploadsRoot, { recursive: true });
  const fullPath = path.join(uploadsRoot, filename);
  const fileBuffer = Buffer.from(SEED_PNG_BASE64, 'base64');
  await fs.writeFile(fullPath, fileBuffer);
}

function validateRequest(req, res) {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ message: 'Seeder endpoint is disabled in production' });
    return false;
  }

  if (process.env.ENABLE_SEED_ENDPOINT !== 'true') {
    res.status(403).json({ message: 'Seeder endpoint is disabled. Set ENABLE_SEED_ENDPOINT=true' });
    return false;
  }

  if (!process.env.SEED_API_SECRET) {
    res.status(500).json({ message: 'SEED_API_SECRET is not configured' });
    return false;
  }

  const providedSecret = req.headers['x-seed-secret'];
  if (!providedSecret || providedSecret !== process.env.SEED_API_SECRET) {
    res.status(401).json({ message: 'Invalid or missing seed secret' });
    return false;
  }

  return true;
}

exports.generateUserWithData = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const profile = req.body.profile || 'medium';
  if (!PROFILE_CONFIG[profile]) {
    return res.status(400).json({
      message: 'Invalid profile. Supported values: medium',
    });
  }

  const config = PROFILE_CONFIG[profile];
  const seedText = String(req.body.seed || `seed-${Date.now()}-${Math.random()}`);
  const random = createSeededRandom(seedText);
  const uniqueSuffix = `${Date.now()}-${Math.floor(random() * 1e9)}`;

  const plainPassword = req.body.password || 'SeedPass123!';
  const generatedName = `seed-user-${uniqueSuffix}`;
  const generatedEmail = `seed-user-${uniqueSuffix}@example.com`;

  const profilePicture = `/uploads/seed-profile-${uniqueSuffix}.jpg`;
  const bannerImage = `/uploads/seed-banner-${uniqueSuffix}.jpg`;

  let createdUser = null;

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    createdUser = await User.create({
      name: generatedName,
      email: generatedEmail,
      password: hashedPassword,
      profilePicture,
      bannerImage,
      bannerPreset: 'pink',
      age: randomInt(random, 19, 34),
      heightCm: randomInt(random, 155, 188),
      weightKg: randomInt(random, 48, 88),
      bodyType: pick(random, BODY_TYPE_OPTIONS),
      stylePreferences: sampleUnique(random, STYLE_OPTIONS, 3),
      preferences: {
        style: sampleUnique(random, STYLE_OPTIONS, 2),
        favoriteColors: sampleUnique(random, COLOR_OPTIONS, 3),
      },
    });

    await Promise.all([
      ensureSeedImageFile(profilePicture),
      ensureSeedImageFile(bannerImage),
    ]);

    const garmentDocs = Array.from({ length: config.garments }).map((_, index) => {
      const category = pick(random, CATEGORY_OPTIONS);
      const color = pick(random, COLOR_OPTIONS);
      const season = pick(random, SEASON_OPTIONS);
      return {
        owner: createdUser._id,
        name: `${category} Item ${index + 1}`,
        category,
        color,
        season,
        purchasePrice: randomInt(random, 20, 250),
        imageUrl: `/uploads/seed-garment-${uniqueSuffix}-${index + 1}.jpg`,
      };
    });

    const garments = await Garment.insertMany(garmentDocs);
    await Promise.all(garmentDocs.map((garment) => ensureSeedImageFile(garment.imageUrl)));
    const garmentIds = garments.map((g) => g._id);

    const outfitDocs = Array.from({ length: config.outfits }).map((_, index) => {
      const garmentCount = randomInt(random, 2, 5);
      const selectedGarments = sampleUnique(random, garmentIds, garmentCount);
      return {
        owner: createdUser._id,
        name: `Generated Outfit ${index + 1}`,
        garments: selectedGarments,
        date: randomPastDate(random, config.daysBack),
      };
    });

    const outfits = await Outfit.insertMany(outfitDocs);

    const usageFromOutfits = outfits.flatMap((outfit) =>
      outfit.garments.map((garmentId) => ({
        user: createdUser._id,
        garment: garmentId,
        outfit: outfit._id,
        wornDate: outfit.date || new Date(),
      }))
    );

    const extraUsage = Array.from({ length: config.extraUsageEvents }).map(() => ({
      user: createdUser._id,
      garment: pick(random, garmentIds),
      wornDate: randomPastDate(random, config.daysBack),
    }));

    const usageRecords = await Usage.insertMany([...usageFromOutfits, ...extraUsage]);

    const token = jwt.sign({ userId: createdUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      message: 'Generated user and linked data successfully',
      credentials: {
        email: generatedEmail,
        password: plainPassword,
        token,
      },
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        profilePicture: createdUser.profilePicture,
        bannerImage: createdUser.bannerImage,
      },
      summary: {
        profile,
        seed: seedText,
        garmentsCreated: garments.length,
        outfitsCreated: outfits.length,
        calendarEventsCreated: outfits.filter((item) => Boolean(item.date)).length,
        usageEventsCreated: usageRecords.length,
      },
    });
  } catch (error) {
    if (createdUser?._id) {
      await cleanupGeneratedData(createdUser._id);
    }
    return res.status(500).json({
      message: 'Failed to generate seeded user data',
      error: error.message,
    });
  }
};
