const mongoose = require('mongoose');
const path = require('path');

// Mock data and functions from server.js (since it's a script)
const STYLE_ARCHETYPES = {
  minimalist: { name: "Minimalist", colors: ["black", "white", "grey", "beige", "navy"], forbiddenColors: ["yellow", "red", "green"], keywords: ["plain", "basic", "simple"], types: ["tshirt", "shirt"] },
  old_money: { name: "Old Money", colors: ["navy", "beige", "cream", "ivory", "burgundy"], forbiddenColors: ["yellow", "neon"], keywords: ["classic", "linen", "knit"], types: ["shirt", "pants"] },
  streetwear: { name: "Streetwear", colors: ["black", "white", "red"], forbiddenColors: ["cream", "beige"], keywords: ["graphic", "oversized", "hoodie"], types: ["tshirt", "hoodie", "jeans"] }
};

function getItemStyleScores(item) {
  const scores = { minimalist: 0, old_money: 0, streetwear: 0 };
  const name = (item.name || "").toLowerCase();
  const color = (item.color || "").toLowerCase();
  const type = (item.type || "").toLowerCase();

  for (const [key, archetype] of Object.entries(STYLE_ARCHETYPES)) {
    if (archetype.colors.some(c => color.includes(c))) scores[key] += 10;
    if (archetype.forbiddenColors && archetype.forbiddenColors.some(c => color.includes(c))) scores[key] -= 15;
    if (archetype.keywords.some(k => name.includes(k))) scores[key] += 15;
    if (archetype.types.includes(type)) scores[key] += 5;
  }
  return scores;
}

const testItems = [
  { name: "Plain White Tshirt", color: "white", type: "tshirt" },
  { name: "Classic Linen Shirt", color: "beige", type: "shirt" },
  { name: "Graphic Hoodie", color: "black", type: "hoodie" },
  { name: "Neon Yellow Jacket", color: "yellow", type: "jacket" }
];

console.log("--- Style Detection Test ---");
testItems.forEach(item => {
  const scores = getItemStyleScores(item);
  console.log(`\nItem: ${item.name}`);
  console.log(`Scores:`, scores);
  const top = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
  console.log(`Detected: ${scores[top[0]] > 0 ? STYLE_ARCHETYPES[top[0]].name : "Neutral"}`);
});
