// ===============================
// SMART WARDROBE SERVER
// Groq-Powered Conversation
// ===============================

require("dotenv").config({ path: '../.env' });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const cron = require("node-cron");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const Groq = require("groq-sdk");

// ── LOCAL AI EMBEDDINGS ──
let pipeline;
let embeddingGenerator = null;
(async () => {
  const { pipeline: p } = await import('@xenova/transformers');
  pipeline = p;
  embeddingGenerator = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("\n  🤖 Local AI Embeddings Loaded (Xenova)");
})();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const rawApiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_TOKEN;
const groq = rawApiKey ? new Groq({ apiKey: rawApiKey }) : {
  chat: {
    completions: {
       create: async () => ({ choices: [{ message: { content: '{"reply": "I am running without an API key!"}' } }] })
    }
  }
};
const GROQ_MODEL = "llama-3.1-8b-instant";

// ── MongoDB ──
mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe")
  .then(() => console.log("\n  ✅ MongoDB Connected\n  📦 Database: smartWardrobe\n"))
  .catch(err => console.log("  ❌ MongoDB Error:", err));

// ── SCHEMAS ──
const clothingSchema = new mongoose.Schema({
  name: String, type: String, color: String,
  season: String, occasion: String, gender: String,
  imageUrl: String, price: Number, wearCount: { type: Number, default: 0 },
  embedding: [Number] // AI Vector representation
});
const Clothing = mongoose.model("Clothing", clothingSchema);

const feedbackSchema = new mongoose.Schema({
  userId: { type: String, default: "default" },
  outfit: Object, reaction: String, occasion: String,
  weather: String, season: String,
  createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model("Feedback", feedbackSchema);

const analyticsSchema = new mongoose.Schema({
  userId: { type: String, default: "default" },
  occasion: String, weather: String, season: String,
  time: String, outfitSuggested: Object,
  createdAt: { type: Date, default: Date.now }
});
const Analytics = mongoose.model("Analytics", analyticsSchema);

const scheduledOutfitSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  eventTitle: String,
  outfit: Object, // { top, bottom, shoes, images }
  userId: { type: String, default: "default" },
  createdAt: { type: Date, default: Date.now }
});
const ScheduledOutfit = mongoose.model("ScheduledOutfit", scheduledOutfitSchema);


const savedOutfitSchema = new mongoose.Schema({
  userId: { type: String, default: "default" },
  outfit: Object, occasion: String, season: String, time: String,
  savedAt: { type: Date, default: Date.now }
});
const SavedOutfit = mongoose.model("SavedOutfit", savedOutfitSchema);

const userHistorySchema = new mongoose.Schema({
  userId: String, occasion: String, outfit: Object,
  likedColors: [String], wornAt: { type: Date, default: Date.now }
});
const UserHistory = mongoose.model("UserHistory", userHistorySchema);

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  name: String,
  favoriteColors: [String],
  favoriteOccasions: [String],
  totalLikes: { type: Number, default: 0 },
  styleProfile: {
    topColors: [String],
    topTypes: [String],
    preferredOccasions: [String],
    predominantStyle: { type: String, default: "Neutral" },
    styleScores: {
      minimalist: { type: Number, default: 0 },
      old_money: { type: Number, default: 0 },
      streetwear: { type: Number, default: 0 }
    }
  },
  createdAt: { type: Date, default: Date.now },

  updatedAt: { type: Date, default: Date.now }
});
const UserProfile = mongoose.model("UserProfile", userProfileSchema);

// ── AI & VECTOR MATH HELPERS ──
async function generateEmbeddingAsync(text) {
  if (!embeddingGenerator || !text) return [];
  const output = await embeddingGenerator(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── GROQ AI HELPERS ──
async function autoTagClothing(name) {
  try {
    const prompt = `Classify this clothing item: "${name}".
Respond ONLY with a valid JSON object like this:
{"type": "(tshirt, shirt, pants, jeans, shoes, dress, skirt, jacket)", "color": "(main color)", "season": "(summer, winter, spring, autumn, mild)", "occasion": "(casual, formal, work, party, wedding)"}`;
    const reply = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: "You are a clothing classifier that only returns JSON and NEVER any raw text." }, { role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" }
    });
    return JSON.parse(reply.choices[0].message.content);
  } catch (e) {
    console.error("AutoTag Error:", e.message);
    return null;
  }
}

// ── HELPERS ──
function getSeasonFromDate() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
function getTimeOfDay() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "morning" : "evening";
}

