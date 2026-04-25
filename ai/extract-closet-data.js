const mongoose = require("mongoose");
const fs = require("fs");

const MONGO_URI = "mongodb://ramyysameh:ramy2002@ac-zmsxr4g-shard-00-00.tc1dvzf.mongodb.net:27017,ac-zmsxr4g-shard-00-01.tc1dvzf.mongodb.net:27017,ac-zmsxr4g-shard-00-02.tc1dvzf.mongodb.net:27017/?authSource=admin&replicaSet=atlas-w109pz-shard-0&w=majority&tls=true&appName=Cluster0";
const MONGO_DB_NAME = "digital_wardrobe";

async function extract() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
    console.log("✅ Connected to digital_wardrobe database.");
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log("Collections found:", collections.map(c => c.name));
    
    const data = {};
    for (let col of collections) {
      const docs = await db.collection(col.name).find({}).limit(200).toArray();
      data[col.name] = docs;
    }
    
    fs.writeFileSync("closet-data-sample.json", JSON.stringify(data, null, 2));
    console.log("✅ Data successfully extracted to closet-data-sample.json");
  } catch (err) {
    console.error("❌ Error extracting data:", err);
  } finally {
    mongoose.connection.close();
  }
}

extract();
