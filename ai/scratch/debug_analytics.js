const mongoose = require("mongoose");

async function checkData() {
  await mongoose.connect("mongodb://127.0.0.1:27017/smartWardrobe");
  
  const Feedback = mongoose.model("Feedback", new mongoose.Schema({ userId: String, reaction: String, outfit: Object }));
  const Analytics = mongoose.model("Analytics", new mongoose.Schema({ occasion: String, outfitSuggested: Object }));
  const UserProfile = mongoose.model("UserProfile", new mongoose.Schema({ userId: String, name: String }));

  const feedbacks = await Feedback.find().limit(10);
  const profiles = await UserProfile.find().limit(10);
  const analyticsCount = await Analytics.countDocuments();

  console.log("--- Feedbacks ---");
  console.log(JSON.stringify(feedbacks, null, 2));
  
  console.log("--- Profiles ---");
  console.log(JSON.stringify(profiles, null, 2));

  console.log("Total Analytics Docs:", analyticsCount);

  process.exit();
}

checkData();