async function getCurrentWeather(city = "Cairo") {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`;
    const { data } = await axios.get(url);
    const temp = data.main.temp;
    const desc = data.weather[0].main.toLowerCase();
    let weatherType = "mild";
    if (desc.includes("rain")) weatherType = "rainy";
    else if (temp >= 28) weatherType = "hot";
    else if (temp <= 15) weatherType = "cold";
    return { temp, description: data.weather[0].description, weatherType, humidity: data.main.humidity, city: data.name };
  } catch {
    return { temp: null, description: "unknown", weatherType: "mild", humidity: null, city };
  }
}

// ── GOOGLE CALENDAR ──
function getCalendarClient() {
  try {
    const creds = JSON.parse(fs.readFileSync("./credentials.json"));
    const token = JSON.parse(fs.readFileSync("./token.json"));
    const { client_secret, client_id, redirect_uris } = creds.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token);
    return auth;
  } catch (e) {
    console.error("  ❌ Google Calendar Auth Fail:", e.message);
    return null;
  }
}


async function getUpcomingEvents() {
  try {
    const auth = getCalendarClient();
    if (!auth) return { events: [], status: "failed", error: "Auth missing" };
    const cal = google.calendar({ version: "v3", auth });
    const now = new Date();
    // ⏳ Increased timeout to 5 seconds
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Google API timeout (5s)")), 5000));
    const calPromise = cal.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 48 * 3600000).toISOString(),
      singleEvents: true, orderBy: "startTime", maxResults: 5
    });
    const res = await Promise.race([calPromise, timeoutPromise]);
    const googleEvents = (res.data.items || []).map(e => ({
      title: e.summary,
      time: e.start?.dateTime || e.start?.date,
      source: "google"
    }));

    // Merge with local scheduled outfits
    const localEvents = await ScheduledOutfit.find({
      date: { $gte: now, $lte: new Date(now.getTime() + 48 * 3600000) }
    });

    const merged = [...googleEvents];
    localEvents.forEach(le => {
      const match = merged.find(ge => ge.title === le.eventTitle && new Date(ge.time).getTime() === new Date(le.date).getTime());
      if (match) match.outfit = le.outfit;
      else merged.push({ title: le.eventTitle, time: le.date, outfit: le.outfit, source: le.eventTitle ? "local" : "personal" });
    });

    return { events: merged.sort((a, b) => new Date(a.time) - new Date(b.time)), status: "connected" };
  } catch (e) {
    console.error("  ❌ Google Calendar API Fail:", e.message);
    return { events: [], status: "failed", error: e.message };
  }
}



// ══════════════════════════════════════════
// ── SMART OUTFIT RECOMMENDATION ENGINE ──
// ══════════════════════════════════════════

// Color temperature classification
const DARK_COLORS = ["black", "navy", "dark blue", "charcoal", "dark brown", "dark grey", "burgundy"];
const LIGHT_COLORS = ["white", "beige", "ivory", "tan", "light blue", "light grey", "nude"];
const MEDIUM_COLORS = ["grey", "blue", "brown", "khaki", "green"];

function getColorTemp(color) {
  const c = (color || "").toLowerCase();
  if (DARK_COLORS.some(d => c.includes(d))) return "dark";
  if (LIGHT_COLORS.some(l => c.includes(l))) return "light";
  return "medium";
}

// ── STYLE ARCHETYPES ──
const STYLE_ARCHETYPES = {
  minimalist: {
    name: "Minimalist",
    colors: ["black", "white", "grey", "light grey", "dark grey", "beige", "navy"],
    forbiddenColors: ["yellow", "red", "green", "orange", "purple", "pink"],
    keywords: ["plain", "basic", "simple", "clean", "minimal", "essential"],
    types: ["tshirt", "shirt", "pants", "jacket"]
  },
  old_money: {
    name: "Old Money",
    colors: ["navy", "beige", "cream", "ivory", "tan", "burgundy", "dark brown", "white", "forest green"],
    forbiddenColors: ["yellow", "neon", "orange"],
    keywords: ["classic", "linen", "knit", "oxford", "wool", "silk", "loafers", "blazer", "chino", "premium", "formal"],
    types: ["shirt", "pants", "shoes", "jacket"]
  },
  streetwear: {
    name: "Streetwear",
    colors: ["black", "white", "vibrant", "red", "yellow", "blue", "green"],
    forbiddenColors: ["cream", "beige", "ivory"],
    keywords: ["graphic", "oversized", "hoodie", "street", "baggy", "cargo", "sneakers", "cap", "distressed", "denim", "camo"],
    types: ["tshirt", "hoodie", "jeans", "shoes", "cap"]
  }
};

function getItemStyleScores(item) {
  const scores = { minimalist: 0, old_money: 0, streetwear: 0 };
  const name = (item.name || "").toLowerCase();
  const color = (item.color || "").toLowerCase();
  const type = (item.type || "").toLowerCase();

  for (const [key, archetype] of Object.entries(STYLE_ARCHETYPES)) {
    // 1. Color Match
    if (archetype.colors.some(c => color.includes(c))) scores[key] += 10;
    if (archetype.forbiddenColors && archetype.forbiddenColors.some(c => color.includes(c))) scores[key] -= 15;

    // 2. Keyword Match in Name
    if (archetype.keywords.some(k => name.includes(k))) scores[key] += 15;

    // 3. Type Match
    if (archetype.types.includes(type)) scores[key] += 5;
  }
  return scores;
}

async function calculateUserStyleProfile(userId = "default") {
  try {
    const clothes = await Clothing.find();
    const feedback = await Feedback.find({ userId, reaction: "liked" });

    let totalScores = { minimalist: 0, old_money: 0, streetwear: 0 };

    // Analyze base inventory
    clothes.forEach(item => {
      const itemScores = getItemStyleScores(item);
      totalScores.minimalist += itemScores.minimalist;
      totalScores.old_money += itemScores.old_money;
      totalScores.streetwear += itemScores.streetwear;
    });

    // weigh inventory items by wear count too? (Future step 3)

    // Predominant style
    const sorted = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
    const topKey = sorted[0][0];
    const predominantStyle = totalScores[topKey] > 0 ? STYLE_ARCHETYPES[topKey].name : "Neutral";

    await UserProfile.findOneAndUpdate(
      { userId },
      {
        "styleProfile.predominantStyle": predominantStyle,
        "styleProfile.styleScores": totalScores,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return { predominantStyle, totalScores };
  } catch (e) {
    return { predominantStyle: "Neutral", totalScores: {} };
  }
}


// ── COLOR HARMONY RULES ──
// Defines which colors look great together and which to avoid
const COLOR_HARMONY = {
  "black": { great: ["white", "grey", "beige", "light blue", "light grey", "ivory", "tan"], avoid: [] },
  "white": { great: ["black", "navy", "blue", "dark blue", "charcoal", "grey", "burgundy", "brown", "dark brown"], avoid: [] },
  "navy": { great: ["white", "beige", "light blue", "tan", "grey", "light grey", "ivory", "khaki"], avoid: ["black", "dark blue"] },
  "grey": { great: ["black", "white", "navy", "blue", "burgundy", "light blue"], avoid: ["dark grey"] },
  "light grey": { great: ["navy", "black", "charcoal", "dark blue", "burgundy", "white"], avoid: ["beige"] },
  "dark grey": { great: ["white", "light blue", "beige", "ivory"], avoid: ["black", "charcoal"] },
  "beige": { great: ["navy", "white", "brown", "dark blue", "black", "dark brown", "charcoal"], avoid: ["ivory", "tan", "light grey"] },
  "blue": { great: ["white", "beige", "grey", "black", "tan", "light grey"], avoid: ["navy", "dark blue"] },
  "light blue": { great: ["white", "beige", "navy", "grey", "tan", "charcoal", "dark brown", "black"], avoid: ["blue"] },
  "dark blue": { great: ["white", "beige", "tan", "light grey", "ivory", "grey"], avoid: ["navy", "black"] },
  "brown": { great: ["beige", "white", "navy", "khaki", "ivory", "tan"], avoid: ["black", "grey"] },
  "dark brown": { great: ["beige", "white", "tan", "ivory", "khaki", "light blue", "light grey"], avoid: ["black"] },
  "burgundy": { great: ["black", "grey", "white", "beige", "navy", "charcoal", "light grey"], avoid: ["brown", "dark brown"] },
  "charcoal": { great: ["white", "light blue", "beige", "light grey", "ivory", "tan"], avoid: ["black", "dark grey"] },
  "khaki": { great: ["navy", "white", "light blue", "brown", "dark brown", "black"], avoid: ["beige", "tan"] },
  "tan": { great: ["navy", "white", "light blue", "brown", "charcoal", "dark blue"], avoid: ["beige", "khaki", "ivory"] },
  "ivory": { great: ["navy", "black", "dark brown", "charcoal", "burgundy", "dark blue"], avoid: ["white", "beige", "tan"] },
};

// Calculate how well colors in an outfit work together (max ~50 points)
function getColorHarmonyScore(topColor, bottomColor, shoeColor) {
  let score = 0;
  const topC = (topColor || "").toLowerCase();
  const botC = (bottomColor || "").toLowerCase();
  const shoeC = (shoeColor || "").toLowerCase();

  // ── Top ↔ Bottom harmony (most important) ──
  const topRules = COLOR_HARMONY[topC];
  if (topRules) {
    if (topRules.great.some(c => botC.includes(c) || botC === c)) score += 20;
    else if (topRules.avoid.some(c => botC.includes(c) || botC === c)) score -= 20;
  }

  // ── Bottom ↔ Shoes harmony ──
  const botRules = COLOR_HARMONY[botC];
  if (botRules) {
    if (botRules.great.some(c => shoeC.includes(c) || shoeC === c)) score += 15;
    else if (botRules.avoid.some(c => shoeC.includes(c) || shoeC === c)) score -= 15;
  }

  // ── Top ↔ Shoes harmony ──
  const shoeRules = COLOR_HARMONY[shoeC];
  if (topRules) {
    if (topRules.great.some(c => shoeC.includes(c) || shoeC === c)) score += 10;
    else if (topRules.avoid.some(c => shoeC.includes(c) || shoeC === c)) score -= 10;
  }

  // ── Penalty: all 3 pieces same color (looks boring) ──
  if (topC === botC && botC === shoeC) score -= 25;

  // ── Penalty: top = bottom same color (looks off) ──
  if (topC === botC) score -= 10;

  // ── Bonus: good contrast between light & dark ──
  const temps = [getColorTemp(topC), getColorTemp(botC), getColorTemp(shoeC)];
  const uniqueTemps = new Set(temps);
  if (uniqueTemps.size >= 2) score += 10;
  if (uniqueTemps.size === 3) score += 5; // even better variety

  return score;
}

// ── FULL OUTFIT IMAGES (Full-body photos by occasion + color scheme) ──
const FULL_OUTFIT_IMAGES = {
  casual: {
    light: [
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600&h=900&fit=crop&q=80",
    ],
    dark: [
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=900&fit=crop&q=80",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1480429370612-2cd74e8f27cd?w=600&h=900&fit=crop&q=80",
    ]
  },
  formal: {
    light: [
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=900&fit=crop&q=80",
    ],
    dark: [
      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=900&fit=crop&q=80",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=900&fit=crop&q=80",
    ]
  },
  wedding: {
    light: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&h=900&fit=crop&q=80",
    ],
    dark: [
      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=900&fit=crop&q=80",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=900&fit=crop&q=80",
    ]
  },
  party: {
    light: [
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=900&fit=crop&q=80",
    ],
    dark: [
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&h=900&fit=crop&q=80",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&h=900&fit=crop&q=80",
    ]
  },
  work: {
    light: [
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=900&fit=crop&q=80",
    ],
    dark: [
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&h=900&fit=crop&q=80",
    ],
    mixed: [
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=900&fit=crop&q=80",
    ]
  }
};

function getFullOutfitImage(occasion, topColor, bottomColor) {
  const occasionImages = FULL_OUTFIT_IMAGES[occasion] || FULL_OUTFIT_IMAGES["casual"];
  const topTemp = getColorTemp(topColor);
  const botTemp = getColorTemp(bottomColor);
  let scheme;
  if (topTemp === "light" || botTemp === "light") scheme = "light";
  else if (topTemp === "dark" && botTemp === "dark") scheme = "dark";
  else scheme = "mixed";
  const images = occasionImages[scheme] || occasionImages["mixed"];
  const key = (topColor || "") + (bottomColor || "") + occasion;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return images[Math.abs(hash) % images.length];
}

// ── WEATHER × OCCASION CROSS-RULES ──
const WEATHER_OCCASION_BONUS = {
  casual: {
    hot: { preferColors: ["white", "light blue", "beige", "light grey"], avoidColors: ["black"], seasonBonus: "summer" },
    cold: { preferColors: ["black", "navy", "dark blue", "grey", "charcoal"], avoidColors: [], seasonBonus: "winter" },
    rainy: { preferColors: ["dark blue", "navy", "black", "grey"], avoidColors: ["white", "beige"], seasonBonus: null },
  },
  formal: {
    hot: { preferColors: ["light blue", "beige", "white", "light grey"], avoidColors: ["black"], seasonBonus: "summer" },
    cold: { preferColors: ["navy", "charcoal", "black", "dark blue"], avoidColors: [], seasonBonus: "winter" },
    rainy: { preferColors: ["charcoal", "navy", "dark grey"], avoidColors: ["white", "ivory"], seasonBonus: null },
  },
  wedding: {
    hot: { preferColors: ["ivory", "light blue", "beige", "light grey", "white"], avoidColors: ["black"], seasonBonus: "summer" },
    cold: { preferColors: ["black", "navy", "charcoal", "burgundy"], avoidColors: [], seasonBonus: "winter" },
    rainy: { preferColors: ["charcoal", "navy", "dark brown"], avoidColors: ["white", "ivory"], seasonBonus: null },
  },
  party: {
    hot: { preferColors: ["white", "light blue", "beige"], avoidColors: [], seasonBonus: "summer" },
    cold: { preferColors: ["burgundy", "black", "navy", "charcoal"], avoidColors: [], seasonBonus: "winter" },
    rainy: { preferColors: ["black", "navy", "dark grey"], avoidColors: ["white"], seasonBonus: null },
  },
  work: {
    hot: { preferColors: ["light blue", "white", "beige", "khaki"], avoidColors: ["black"], seasonBonus: "summer" },
    cold: { preferColors: ["navy", "charcoal", "dark blue", "black"], avoidColors: [], seasonBonus: "winter" },
    rainy: { preferColors: ["navy", "charcoal", "grey"], avoidColors: ["white", "beige"], seasonBonus: null },
  },
};

function calculateItemScore(item, context) {
  let score = 50; // base score

  // ── AI VIBE MATCHING (+Vector Similarity) ──
  if (item.embedding && context.likedEmbeddings && context.likedEmbeddings.length > 0) {
    let maxSim = 0;
    for (const likedVec of context.likedEmbeddings) {
      const sim = cosineSimilarity(item.embedding, likedVec);
      if (sim > maxSim) maxSim = sim;
    }
    // sim is between -1 and +1. If very similar (>0.6), add up to 24 points
    if (maxSim > 0.6) {
      score += Math.floor((maxSim - 0.6) * 60);
    }
  }

  // ── STYLE MATCHING BONUS (+20) ──
  if (context.predominantStyle && context.predominantStyle !== "Neutral") {
    const itemScores = getItemStyleScores(item);
    const styleKey = Object.keys(STYLE_ARCHETYPES).find(k => STYLE_ARCHETYPES[k].name === context.predominantStyle);
    if (styleKey && itemScores[styleKey] >= 15) {
      score += 20;
    }
  }
  const itemColor = (item.color || "").toLowerCase();

  // ── 1. Favorite Color Match (+15) ──
  if (context.favoriteColors.length) {
    if (context.favoriteColors.some(c => itemColor.includes(c))) {
      score += 15;
    }
  }

  // ── 2. Season Match (+12 / -8) ──
  if (item.season === context.currentSeason || item.season === "mild") {
    score += 12;
  } else {
    score -= 8;
  }

  // ── 3. Weather Appropriateness (+10 / -10) ──
  if (context.weatherType === "hot") {
    if (item.season === "summer") score += 10;
    else if (item.season === "winter") score -= 10;
  } else if (context.weatherType === "cold") {
    if (item.season === "winter") score += 10;
    else if (item.season === "summer" && item.type === "tshirt") score -= 5;
  } else if (context.weatherType === "rainy") {
    if (itemColor === "white") score -= 5;
  }

  // ── 4. Weather × Occasion Cross-Logic (+8 / -8) ──
  if (context.occasion && context.weatherType) {
    const crossRules = WEATHER_OCCASION_BONUS[context.occasion]?.[context.weatherType];
    if (crossRules) {
      if (crossRules.preferColors.some(c => itemColor.includes(c))) score += 8;
      if (crossRules.avoidColors.some(c => itemColor.includes(c))) score -= 8;
      if (crossRules.seasonBonus && item.season === crossRules.seasonBonus) score += 5;
    }
  }

  // ── 5. Time-of-Day Influence (+8) ──
  const timeOfDay = context.timeOfDay || getTimeOfDay();
  const colorTemp = getColorTemp(itemColor);
  if (timeOfDay === "morning") {
    if (colorTemp === "light") score += 8;
    else if (colorTemp === "medium") score += 4;
  } else { // evening
    if (colorTemp === "dark") score += 8;
    else if (colorTemp === "medium") score += 4;
  }

  // ── 6. Sustainable Fashion Rotation ──
  // Promotes full wardrobe utilization — items worn less get priority
  const wc = item.wearCount || 0;
  const allItems = context._allItems || [];
  const avgWear = allItems.length > 0 ? allItems.reduce((s, i) => s + (i.wearCount || 0), 0) / allItems.length : 0;

  if (wc === 0) {
    // Never worn = strong boost (closet activation)
    score += 15;
  } else if (wc < avgWear * 0.5) {
    // Worn less than average = small boost
    score += 8;
  } else if (wc > avgWear * 2) {
    // Worn way more than average = heavy penalty (over-reliance)
    score -= 20;
  } else if (wc > avgWear * 1.5) {
    // Worn more than average = moderate penalty
    score -= 10;
  }

  // ── 7. Disliked Items Penalty (-50) ──
  if (context.dislikedItemNames && context.dislikedItemNames.includes(item.name)) {
    score -= 50;
  }

  // ── 8. Liked Items Bonus (+15) ──
  if (context.likedItemNames && context.likedItemNames.includes(item.name)) {
    score += 15;
  }

  // ── 9. Environment ──
  if (context.environment === "outdoor") {
    if (colorTemp === "light" || colorTemp === "medium") score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

// Get feedback patterns (disliked items, liked items, AND favorite color combos)
async function getFeedbackPatterns() {
  try {
    const disliked = await Feedback.find({ reaction: "disliked" }).sort({ createdAt: -1 }).limit(50);
    const liked = await Feedback.find({ reaction: "liked" }).sort({ createdAt: -1 }).limit(50);

    const dislikedItemNames = new Set();
    const likedItemNames = new Set();
    const dislikedCombos = [];

    disliked.forEach(f => {
      if (f.outfit?.top) dislikedItemNames.add(f.outfit.top);
      if (f.outfit?.bottom) dislikedItemNames.add(f.outfit.bottom);
      if (f.outfit?.shoes) dislikedItemNames.add(f.outfit.shoes);
      if (f.outfit) dislikedCombos.push({ top: f.outfit.top, bottom: f.outfit.bottom, shoes: f.outfit.shoes });
    });

    liked.forEach(f => {
      if (f.outfit?.top) likedItemNames.add(f.outfit.top);
      if (f.outfit?.bottom) likedItemNames.add(f.outfit.bottom);
      if (f.outfit?.shoes) likedItemNames.add(f.outfit.shoes);
    });

    // ── Color Combo Learning ──
    // Learn which color combinations the user likes most
    const comboMap = {};
    liked.forEach(f => {
      const colors = (f.outfit?.colors || "").split(" + ").map(c => c.trim().toLowerCase()).filter(Boolean);
      if (colors.length >= 2) {
        // Track top+bottom combo
        const key = `${colors[0]}|${colors[1]}`;
        comboMap[key] = (comboMap[key] || 0) + 1;
      }
    });
    // Get combos liked 2+ times
    const favoriteColorCombos = Object.entries(comboMap)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([combo, count]) => ({ colors: combo.split("|"), count }));

    return {
      dislikedItemNames: [...dislikedItemNames],
      likedItemNames: [...likedItemNames],
      dislikedCombos,
      favoriteColorCombos
    };
  } catch {
    return { dislikedItemNames: [], likedItemNames: [], dislikedCombos: [], favoriteColorCombos: [] };
  }
}

// ── SESSION TRACKING ──
// Tracks recently suggested outfits per session to prevent repeats
const sessionSuggestedOutfits = {}; // sessionId -> [{top, bottom, shoes}, ...]
const sessionShowMoreOffset = {};   // sessionId -> number (for smart show more)

function getSessionKey(outfit) {
  return `${outfit.top}|${outfit.bottom}|${outfit.shoes}`;
}

// ── CONFIDENCE SCORING ──
function getConfidenceLabel(score) {
  if (score >= 210) return { level: "perfect", label: "Perfect match! 🔥", percent: 95 };
  if (score >= 180) return { level: "great", label: "Great pick! 👍", percent: 85 };
  if (score >= 150) return { level: "good", label: "Good option 😊", percent: 70 };
  if (score >= 120) return { level: "decent", label: "Worth trying 🤔", percent: 55 };
  return { level: "low", label: "Best available 💡", percent: 40 };
}

// ── OUTFIT REASONING ──
function buildOutfitReason(top, bottom, shoe, context, harmonyScore, comboBonus) {
  const reasons = [];
  const topC = (top.color || "").toLowerCase();
  const botC = (bottom.color || "").toLowerCase();
  const style = context.predominantStyle || "Personal";

  // 1. Weather & Color Theory Bridge (ALWAYS shows)
  if (context.weatherType === "hot") {
    reasons.push(`☀️ Since it's warm, I chose a ${topC} palette to reflect heat and ensure breathability while maintaining a sharp ${style} silhouette.`);
  } else if (context.weatherType === "cold") {
    reasons.push(`🧥 Given the chill, these deep ${topC} tones provide visual warmth and a sophisticated layered look typical of ${style} fashion.`);
  } else {
    reasons.push(`⛅ A balanced ${topC} and ${botC} combination for a versatile ${style} vibe.`);
  }

  // 2. Sustainability / Closet Activation (priority slot)
  const topWear = top.wearCount || 0;
  const botWear = bottom.wearCount || 0;
  const shoeWear = shoe.wearCount || 0;
  const unwornCount = [top, bottom, shoe].filter(i => (i.wearCount || 0) === 0).length;
  if (unwornCount >= 2) {
    reasons.push(`♻️ Closet Activation: ${unwornCount} items here haven't been worn yet — rotating them in to maximize your wardrobe.`);
  } else if (topWear === 0 || botWear === 0) {
    reasons.push(`♻️ Sustainable pick: Bringing in a less-worn piece to keep your closet fresh and fully utilized.`);
  } else if (topWear > 5 || botWear > 5) {
    reasons.push(`♻️ These are wardrobe staples you rely on — consider mixing in less-worn pieces next time.`);
  } else {
    // Fallback: color harmony
    if (harmonyScore >= 25) {
      reasons.push(`🎨 High-contrast pairing creates perfect visual balance with ${style} principles.`);
    } else if (harmonyScore >= 10) {
      reasons.push(`🎨 Complementary tones that ground the outfit into a cohesive style canvas.`);
    }
  }

  // 3. Personalized Intelligence OR Time of Day
  if (comboBonus > 0) {
    reasons.push(`🧠 Fashion Intelligence: This palette mirrors your historically preferred patterns for ${style} archetypes.`);
  } else {
    const timeOfDay = context.timeOfDay || getTimeOfDay();
    if (timeOfDay === "morning") {
      reasons.push(`🌅 Lighter hues project energy and freshness for early hours.`);
    } else {
      reasons.push(`🌙 Deep, saturated tones that command presence in evening settings.`);
    }
  }

  return reasons.join(" | ");
}

