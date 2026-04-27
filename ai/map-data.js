const fs = require('fs');

const data = JSON.parse(fs.readFileSync('closet-data-sample.json', 'utf8'));

const garments = data.garments || [];

const mappedGarments = garments
  .filter(g => g.category !== "Accessories" && g.imageUrl) // Skip accessories and missing images
  .map(g => {
    // Basic type mapping
    let type = "tshirt";
    const rawCategory = g.category || "";
    const rawName = (g.name || "").toLowerCase();

    if (rawCategory === "Footwear") type = "shoes";
    else if (rawCategory === "Outerwear") type = "jacket";
    else if (rawCategory === "Tops") {
      if (rawName.includes("shirt") && !rawName.includes("tshirt")) type = "shirt";
      else if (rawName.includes("hoodie")) type = "tshirt"; // or hoodie if we had it
      else type = "tshirt";
    }
    else if (rawCategory === "Bottoms") {
      if (rawName.includes("jeans")) type = "jeans";
      else type = "pants";
    }

    // Capitalize helpers
    const capType = type.charAt(0).toUpperCase() + type.slice(1);
    const capColor = (g.color || "Mixed").split(" ")[0];
    const finalColor = capColor.charAt(0).toUpperCase() + capColor.slice(1);

    // Occasion logic
    let occasion = "casual";
    if (type === "shoes" && (g.purchasePrice > 2000 || rawName.includes("formal"))) occasion = "formal";
    if (rawName.includes("work") || rawName.includes("office")) occasion = "work";

    return {
      name: `${finalColor} ${capType}`,
      type: type,
      color: (g.color || "mixed").toLowerCase(),
      season: g.season || "mild",
      occasion: occasion,
      gender: "male",
      imageUrl: g.imageUrl,
      price: g.purchasePrice || Math.floor(Math.random() * 500) + 100,
      wearCount: 0
    };
  });

fs.writeFileSync('extracted-good-data.json', JSON.stringify(mappedGarments, null, 2));

console.log(`Successfully mapped ${mappedGarments.length} high-quality garments to new schema in extracted-good-data.json`);
