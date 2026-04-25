// ===============================
// AUTO FETCH IMAGES FOR CLOTHES
// Run: node fetch-images.js
// ===============================

require("dotenv").config();
const mongoose = require("mongoose");
const axios    = require("axios");

mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => { console.log("❌ MongoDB Error:", err); process.exit(1); });

const clothingSchema = new mongoose.Schema({}, { strict: false });
const Clothing = mongoose.model("Clothing", clothingSchema);

// Search for image using DuckDuckGo
async function searchImage(query) {
  try {
    const searchQuery = encodeURIComponent(query + " clothing fashion white background");
    const url = `https://api.duckduckgo.com/?q=${searchQuery}&format=json&iax=images&ia=images`;
    const res = await axios.get(url, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });

    // Try to get image from results
    if (res.data && res.data.Image && res.data.Image.length > 0) {
      return res.data.Image;
    }

    // Try RelatedTopics
    if (res.data && res.data.RelatedTopics && res.data.RelatedTopics.length > 0) {
      for (const topic of res.data.RelatedTopics) {
        if (topic.Icon && topic.Icon.URL && topic.Icon.URL.length > 5) {
          return topic.Icon.URL;
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

// Fallback: use a curated static image based on type and color
function getFallbackImage(type, color, occasion) {
  const baseImages = {
    // T-shirts & tops
    "tshirt_white":   "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
    "tshirt_black":   "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80",
    "tshirt_grey":    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80",
    "tshirt_navy":    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80",
    "tshirt_beige":   "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=80",

    // Shirts
    "shirt_white":      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80",
    "shirt_light blue": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80",
    "shirt_black":      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
    "shirt_navy":       "https://images.unsplash.com/photo-1603251578711-3290ca1a0187?w=400&q=80",
    "shirt_grey":       "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=400&q=80",
    "shirt_burgundy":   "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=400&q=80",

    // Jeans & pants
    "jeans_blue":       "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    "jeans_black":      "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=400&q=80",
    "jeans_dark blue":  "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400&q=80",
    "jeans_light blue": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
    "pants_black":      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
    "pants_navy":       "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80",
    "pants_grey":       "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80",
    "pants_khaki":      "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&q=80",
    "pants_beige":      "https://images.unsplash.com/photo-1560060141-827c8dafa8cb?w=400&q=80",
    "pants_charcoal":   "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80",

    // Shoes
    "shoes_white":      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    "shoes_black":      "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=400&q=80",
    "shoes_grey":       "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80",
    "shoes_brown":      "https://images.unsplash.com/photo-1531310197839-ccf54634509e?w=400&q=80",
    "shoes_dark brown": "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80",
    "shoes_tan":        "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&q=80",
    "shoes_beige":      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80",
    "shoes_burgundy":   "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400&q=80",
    "shoes_navy":       "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&q=80",
  };

  const key1 = type + "_" + color.toLowerCase();
  const key2 = type + "_" + color.toLowerCase().split(" ")[0];

  if (baseImages[key1]) return baseImages[key1];
  if (baseImages[key2]) return baseImages[key2];

  // Generic fallbacks by type
  const genericFallbacks = {
    "tshirt": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
    "shirt":  "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80",
    "jeans":  "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    "pants":  "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&q=80",
    "shoes":  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
  };

  return genericFallbacks[type] || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80";
}

async function fetchAllImages() {
  const clothes = await Clothing.find({});
  console.log(`\n📦 Found ${clothes.length} clothing items\n`);

  let updated = 0;
  let skipped = 0;

  for (const item of clothes) {
    if (item.imageUrl && item.imageUrl.length > 10) {
      console.log(`⏭️  Skip: ${item.name} (already has image)`);
      skipped++;
      continue;
    }

    const imgUrl = getFallbackImage(item.type, item.color, item.occasion);
    await Clothing.findByIdAndUpdate(item._id, { $set: { imageUrl: imgUrl } });
    console.log(`✅ ${item.name} → image added`);
    updated++;
  }

  console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}\n`);
  mongoose.connection.close();
}

fetchAllImages().catch(err => {
  console.log("❌ Error:", err);
  mongoose.connection.close();
});