// ── MAIN: Generate scored outfits ──
function generateScoredOutfits(tops, bottoms, shoes, caps, context, count = 1) {
  if (!tops.length || !bottoms.length || !shoes.length) return [];

  // Ensure caps is an array, if empty add [null] to allow the loop to run once
  const capPool = (caps && caps.length > 0) ? caps : [null];

  const candidates = [];
  const alreadySuggested = context.recentlySuggested || [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        for (const cap of capPool) {
          // Individual item scores
          const topScore = calculateItemScore(top, context);
          const bottomScore = calculateItemScore(bottom, context);
          const shoeScore = calculateItemScore(shoe, context);
          const capScore = cap ? calculateItemScore(cap, context) : 0;

          // Color harmony score for the whole outfit
          const harmonyScore = getColorHarmonyScore(top.color, bottom.color, shoe.color);

          // Check if this exact combo was disliked before
          let comboPenalty = 0;
          if (context.dislikedCombos) {
            const wasDisliked = context.dislikedCombos.some(d =>
              d.top === top.name && d.bottom === bottom.name && d.shoes === shoe.name
            );
            if (wasDisliked) comboPenalty = -100;
          }

          // Recently suggested penalty
          let recentPenalty = 0;
          const exactIndex = alreadySuggested.findIndex(k => k === `${top.name}|${bottom.name}|${shoe.name}`);
          if (exactIndex !== -1) recentPenalty -= (20 - exactIndex) * 100;

          const topIndex = alreadySuggested.findIndex(k => k.split("|")[0] === top.name);
          if (topIndex !== -1) recentPenalty -= (20 - topIndex) * 40;

          const bottomIndex = alreadySuggested.findIndex(k => k.split("|")[1] === bottom.name);
          if (bottomIndex !== -1) recentPenalty -= (20 - bottomIndex) * 40;

          const shoeIndex = alreadySuggested.findIndex(k => k.split("|")[2] === shoe.name);
          if (shoeIndex !== -1) recentPenalty -= (20 - shoeIndex) * 20;

          // Color combo learning bonus
          let comboBonus = 0;
          if (context.favoriteColorCombos && context.favoriteColorCombos.length) {
            const topC = (top.color || "").toLowerCase();
            const botC = (bottom.color || "").toLowerCase();
            for (const fav of context.favoriteColorCombos) {
              if ((topC.includes(fav.colors[0]) && botC.includes(fav.colors[1])) ||
                (topC.includes(fav.colors[1]) && botC.includes(fav.colors[0]))) {
                comboBonus = Math.min(fav.count * 5, 20);
                break;
              }
            }
          }

          // Total outfit score (include capScore if cap exists)
          const totalScore = topScore + bottomScore + shoeScore + capScore + harmonyScore + comboPenalty + recentPenalty + comboBonus;

          candidates.push({
            top: top.name, bottom: bottom.name, shoes: shoe.name, cap: cap ? cap.name : null,
            topObj: top, bottomObj: bottom, shoeObj: shoe, capObj: cap,
            colors: `${top.color} + ${bottom.color} + ${shoe.color}${cap ? ' + ' + cap.color : ''}`,
            occasion: top.occasion,
            score: totalScore,
            harmonyScore,
            comboBonus,
            images: {
              top: top.imageUrl || "https://placehold.co/400?text=Top",
              bottom: bottom.imageUrl || "https://placehold.co/400?text=Bottom",
              shoes: shoe.imageUrl || "https://placehold.co/400?text=Shoes",
              cap: cap ? (cap.imageUrl || "https://placehold.co/400?text=Cap") : null
            }
          });
        }
      }
    }
  }


  // Sort by total score (best first)
  candidates.sort((a, b) => b.score - a.score);

  // Pick top outfits ensuring diversity (no repeating top or bottom)
  const selected = [];
  for (const outfit of candidates) {
    const isDuplicate = selected.some(s =>
      s.top === outfit.top || s.bottom === outfit.bottom
    );
    if (!isDuplicate) {
      // Build reason and confidence
      const reason = buildOutfitReason(outfit.topObj, outfit.bottomObj, outfit.shoeObj, context, outfit.harmonyScore, outfit.comboBonus);
      const confidence = getConfidenceLabel(outfit.score);

      // Clean output (remove internal objects)
      selected.push({
        top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes, cap: outfit.cap,
        colors: outfit.colors,
        occasion: outfit.occasion,
        images: outfit.images,
        outfitImage: getFullOutfitImage(outfit.occasion, outfit.topObj.color, outfit.bottomObj.color),
        reason,
        confidence: confidence.label,
        confidencePercent: confidence.percent
      });
    }
    if (selected.length >= count) break;
  }

  // Label outfits
  if (selected[0]) selected[0].outfitType = "best_match";
  if (selected[1]) selected[1].outfitType = "alternative";

  return selected;
}

