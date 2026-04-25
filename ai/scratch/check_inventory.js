const mongoose = require('mongoose');

async function summarizeDB() {
    await mongoose.connect('mongodb://127.0.0.1:27017/smartWardrobe');
    
    const Clothing = mongoose.model('Clothing', new mongoose.Schema({
        name: String, type: String, color: String, occasion: String, season: String
    }));

    const total = await Clothing.countDocuments();
    const types = await Clothing.distinct('type');
    const colors = await Clothing.distinct('color');
    const occasions = await Clothing.distinct('occasion');
    
    console.log(`Total items in closet: ${total}`);
    console.log(`Types: ${types.join(', ')}`);
    console.log(`Colors: ${colors.join(', ')}`);
    console.log(`Occasions: ${occasions.join(', ')}`);
    
    console.log("\nSample Items:");
    const samples = await Clothing.find().limit(10);
    samples.forEach(s => console.log(`- ${s.name} (${s.type}, ${s.color}, ${s.occasion})`));

    process.exit();
}

summarizeDB();
