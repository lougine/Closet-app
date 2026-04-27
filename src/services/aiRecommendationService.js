// Color temperature classification
const DARK_COLORS = ["black", "navy", "dark blue", "charcoal", "dark brown", "dark grey", "burgundy"];
const LIGHT_COLORS = ["white", "beige", "ivory", "tan", "light blue", "light grey", "nude"];

function getColorTemp(color) {
  const c = (color || "").toLowerCase();
  if (DARK_COLORS.some(d => c.includes(d))) return "dark";
  if (LIGHT_COLORS.some(l => c.includes(l))) return "light";
  return "medium";
}

const STYLE_ARCHETYPES = {
  minimalist: { name: "Minimalist", colors: ["black", "white", "grey", "light grey", "dark grey", "beige", "navy"], forbiddenColors: ["yellow", "red", "green", "orange", "purple", "pink"], keywords: ["plain", "basic", "simple", "clean", "minimal", "essential"], types: ["tshirt", "shirt", "pants", "jacket"] },
  old_money: { name: "Old Money", colors: ["navy", "beige", "cream", "ivory", "tan", "burgundy", "dark brown", "white", "forest green"], forbiddenColors: ["yellow", "neon", "orange"], keywords: ["classic", "linen", "knit", "oxford", "wool", "silk", "loafers", "blazer", "chino", "premium", "formal"], types: ["shirt", "pants", "shoes", "jacket"] },
  streetwear: { name: "Streetwear", colors: ["black", "white", "vibrant", "red", "yellow", "blue", "green"], forbiddenColors: ["cream", "beige", "ivory"], keywords: ["graphic", "oversized", "hoodie", "street", "baggy", "cargo", "sneakers", "cap", "distressed", "denim", "camo"], types: ["tshirt", "hoodie", "jeans", "shoes", "cap"] }
};

function getItemStyleScores(item) {
  const scores = { minimalist: 0, old_money: 0, streetwear: 0 };
  const name = (item.name || "").toLowerCase();
  const color = (item.color || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  for (const [key, archetype] of Object.entries(STYLE_ARCHETYPES)) {
    if (archetype.colors.some(c => color.includes(c))) scores[key] += 10;
    if (archetype.forbiddenColors && archetype.forbiddenColors.some(c => color.includes(c))) scores[key] -= 15;
    if (archetype.keywords.some(k => name.includes(k))) scores[key] += 15;
    if (archetype.types.includes(category)) scores[key] += 5;
  }
  return scores;
}

const COLOR_HARMONY = {
  "black": { great: ["white", "grey", "beige", "light blue", "light grey", "ivory", "tan"], avoid: [] },
  "white": { great: ["black", "navy", "blue", "dark blue", "charcoal", "grey", "burgundy", "brown", "dark brown"], avoid: [] },
  "navy": { great: ["white", "beige", "light blue", "tan", "grey", "light grey", "ivory", "khaki"], avoid: ["black", "dark blue"] },
  "grey": { great: ["black", "white", "navy", "blue", "burgundy", "light blue"], avoid: ["dark grey"] },
  "beige": { great: ["navy", "white", "brown", "dark blue", "black", "dark brown", "charcoal"], avoid: ["ivory", "tan", "light grey"] },
  "blue": { great: ["white", "beige", "grey", "black", "tan", "light grey"], avoid: ["navy", "dark blue"] },
  "brown": { great: ["beige", "white", "navy", "khaki", "ivory", "tan"], avoid: ["black", "grey"] },
};

function getColorHarmonyScore(topColor, bottomColor, shoeColor) {
  let score = 0;
  const topC = (topColor || "").toLowerCase();
  const botC = (bottomColor || "").toLowerCase();
  const shoeC = (shoeColor || "").toLowerCase();
  const topRules = COLOR_HARMONY[topC];
  if (topRules) {
    if (topRules.great.some(c => botC.includes(c) || botC === c)) score += 20;
    else if (topRules.avoid.some(c => botC.includes(c) || botC === c)) score -= 20;
  }
  if (topC === botC && botC === shoeC) score -= 25;
  if (topC === botC) score -= 10;
  return Math.max(score, -30);
}

function calculateItemScore(item, context) {
  let score = 50;
  const itemColor = (item.color || "").toLowerCase();
  if (context.favoriteColors && context.favoriteColors.some(c => itemColor.includes(c))) score += 15;
  if (item.season === context.currentSeason) score += 12; else score -= 8;
  if (context.dislikedItemNames && context.dislikedItemNames.includes(item.name)) score -= 50;
  if (context.likedItemNames && context.likedItemNames.includes(item.name)) score += 15;
  return Math.max(0, Math.min(100, score));
}

function generateScoredOutfits(garments, context, count = 3) {
  const tops = garments.filter(g => /top|shirt|blouse/i.test(g.category));
  const bottoms = garments.filter(g => /bottom|pant|jean|skirt/i.test(g.category));
  const shoes = garments.filter(g => /footwear|shoe/i.test(g.category));
  if (!tops.length || !bottoms.length || !shoes.length) return [];
  const candidates = [];
  tops.forEach(top => {
    bottoms.forEach(bottom => {
      shoes.forEach(shoe => {
        const topScore = calculateItemScore(top, context);
        const bottomScore = calculateItemScore(bottom, context);
        const shoeScore = calculateItemScore(shoe, context);
        const harmonyScore = getColorHarmonyScore(top.color, bottom.color, shoe.color);
        const totalScore = topScore + bottomScore + shoeScore + harmonyScore;
        candidates.push({
          score: totalScore,
          garments: [top, bottom, shoe],
          reason: "Color harmony looks great. Perfect for " + (context.currentSeason || "the") + " season."
        });
      });
    });
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, count);
}

module.exports = {
  generateScoredOutfits,
  getColorTemp,
  getItemStyleScores,
};