// Legacy function for daily outfit
function generateRandomOutfits(tops, bottoms, shoes, count = 1, preferredColors = []) {
  if (!tops.length || !bottoms.length || !shoes.length) return [];
  const context = {
    favoriteColors: preferredColors, currentSeason: getSeasonFromDate(),
    weatherType: "mild", dislikedItemNames: [], likedItemNames: [],
    dislikedCombos: [], favoriteColorCombos: [], environment: null,
    recentlySuggested: [], occasion: "casual", timeOfDay: getTimeOfDay()
  };
  return generateScoredOutfits(tops, bottoms, shoes, [], context, count);
}

// ── MAIN OUTFIT FETCHER ──
async function getOutfitsForOccasion(occasion, userId = "default", environment = null, forcedSeason = null, skipCaps = false) {
  const clothes = await Clothing.find({ occasion });
  if (!clothes.length) return null;

  // ✅ Smart type rules per occasion
  let topTypes, bottomTypes, shoeTypes;
  if (occasion === "casual") {
    topTypes = ["tshirt"];
    bottomTypes = ["jeans", "pants"];
    shoeTypes = ["shoes"];
  } else if (occasion === "formal" || occasion === "wedding") {
    topTypes = ["shirt"];
    bottomTypes = ["pants"];
    shoeTypes = ["shoes"];
  } else if (occasion === "work") {
    topTypes = ["shirt"];
    bottomTypes = ["pants"];
    shoeTypes = ["shoes"];
  } else if (occasion === "party") {
    topTypes = ["shirt"];
    bottomTypes = ["pants", "jeans"];
    shoeTypes = ["shoes"];
  } else {
    topTypes = ["tshirt", "shirt", "dress", "blouse"];
    bottomTypes = ["pants", "skirt", "jeans"];
    shoeTypes = ["shoes"];
  }

  const tops = clothes.filter(i => topTypes.includes(i.type));
  const bottoms = clothes.filter(i => bottomTypes.includes(i.type));
  const shoes = clothes.filter(i => shoeTypes.includes(i.type));
  const caps = skipCaps ? [] : clothes.filter(i => i.type && (i.type.toLowerCase() === "cap" || i.type.toLowerCase() === "hat"));

  if (!tops.length || !bottoms.length || !shoes.length) return null;

  // ── Build recommendation context ──
  const profile = await UserProfile.findOne({ userId });
  const favColors = profile?.favoriteColors || [];
  const weather = await getCurrentWeather();
  const season = forcedSeason || getSeasonFromDate();
  const time = getTimeOfDay();
  const feedbackData = await getFeedbackPatterns();

  // Get recently suggested outfits for this session to avoid repeats
  const sessionKey = userId;
  const recentlySuggested = (sessionSuggestedOutfits[sessionKey] || []).map(getSessionKey);

  // Get embeddings of all liked items to compute vibe matching
  const likedClothes = await Clothing.find({ name: { $in: feedbackData.likedItemNames } });
  const likedEmbeddings = likedClothes.filter(c => c.embedding && c.embedding.length > 0).map(c => c.embedding);

  const context = {
    likedEmbeddings,
    favoriteColors: favColors,
    currentSeason: season,
    weatherType: weather.weatherType,
    environment: environment,
    occasion: occasion,
    timeOfDay: time,
    temp: weather.temp ? `${weather.temp}°C` : null,
    dislikedItemNames: feedbackData.dislikedItemNames,
    likedItemNames: feedbackData.likedItemNames,
    dislikedCombos: feedbackData.dislikedCombos,
    favoriteColorCombos: feedbackData.favoriteColorCombos,
    recentlySuggested: recentlySuggested,
    predominantStyle: profile?.styleProfile?.predominantStyle || "Neutral",
    _allItems: clothes  // For sustainability scoring (avg wearCount)
  };

  // ── Generate scored outfits ──
  const outfits = generateScoredOutfits(tops, bottoms, shoes, caps, context);

  // Track suggested outfits in session memory
  if (!sessionSuggestedOutfits[sessionKey]) sessionSuggestedOutfits[sessionKey] = [];
  outfits.forEach(o => sessionSuggestedOutfits[sessionKey].push({ top: o.top, bottom: o.bottom, shoes: o.shoes }));
  // Keep only last 20 to prevent memory bloat
  if (sessionSuggestedOutfits[sessionKey].length > 20) {
    sessionSuggestedOutfits[sessionKey] = sessionSuggestedOutfits[sessionKey].slice(-20);
  }

  const saved = await SavedOutfit.find({ occasion }).sort({ savedAt: -1 }).limit(3);
  await Analytics.insertMany(outfits.map(o => ({ userId, occasion, weather: weather.weatherType, season, time, outfitSuggested: o })));
  return { outfits, saved, weather, season, time, profile };
}

