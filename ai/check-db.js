const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe").then(async () => {
    const db = mongoose.connection.db;
    const withImages = await db.collection("clothings").countDocuments({imageUrl: {$exists: true}});
    const withoutImages = await db.collection("clothings").countDocuments({imageUrl: {$exists: false}});
    console.log("With:", withImages, "Without:", withoutImages);
    
    // Check one without image
    const oneMissing = await db.collection("clothings").findOne({imageUrl: {$exists: false}});
    console.log("Missing example:", oneMissing);

    process.exit(0);
});
