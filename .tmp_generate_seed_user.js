const path = require('path');
const fs = require('fs');

const root = process.cwd();
require('dotenv').config({ path: path.join(root, '.env') });

const API = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const seedSecret = process.env.SEED_API_SECRET;

if (!seedSecret) {
  console.error('SEED_API_SECRET is missing in .env');
  process.exit(1);
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url} :: ${JSON.stringify(payload)}`);
  }
  return payload;
}

(async () => {
  const unique = Date.now();
  const requester = {
    name: `seed-requester-${unique}`,
    email: `seed-requester-${unique}@example.com`,
    password: 'Requester123!'
  };

  await requestJson(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requester),
  });

  const login = await requestJson(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: requester.email, password: requester.password }),
  });

  const requesterToken = login.token;

  const generatedPassword = 'ClosetDemo123!';
  const seeded = await requestJson(`${API}/api/seed/generate-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${requesterToken}`,
      'x-seed-secret': seedSecret,
    },
    body: JSON.stringify({ profile: 'medium', password: generatedPassword }),
  });

  const seededToken = seeded?.credentials?.token;
  if (!seededToken) throw new Error('Seed response did not include user token');

  const garments = await requestJson(`${API}/api/garments?limit=50`, {
    headers: { 'Authorization': `Bearer ${seededToken}` },
  });

  if (!Array.isArray(garments) || garments.length < 2) {
    throw new Error(`Expected seeded garments, got: ${JSON.stringify(garments)}`);
  }

  const g = garments.map((item) => String(item._id));
  const lookbookBodies = [
    {
      name: 'Generated Lookbook 1',
      garments: g.slice(0, Math.min(4, g.length)),
      date: new Date().toISOString(),
      isLookbook: true,
    },
    {
      name: 'Generated Lookbook 2',
      garments: g.slice(Math.max(0, g.length - 4)),
      date: new Date().toISOString(),
      isLookbook: true,
    },
  ];

  for (const body of lookbookBodies) {
    await requestJson(`${API}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${seededToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  const allOutfits = await requestJson(`${API}/api/outfits`, {
    headers: { 'Authorization': `Bearer ${seededToken}` },
  });

  const outfitCount = Array.isArray(allOutfits)
    ? allOutfits.filter((item) => !item?.isLookbook).length
    : 0;
  const lookbookCount = Array.isArray(allOutfits)
    ? allOutfits.filter((item) => !!item?.isLookbook).length
    : 0;

  const usageHistory = await requestJson(`${API}/api/usage/history?limit=1`, {
    headers: { 'Authorization': `Bearer ${seededToken}` },
  });
  const usageTotal = usageHistory?.pagination?.total ?? null;

  const output = {
    email: seeded.credentials.email,
    password: generatedPassword,
    userId: seeded.user.id,
    summaryFromSeed: seeded.summary,
    verified: {
      garments: Array.isArray(garments) ? garments.length : null,
      outfits: outfitCount,
      lookbooks: lookbookCount,
      usageEvents: usageTotal,
    },
  };

  console.log(JSON.stringify(output, null, 2));
})();