// ── UPDATE USER BEHAVIOR ──
async function updateUserBehavior(userId, occasion, colors) {
  try {
    // Update favorite colors
    const liked = await Feedback.find({ userId, reaction: "liked" }).sort({ createdAt: -1 }).limit(30);
    const colorMap = {};
    liked.forEach(f => (f.outfit?.colors || "").split(" + ").forEach(c => {
      const k = c.trim().toLowerCase();
      if (k) colorMap[k] = (colorMap[k] || 0) + 1;
    }));
    const top5Colors = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    // Update favorite occasions
    const allAnalytics = await Analytics.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const occMap = {};
    allAnalytics.forEach(a => { if (a.occasion) occMap[a.occasion] = (occMap[a.occasion] || 0) + 1; });
    const top3Occasions = Object.entries(occMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    await UserProfile.findOneAndUpdate(
      { userId },
      { favoriteColors: top5Colors, favoriteOccasions: top3Occasions, updatedAt: new Date() },
      { upsert: true }
    );
    // Trigger style analysis
    await calculateUserStyleProfile(userId);
  } catch { }
}

async function getStyleInsights(userId) {
  try {
    const liked = await Feedback.find({ userId, reaction: "liked" }).limit(50);
    if (!liked.length) return null;

    const colorCounts = {};
    const typeCounts = {};
    const occasionCounts = {};
    const outfitFrequency = {};

    liked.forEach(f => {
      const outfit = f.outfit;
      if (!outfit) return;

      // Track items
      [outfit.top, outfit.bottom, outfit.shoes].forEach(item => {
        if (item) typeCounts[item] = (typeCounts[item] || 0) + 1;
      });

      // Track colors
      const colors = (outfit.colors || "").split(" + ");
      colors.forEach(c => {
        const clean = c.trim().toLowerCase();
        if (clean) colorCounts[clean] = (colorCounts[clean] || 0) + 1;
      });

      // Track full outfits
      const key = `${outfit.top}|${outfit.bottom}|${outfit.shoes}`;
      outfitFrequency[key] = (outfitFrequency[key] || 0) + 1;

      if (f.occasion) occasionCounts[f.occasion] = (occasionCounts[f.occasion] || 0) + 1;
    });

    const topColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    const topOccasions = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    // Most liked full outfit
    const topOutfitKey = Object.entries(outfitFrequency).sort((a, b) => b[1] - a[1])[0]?.[0];
    let topOutfitDetails = null;
    if (topOutfitKey) {
      const parts = topOutfitKey.split("|");
      topOutfitDetails = { top: parts[0], bottom: parts[1], shoes: parts[2] };
    }

    return { topColors, topTypes, topOccasions, topOutfitDetails };
  } catch (e) { return null; }
}


// ── GROQ CONVERSATION ──
const chatHistories = {};
const sessionEnvironments = {}; // stores indoor/outdoor per session

async function askGroq(sessionId, userMessage, systemPrompt) {
  if (!groq) return null;
  try {
    if (!chatHistories[sessionId]) chatHistories[sessionId] = [];
    chatHistories[sessionId].push({ role: "user", content: userMessage });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistories[sessionId]
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const reply = completion.choices[0]?.message?.content || null;

    if (reply) {
      chatHistories[sessionId].push({ role: "assistant", content: reply });
      if (chatHistories[sessionId].length > 20) {
        chatHistories[sessionId] = chatHistories[sessionId].slice(-20);
      }
    }

    return reply;
  } catch (err) {
    console.log("Groq error:", err.message);
    return null;
  }
}

async function buildSystemPrompt(userId, weather, events = []) {
  const profile = await UserProfile.findOne({ userId });
  const name = profile?.name || null;
  const favColors = profile?.favoriteColors?.length ? profile.favoriteColors.join(", ") : "none yet";
  const favOccasions = profile?.favoriteOccasions?.length ? profile.favoriteOccasions.join(", ") : "none yet";
  const totalLikes = profile?.totalLikes || 0;
  const season = getSeasonFromDate();
  const time = getTimeOfDay();

  // Enhanced Analytics & Calendar context
  const insights = await getStyleInsights(userId);
  const styleSummary = insights ? `Top colors: ${insights.topColors.join(", ")}, Top items: ${insights.topTypes.join(", ")}` : "none yet";

  const calData = await getUpcomingEvents();
  const eventList = calData.events.map(e => `${e.title || "Untitled"} (${e.source}${e.outfit ? ' - Outfit Booked' : ''})`).join(", ") || "none";
  const calStatus = calData.status || "unknown";

  return `You are Smart Wardrobe, a friendly personal fashion assistant chatbot.
You talk like a real friend — warm, casual, natural. Never robotic. 🎯

USER PROFILE:
- Name: ${name || "unknown"}
- Favorite colors: ${favColors}
- Favorite occasions: ${favOccasions}
- Style Archetype: ${profile?.styleProfile?.predominantStyle || "Neutral"}
- Style Insights: ${styleSummary}
- Total liked outfits: ${totalLikes}
- Season: ${season} | Time: ${time}
- Weather: ${weather.description}, ${weather.temp ? weather.temp + "°C" : "unknown"}
- Calendar Connection Status: ${calStatus}
- Upcoming events: ${eventList}

YOUR BEHAVIOR:
1. GREETING: If name is unknown, ask warmly. If known, use it naturally!
2. ANALYTICS: If user asks about their style, "eh aktr haga b7bha", or "view analytics":
   - Summarize their top colors/items from Style Insights.
   - Mention their most liked outfit if available.
   - Respond ONLY with: {"action": "view_analytics"}
3. CALENDAR CONNECTION: 
   - If Calendar Status is "failed", and user asks about their schedule, tell them warmly: "Lately I'm having trouble connecting to your Google Calendar. Could you try running 'node setup-calendar.js' again in the terminal to refresh our connection? 🔄"
   - If Calendar Status is "connected" but no events exist (eventList is "none"), tell them: "Your schedule looks totally clear for the next 48 hours! Perfect time to relax or plan a new outfit. 😎"
4. CALENDAR/EVENTS:
   - If an event exists in the Calendar list above, pick the next one.
   - If an outfit is already booked, tell them what it is!
   - If NO outfit is booked, suggest one! Respond ONLY with: {"action": "suggest_outfit", "occasion": "<detected_occasion>", "event": "<event_title>"}
5. BOOKING: If user likes a suggested outfit for an event, tell them "I'll book this for your <event_title>!"
   - Respond ONLY with: {"action": "schedule_outfit", "event": "<event_title>", "date": "<event_date>"}
6. OUTFIT SUGGESTIONS: When suggesting, always check their style insights and the current season/weather to stay consistent. If the user mentions a specific season or clothing style (like 'summer' or 'short sleeve'), prioritize that.
7. LANGUAGE: Respond ONLY in English. Do not use Arabic or Egyptian slang.
8. LENGTH: Keep it short (1-3 sentences).`;


}

// ===============================
// ROUTES
// ===============================

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ── FAST WEATHER ──
app.get("/weather", async (req, res) => {
  try {
    const weather = await getCurrentWeather();
    res.json({ weather: weather.description, temp: weather.temp ? `${weather.temp}°C` : "N/A", season: getSeasonFromDate(), time: getTimeOfDay(), city: weather.city });
  } catch { res.status(500).json({ error: "Error" }); }
});

// ── CLOTHES ──
app.get("/clothes", async (req, res) => {
  try { res.json(await Clothing.find()); } catch { res.status(500).json({ error: "Error" }); }
});
app.post("/clothes", async (req, res) => {
  try {
    let itemData = { ...req.body };

    // Auto-Tagging via Groq if missing basic fields
    if (!itemData.color || !itemData.type) {
      const tags = await autoTagClothing(itemData.name);
      if (tags) itemData = { ...itemData, ...tags };
    }

    // Auto-Embedding via local ML
    const textToEmbed = `${itemData.name} ${itemData.type || ''} ${itemData.color || ''} ${itemData.season || ''} ${itemData.occasion || ''}`;
    const embedding = await generateEmbeddingAsync(textToEmbed);
    if (embedding.length > 0) itemData.embedding = embedding;

    const item = new Clothing(itemData);
    await item.save();
    res.json({ message: "✅ Added with AI Analysis", item });
  }
  catch (e) { console.error(e); res.status(500).json({ error: "Error" }); }
});
app.put("/clothes/:id", async (req, res) => {
  try {
    const u = await Clothing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "✅ Updated", item: u });
  } catch { res.status(500).json({ error: "Error" }); }
});
app.delete("/clothes/:id", async (req, res) => {
  try { await Clothing.findByIdAndDelete(req.params.id); res.json({ message: "🗑️ Deleted" }); }
  catch { res.status(500).json({ error: "Error" }); }
});

