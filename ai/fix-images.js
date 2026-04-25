require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe")
  .then(async () => {
    const Clothing = mongoose.model("Clothing", new mongoose.Schema({}, { strict: false }));
    const fixes = {
      "Navy Hoodie": "https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=400"
    };
    for (const [name, url] of Object.entries(fixes)) {
      await Clothing.updateMany({ name }, { $set: { imageUrl: url } });
    }
    console.log("Images fixed.");
    process.exit(0);
  });
