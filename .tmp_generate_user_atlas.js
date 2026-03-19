const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/user');
const Garment = require('./src/models/garment');
const Outfit = require('./src/models/outfit');
const Usage = require('./src/models/usage');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleUnique(arr, count) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function randomPastDate(daysBack = 60) {
  const now = Date.now();
  const offsetMs = randomInt(0, daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offsetMs);
}

(async () => {
  const envRaw = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const parsedEnv = dotenv.parse(envRaw);
  const mongoUri = parsedEnv.MONGO_URI;
  const mongoDbName = parsedEnv.MONGO_DB_NAME;

  if (!mongoUri) {
    throw new Error('MONGO_URI missing in .env');
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  };
  if (mongoDbName) {
    options.dbName = mongoDbName;
  }

  await mongoose.connect(mongoUri, options);

  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `seed-user-${unique}@example.com`;
  const name = `seed-user-${unique}`;
  const password = 'ClosetDemo123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const CATEGORY_OPTIONS = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Dresses'];
  const COLOR_OPTIONS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Beige', 'Gray', 'Navy'];
  const SEASON_OPTIONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All'];
  const STYLE_OPTIONS = ['Casual', 'Minimal', 'Streetwear', 'Smart', 'Vintage'];
  const BODY_TYPE_OPTIONS = ['Pear', 'Apple', 'Hourglass', 'Rectangle', 'Inverted Triangle'];

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    profilePicture: null,
    bannerImage: null,
    bannerPreset: 'pink',
    age: randomInt(19, 34),
    heightCm: randomInt(155, 188),
    weightKg: randomInt(48, 88),
    bodyType: pick(BODY_TYPE_OPTIONS),
    stylePreferences: sampleUnique(STYLE_OPTIONS, 3),
    preferences: {
      style: sampleUnique(STYLE_OPTIONS, 2),
      favoriteColors: sampleUnique(COLOR_OPTIONS, 3),
    },
  });

  const garmentDocs = Array.from({ length: 20 }).map((_, i) => ({
    owner: user._id,
    name: `${pick(CATEGORY_OPTIONS)} Item ${i + 1}`,
    category: pick(CATEGORY_OPTIONS),
    color: pick(COLOR_OPTIONS),
    season: pick(SEASON_OPTIONS),
    purchasePrice: randomInt(20, 250),
    imageUrl: '',
  }));

  const garments = await Garment.insertMany(garmentDocs);
  const garmentIds = garments.map((g) => g._id);

  const outfitDocs = Array.from({ length: 10 }).map((_, i) => ({
    owner: user._id,
    name: `Generated Outfit ${i + 1}`,
    garments: sampleUnique(garmentIds, randomInt(2, 5)),
    date: randomPastDate(60),
    isLookbook: false,
  }));

  const lookbookDocs = Array.from({ length: 2 }).map((_, i) => ({
    owner: user._id,
    name: `Generated Lookbook ${i + 1}`,
    garments: sampleUnique(garmentIds, randomInt(2, 5)),
    date: randomPastDate(30),
    isLookbook: true,
  }));

  const outfits = await Outfit.insertMany(outfitDocs);
  const lookbooks = await Outfit.insertMany(lookbookDocs);

  const usageFromOutfits = outfits.flatMap((outfit) =>
    outfit.garments.map((garmentId) => ({
      user: user._id,
      garment: garmentId,
      outfit: outfit._id,
      wornDate: outfit.date || new Date(),
    }))
  );

  const extraUsage = Array.from({ length: 24 }).map(() => ({
    user: user._id,
    garment: pick(garmentIds),
    wornDate: randomPastDate(60),
  }));

  const usageRecords = await Usage.insertMany([...usageFromOutfits, ...extraUsage]);

  const verify = {
    db: mongoose.connection.name,
    garments: await Garment.countDocuments({ owner: user._id }),
    outfits: await Outfit.countDocuments({ owner: user._id, isLookbook: { $ne: true } }),
    lookbooks: await Outfit.countDocuments({ owner: user._id, isLookbook: true }),
    usageEvents: await Usage.countDocuments({ user: user._id }),
  };

  console.log(JSON.stringify({
    email,
    password,
    userId: String(user._id),
    created: {
      garments: garments.length,
      outfits: outfits.length,
      lookbooks: lookbooks.length,
      usageEvents: usageRecords.length,
    },
    verified: verify,
  }, null, 2));

  await mongoose.disconnect();
})();