// ── SAVED ──
app.post("/saved", async (req, res) => {
  try {
    const s = new SavedOutfit(req.body);
    if (!s.userId) s.userId = "default";
    await s.save();
    res.json({ message: "❤️ Saved!", saved: s });
  } catch { res.status(500).json({ error: "Error" }); }
});
app.get("/saved", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    res.json(await SavedOutfit.find({ userId }).sort({ savedAt: -1 }));
  } catch { res.status(500).json({ error: "Error" }); }
});
app.delete("/saved/:id", async (req, res) => {
  try { await SavedOutfit.findByIdAndDelete(req.params.id); res.json({ message: "🗑️ Removed" }); }
  catch { res.status(500).json({ error: "Error" }); }
});

// ── FEEDBACK ──
app.get("/feedback/liked", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    res.json(await Feedback.find({ userId, reaction: "liked" }).sort({ createdAt: -1 }).limit(50));
  }
  catch { res.status(500).json({ error: "Error" }); }
});
app.get("/feedback/disliked", async (req, res) => {
  try { res.json(await Feedback.find({ reaction: "disliked" }).sort({ createdAt: -1 }).limit(20)); }
  catch { res.status(500).json({ error: "Error" }); }
});
app.post("/feedback", async (req, res) => {
  try {
    await new Feedback(req.body).save();
    const userId = req.body.userId || "default";
    if (req.body.reaction === "liked") {
      await new UserHistory({
        userId, occasion: req.body.occasion,
        outfit: req.body.outfit,
        likedColors: (req.body.outfit?.colors || "").split(" + ")
      }).save();
      await UserProfile.findOneAndUpdate({ userId }, { $inc: { totalLikes: 1 }, updatedAt: new Date() }, { upsert: true });
      await updateUserBehavior(userId, req.body.occasion, req.body.outfit?.colors);
    }
    res.json({ message: req.body.reaction === "liked" ? "❤️ Glad you liked it!" : "👎 Thanks for the feedback!" });
  } catch { res.status(500).json({ error: "Error" }); }
});

