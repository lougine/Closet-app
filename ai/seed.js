// ===============================
// SMART WARDROBE - SEED DATA
// Real Male Clothing + Prices
// Run: node seed.js
// ===============================

require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ Error:", err));

const clothingSchema = new mongoose.Schema({
  name: String, type: String, color: String,
  season: String, occasion: String, gender: String,
  imageUrl: String, price: Number, wearCount: Number, embedding: [Number]
});
const Clothing = mongoose.model("Clothing", clothingSchema);

const fs = require('fs');
let clothes = [];
try {
  clothes = JSON.parse(fs.readFileSync('./extracted-good-data.json', 'utf8'));
  console.log(`👕 Loaded ${clothes.length} real items from closet-app data ONLY!`);
} catch (e) {
  console.log("No extracted data found or error loading it.", e.message);
}

async function seedData() {
  try {
    await Clothing.deleteMany({});
    console.log("🗑️  Old data cleared");

    console.log("🤖 Loading AI Embeddings model... (This may take a minute on first run)");
    const { pipeline } = await import('@xenova/transformers');
    const generator = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    console.log("🧠 Generating Vector Embeddings for all items...");
    for (const item of clothes) {
      const textToEmbed = `${item.name} ${item.type || ''} ${item.color || ''} ${item.season || ''} ${item.occasion || ''}`;
      const output = await generator(textToEmbed, { pooling: 'mean', normalize: true });
      item.embedding = Array.from(output.data);
    }

    await Clothing.insertMany(clothes);
    console.log(`✅ ${clothes.length} clothing items added!\n`);

    const occasions = ["casual", "formal", "work", "party", "wedding"];
    for (const occ of occasions) {
      const items = clothes.filter(c => c.occasion === occ);
      const totalValue = items.reduce((sum, c) => sum + c.price, 0);
      console.log(`  👔 ${occ.toUpperCase().padEnd(8)} → ${items.length} items | Total value: ${totalValue} EGP`);
    }

    console.log("\n🚀 Ready! Run: node server.js\n");
    mongoose.connection.close();
  } catch (err) {
    console.log("❌ Error:", err);
    mongoose.connection.close();
  }
}

seedData();