// ── ANALYTICS ──
app.get("/analytics/recent", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    res.json(await Analytics.find({ userId }).sort({ createdAt: -1 }).limit(50));
  } catch { res.status(500).json({ error: "Error" }); }
});
app.get("/analytics", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const totalSuggestions = await Analytics.countDocuments({ userId });
    const totalLikes = await Feedback.countDocuments({ userId, reaction: "liked" });
    const totalDislikes = await Feedback.countDocuments({ userId, reaction: "disliked" });
    const totalSaved = await SavedOutfit.countDocuments({ userId });

    const occasionStats = await Analytics.aggregate([
      { $match: { userId } },
      { $group: { _id: "$occasion", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const weatherStats = await Analytics.aggregate([
      { $match: { userId } },
      { $group: { _id: "$weather", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const seasonStats = await Analytics.aggregate([
      { $match: { userId } },
      { $group: { _id: "$season", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ totalSuggestions, totalLikes, totalDislikes, totalSaved, occasionStats, weatherStats, seasonStats });
  } catch { res.status(500).json({ error: "Error" }); }
});

app.get("/analytics/style", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const insights = await getStyleInsights(userId);
    if (!insights) return res.json({ message: "No style data yet! Try liking some outfits first. 😊" });
    res.json(insights);
  } catch { res.status(500).json({ error: "Error" }); }
});

app.get("/analytics/style-profile", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const profile = await UserProfile.findOne({ userId });
    if (!profile || !profile.styleProfile || profile.styleProfile.predominantStyle === "Neutral") {
      const result = await calculateUserStyleProfile(userId);
      return res.json(result);
    }
    res.json(profile.styleProfile);
  } catch { res.status(500).json({ error: "Error" }); }
});


app.get("/analytics/top-outfits", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    // Find liked outfits
    const liked = await Feedback.find({ userId, reaction: "liked" }).sort({ createdAt: -1 }).limit(200);

    const outfitMap = {};
    liked.forEach(f => {
      const o = f.outfit;
      if (!o) return;
      // Unique key by items
      const key = `${o.top}|${o.bottom}|${o.shoes}`;
      if (!outfitMap[key]) {
        // Generate a dynamic name based on colors/occasion
        let name = "The Recommended Edge";
        if (o.colors) {
          const parts = o.colors.split(" + ");
          if (parts[0] === parts[1]) name = `Monochrome ${parts[0]} Look`;
          else name = `${parts[0]} & ${parts[1]} Duo`;
        }

        outfitMap[key] = {
          outfit: o,
          count: 0,
          name: name
        };
      }
      outfitMap[key].count++;
    });

    // Sort by popularity and take top 8
    const result = Object.values(outfitMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error" });
  }
});


// ── DAILY ──
app.get("/daily", async (req, res) => {
  try {
    const weather = await getCurrentWeather();
    const clothes = await Clothing.find({ occasion: "casual" });
    const tops = clothes.filter(i => ["tshirt", "shirt", "dress", "blouse"].includes(i.type));
    const bottoms = clothes.filter(i => ["pants", "skirt", "jeans"].includes(i.type));
    const shoes = clothes.filter(i => i.type === "shoes");
    const outfits = generateRandomOutfits(tops, bottoms, shoes, 1);
    res.json({ message: `Good ${getTimeOfDay()}! Here's your outfit 🌅`, weather, season: getSeasonFromDate(), outfit: outfits[0] });
  } catch { res.status(500).json({ error: "Error" }); }
});

// ── CALENDAR ──
app.get("/calendar/events", async (req, res) => {
  try {
    const events = await getUpcomingEvents();
    res.json({ events });
  } catch { res.status(500).json({ error: "Error" }); }
});

app.post("/calendar/schedule", async (req, res) => {
  try {
    const { date, eventTitle, outfit, userId = "default" } = req.body;
    const s = new ScheduledOutfit({ date: new Date(date), eventTitle, outfit, userId });
    await s.save();
    res.json({ message: "📅 Outfit scheduled!", scheduled: s });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.get("/calendar/debug", async (req, res) => {
  try {
    const calData = await getUpcomingEvents();
    res.json({
      status: calData.status,
      error: calData.error || null,
      eventsFound: calData.events.length,
      timestamp: new Date()
    });
  } catch (e) { res.status(500).json({ status: "failed", error: e.message }); }
});



// ── USER PROFILE ──
app.get("/profile/:userId", async (req, res) => {
  try { res.json(await UserProfile.findOne({ userId: req.params.userId }) || {}); }
  catch { res.status(500).json({ error: "Error" }); }
});

// ── CHATBOT (Groq-Powered) ──
app.post("/chatbot", async (req, res) => {
  const { message, city = "Cairo", sessionId = "default" } = req.body;
  if (!message) return res.json({ reply: "Please send a message." });

  try {
    const userId = sessionId;
    const weather = await getCurrentWeather(city);
    const events = [];
    const systemPrompt = await buildSystemPrompt(userId, weather, events);
    // ✅ Direct detection before Groq
    const msgLower = message.toLowerCase();
    let directOccasion = null;
    if (msgLower.includes("casual")) directOccasion = "casual";
    else if (msgLower.includes("formal")) directOccasion = "formal";
    else if (msgLower.includes("wedding")) directOccasion = "wedding";
    else if (msgLower.includes("party")) directOccasion = "party";
    else if (msgLower.includes("work")) directOccasion = "work";

    let directSeason = null;
    if (msgLower.includes("summer") || msgLower.includes("saif") || msgLower.includes("nos kom")) directSeason = "summer";
    else if (msgLower.includes("winter") || msgLower.includes("sheta") || msgLower.includes("kom kamel")) directSeason = "winter";
    else if (msgLower.includes("spring") || msgLower.includes("rabee")) directSeason = "spring";
    else if (msgLower.includes("autumn") || msgLower.includes("khareef")) directSeason = "autumn";

    // If message clearly asks for outfit suggestions with known occasion
    const isOutfitRequest = msgLower.includes("suggest") || msgLower.includes("outfit") ||
      msgLower.includes("show me") || msgLower.includes("show more") || msgLower.includes("more outfit");

    // Detect environment from message
    if (msgLower.includes("outdoor") || msgLower.includes("outside")) sessionEnvironments[sessionId] = "outdoor";
    else if (msgLower.includes("indoor") || msgLower.includes("inside")) sessionEnvironments[sessionId] = "indoor";
    const currentEnv = sessionEnvironments[sessionId] || null;

    // Detect "no cap" request
    const wantsNoCap = msgLower.includes("without cap") || msgLower.includes("no cap") || msgLower.includes("balash cap") || msgLower.includes("mn gher cap");

    if (isOutfitRequest && directOccasion) {
      const result = await getOutfitsForOccasion(directOccasion, userId, currentEnv, directSeason, wantsNoCap);
      if (result) {
        const { outfits, saved, profile, weather: w } = result;
        const name = profile?.name || "";
        const favColors = profile?.favoriteColors || [];

        // Build intro
        let introMsg = "Here are your outfits! 🎯";
        try {
          const outfitDesc = outfits.map((o, i) => `${i + 1}. ${o.top} + ${o.bottom} + ${o.shoes}`).join(", ");
          const introPrompt = `Write exactly 1-2 warm friendly sentences introducing these ${directOccasion} outfits for ${name || "the user"}. Favorite colors: ${favColors.join(", ") || "none"}. Outfits: ${outfitDesc}. Weather: ${w.description} ${w.temp}°C. Be personal and brief.`;
          const introReply = await askGroq(sessionId + "_intro", introPrompt, "You are a friendly fashion assistant. Keep it very short, 1-2 sentences max.");
          if (introReply) introMsg = introReply;
        } catch { }

        // ✅ SAVE TO HISTORY so AI remembers what it suggested
        if (!chatHistories[sessionId]) chatHistories[sessionId] = [];
        chatHistories[sessionId].push({
          role: "assistant",
          content: `I suggested some ${directOccasion} outfits for you: ` + outfits.map(o => `${o.top}, ${o.bottom}, and ${o.shoes}`).join(" | ")
        });

        return res.json({
          reply: introMsg,
          summary: `👔 ${directOccasion}  |  🌤️ ${w.description} ${w.temp ? w.temp + "°C" : ""}  |  📅 ${getSeasonFromDate()}  |  🕐 ${getTimeOfDay()}`,
          context: { occasion: directOccasion, season: getSeasonFromDate(), time: getTimeOfDay(), weather: w.description, weatherType: w.weatherType, temp: w.temp ? `${w.temp}°C` : "N/A", city: w.city },
          outfits,
          savedOutfits: saved
        });
      }
    }

    // ✅ Handle "Same Outfit" / Modification Request
    const isModification = msgLower.includes("same outfit") || msgLower.includes("nefs el ta2m") ||
      (msgLower.includes("without") && (msgLower.includes("cap") || msgLower.includes("hat")));

    if (isModification || msgLower.includes("show more") || msgLower.includes("more") || msgLower.includes("another") || msgLower.includes("other") ||
      msgLower.match(/\bshow me\b/) || msgLower.match(/\bshow it\b/) || msgLower.includes("tany")) {

      const lastAnalytic = await Analytics.findOne({ userId }).sort({ createdAt: -1 });
      if (lastAnalytic?.occasion) {

        let introMsg = "Here are some more outfits for you! 🔄";
        let targetOccasion = lastAnalytic.occasion;

        // If it's a "same outfit" request, we should try to find the last specific outfit suggested
        if (isModification && lastAnalytic.outfitSuggested) {
          const last = lastAnalytic.outfitSuggested;
          introMsg = "Sure! Here is the same outfit but " + (wantsNoCap ? "without the cap" : "modified as requested") + ". 😊";

          // Re-construct the same outfit instead of getting new ones
          // This avoids the 'recently suggested' penalty that would normally pick different items
          const weather = await getCurrentWeather(city);
          const sameOutfit = { ...last };
          if (wantsNoCap) {
            sameOutfit.cap = null;
            sameOutfit.capObj = null;
            if (sameOutfit.images) sameOutfit.images.cap = null;
            sameOutfit.colors = sameOutfit.colors.split(" + ").filter(c => !c.toLowerCase().includes("cap") && !c.toLowerCase().includes("hat")).join(" + ");
          }

          // Add to history
          if (!chatHistories[sessionId]) chatHistories[sessionId] = [];
          chatHistories[sessionId].push({
            role: "assistant",
            content: `I showed you the same outfit: ${sameOutfit.top}, ${sameOutfit.bottom}, and ${sameOutfit.shoes}` + (sameOutfit.cap ? ` with a ${sameOutfit.cap}` : " without the cap")
          });

          return res.json({
            reply: introMsg,
            summary: `👔 ${targetOccasion}  |  🌤️ ${weather.description} ${weather.temp ? weather.temp + "°C" : ""}  |  📅 ${getSeasonFromDate()}`,
            context: { occasion: targetOccasion, season: getSeasonFromDate(), time: getTimeOfDay(), weather: weather.description, weatherType: weather.weatherType, temp: weather.temp ? `${weather.temp}°C` : "N/A", city: weather.city },
            outfits: [sameOutfit],
            savedOutfits: []
          });
        }

        // Regular "show more" behavior
        const result = await getOutfitsForOccasion(targetOccasion, userId, sessionEnvironments[sessionId] || null, lastAnalytic.season, wantsNoCap);
        if (result) {
          const { outfits, saved, weather: w } = result;

          // Record analytics and record in history
          try {
            await new Analytics({ userId, occasion: targetOccasion, weather: w.description, season: getSeasonFromDate(), time: getTimeOfDay(), outfitSuggested: outfits[0] }).save();

            if (!chatHistories[sessionId]) chatHistories[sessionId] = [];
            chatHistories[sessionId].push({
              role: "assistant",
              content: `I suggested some more ${targetOccasion} outfits: ` + outfits.map(o => `${o.top}, ${o.bottom}, and ${o.shoes}`).join(" | ")
            });
          } catch (e) { }

          return res.json({
            reply: introMsg,
            summary: `👔 ${targetOccasion}  |  🌤️ ${w.description} ${w.temp ? w.temp + "°C" : ""}  |  📅 ${getSeasonFromDate()}  |  🕐 ${getTimeOfDay()}`,
            context: { occasion: targetOccasion, season: getSeasonFromDate(), time: getTimeOfDay(), weather: w.description, weatherType: w.weatherType, temp: w.temp ? `${w.temp}°C` : "N/A", city: w.city },
            outfits,
            savedOutfits: saved
          });
        }
      }
    }

    const groqReply = await askGroq(sessionId, message, systemPrompt);

    if (!groqReply) {
      return res.json({
        reply: "Sorry, something went wrong. Please try again!",
        context: { weather: weather.description, temp: weather.temp ? `${weather.temp}°C` : "N/A", season: getSeasonFromDate(), time: getTimeOfDay(), city: weather.city }
      });
    }

    // Check if Groq wants to save name
    const nameMatch = groqReply.match(/\{[^{}]*"action"\s*:\s*"save_name"[^{}]*\}/);
    if (nameMatch) {
      try {
        const parsed = JSON.parse(nameMatch[0]);
        if (parsed.name) {
          await UserProfile.findOneAndUpdate(
            { userId },
            { name: parsed.name, updatedAt: new Date() },
            { upsert: true, new: true }
          );
          return res.json({
            reply: `Nice to meet you, ${parsed.name}! 😊 I'll remember that. Say 'suggest outfit' whenever you're ready! 🎯`,
            context: { weather: weather.description, temp: weather.temp ? `${weather.temp}°C` : "N/A", season: getSeasonFromDate(), time: getTimeOfDay(), city: weather.city }
          });
        }
      } catch { }
    }

    // Check if Groq wants to view analytics
    if (groqReply.includes('"action": "view_analytics"')) {
      const insights = await getStyleInsights(userId);
      const topOutfits = await (await Feedback.find({ reaction: "liked" }).sort({ createdAt: -1 }).limit(10)).map(f => f.outfit);

      let analyticsMsg = "Based on your style... 📊";
      if (insights) {
        analyticsMsg = `You love ${insights.topColors.join(", ")} specifically! Most of your favorites are ${insights.topTypes.join(" and ")}.`;
        // Groq can polish this
        const polishPrompt = `Explain these style insights to ${profile?.name || "the user"} in a friendly, conversational way: ${JSON.stringify(insights)}. Mention their top color is ${insights.topColors[0]}. 1-2 sentences.`;
        const polished = await askGroq(sessionId + "_analytics", polishPrompt, "Friendly fashion assistant.");
        if (polished) analyticsMsg = polished;
      }

      return res.json({
        reply: analyticsMsg,
        analytics: insights,
        topOutfits: topOutfits.slice(0, 3)
      });
    }

    // Check if Groq wants to schedule outfit
    const scheduleMatch = groqReply.match(/\{[^{}]*"action"\s*:\s*"schedule_outfit"[^{}]*\}/);
    if (scheduleMatch) {
      try {
        const parsed = JSON.parse(scheduleMatch[0]);
        const lastSuggested = sessionSuggestedOutfits[sessionId]?.slice(-1)[0];
        if (lastSuggested && parsed.event && parsed.date) {
          const s = new ScheduledOutfit({ date: new Date(parsed.date), eventTitle: parsed.event, outfit: lastSuggested, userId });
          await s.save();
          return res.json({ reply: `Done! I've booked that outfit for your ${parsed.event}. 📅 You'll look great!` });
        }
      } catch { }
    }

    // Check if Groq wants to suggest outfits (support multiple action names)
    const jsonMatch = groqReply.match(/\{[^{}]*"action"\s*:\s*"(suggest_outfit|outfit_suggestion)"[^{}]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const occasion = parsed.occasion || (msgLower.includes("formal") ? "formal" : "casual");
        if (occasion) {
          // Update user behavior
          await updateUserBehavior(userId, occasion, null);

          // Force season if detected, otherwise let it be dynamic
          const result = await getOutfitsForOccasion(occasion, userId, sessionEnvironments[sessionId] || null, directSeason, wantsNoCap);
          if (!result) return res.json({ reply: `Hmm, I couldn't find clothes for ${occasion} right now!` });

          const { outfits, saved, profile, weather: w } = result;
          const name = profile?.name || "";
          const favColors = profile?.favoriteColors || [];

          let introMsg = `Here are your ${occasion} outfits! 🎯`;
          if (parsed.event) introMsg = `I found the perfect ${occasion} outfits for your ${parsed.event}! 🎯`;

          try {
            const outfitDesc = outfits.map((o, i) => `${i + 1}. ${o.top} + ${o.bottom} + ${o.shoes}`).join(", ");
            const introPrompt = `Write exactly 1-2 warm friendly sentences introducing these ${occasion} outfits for ${name || "the user"}. 
Event: ${parsed.event || "none"}.
Favorite colors: ${favColors.join(", ") || "none"}. 
Outfits: ${outfitDesc}. 
Weather: ${w.description} ${w.temp}°C.
If favorite colors match any outfit, mention it naturally.
Be personal and brief. No lists or bullet points. Respond exclusively in English.`;
            const introReply = await askGroq(sessionId + "_intro", introPrompt, "You are a friendly fashion assistant. Keep it very short, 1-2 sentences max.");
            if (introReply) introMsg = introReply;
          } catch { }

          return res.json({
            reply: introMsg,
            summary: `👔 ${occasion} ${parsed.event ? 'for ' + parsed.event : ''} | 🌤️ ${w.description} ${w.temp ? w.temp + "°C" : ""} | 📅 ${getSeasonFromDate()}`,
            context: { occasion, event: parsed.event, date: parsed.date, season: getSeasonFromDate(), time: getTimeOfDay(), weather: w.description, weatherType: w.weatherType, temp: w.temp ? `${w.temp}°C` : "N/A", city: w.city },
            outfits,
            savedOutfits: saved
          });
        }
      } catch { }
    }

    return res.json({
      reply: groqReply,
      context: { weather: weather.description, temp: weather.temp ? `${weather.temp}°C` : "N/A", season: getSeasonFromDate(), time: getTimeOfDay(), city: weather.city }
    });

  } catch (err) {
    console.log("Chatbot error:", err.message);
    return res.json({ reply: "Something went wrong. Please try again!" });
  }
});

// ── WEAR TRACKING ──
app.post("/clothes/:id/wear", async (req, res) => {
  try {
    const item = await Clothing.findByIdAndUpdate(
      req.params.id,
      { $inc: { wearCount: 1 } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    const costPerWear = item.wearCount > 0 && item.price ? (item.price / item.wearCount).toFixed(2) : null;
    res.json({ message: "✅ Wear recorded!", wearCount: item.wearCount, costPerWear });
  } catch { res.status(500).json({ error: "Error" }); }
});

// ── COST PER WEAR ANALYTICS ──
app.get("/analytics/cost-per-wear", async (req, res) => {
  try {
    const items = await Clothing.find({ wearCount: { $gt: 0 } }).sort({ wearCount: -1 });
    const result = items.map(i => ({
      name: i.name, type: i.type, occasion: i.occasion,
      price: i.price || 0,
      wearCount: i.wearCount,
      costPerWear: i.price && i.wearCount > 0 ? parseFloat((i.price / i.wearCount).toFixed(2)) : null,
      imageUrl: i.imageUrl || ""
    }));
    res.json(result);
  } catch { res.status(500).json({ error: "Error" }); }
});

// ── CRON 7AM ──
cron.schedule("0 7 * * *", async () => {
  try {
    const weather = await getCurrentWeather();
    const clothes = await Clothing.find({ occasion: "casual" });
    const tops = clothes.filter(i => ["tshirt", "shirt", "dress", "blouse"].includes(i.type));
    const bottoms = clothes.filter(i => ["pants", "skirt", "jeans"].includes(i.type));
    const shoes = clothes.filter(i => i.type === "shoes");
    const outfits = generateRandomOutfits(tops, bottoms, shoes, 1);
    if (outfits.length) console.log(`\n🔔 Daily: ${outfits[0].top} | ${weather.description} ${weather.temp}°C\n`);
  } catch (err) { console.log("❌ Daily:", err.message); }
});

// ── START ──
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       🚀 SMART WARDROBE SERVER         ║
╠════════════════════════════════════════╣
║  🔥 Port  : ${PORT}                         ║
║  ⚡ LLM   : Groq (llama-3.1-8b)       ║
║  💬 Chat  : Smart Conversation         ║
║  👤 User  : Profile + Behavior         ║
║  🎨 Style : Color + Occasion Learning  ║
╚════════════════════════════════════════╝
  `);
});
