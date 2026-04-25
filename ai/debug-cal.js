const { google } = require("googleapis");
const fs = require("fs");
const mongoose = require("mongoose");

// Schemas
const scheduledOutfitSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  eventTitle: String,
  outfit: Object,
  userId: { type: String, default: "default" },
  createdAt: { type: Date, default: Date.now }
});
const ScheduledOutfit = mongoose.model("ScheduledOutfit", scheduledOutfitSchema);

function getCalendarClient() {
  try {
    const creds = JSON.parse(fs.readFileSync("./credentials.json"));
    const token = JSON.parse(fs.readFileSync("./token.json"));
    const { client_secret, client_id, redirect_uris } = creds.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    auth.setCredentials(token);
    return auth;
  } catch (e) {
    console.error("  ❌ Google Calendar Auth Fail:", e.message);
    return null;
  }
}

async function getUpcomingEvents() {
  try {
    const auth = getCalendarClient();
    if (!auth) return { events: [], status: "failed", error: "Auth missing" };
    const cal = google.calendar({ version: "v3", auth });
    const now = new Date();
    console.log("Current Time (now):", now.toISOString());
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Google API timeout (5s)")), 5000));
    const calPromise = cal.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 48 * 3600000).toISOString(),
      singleEvents: true, orderBy: "startTime", maxResults: 10
    });
    const res = await Promise.race([calPromise, timeoutPromise]);
    console.log("Raw Google Response Count:", res.data.items?.length);
    const googleEvents = (res.data.items || []).map(e => ({
      title: e.summary,
      time: e.start?.dateTime || e.start?.date,
      source: "google"
    }));

    const localEvents = await ScheduledOutfit.find({
      date: { $gte: now, $lte: new Date(now.getTime() + 48 * 3600000) }
    });

    const merged = [...googleEvents];
    return { events: merged.sort((a, b) => new Date(a.time) - new Date(b.time)), status: "connected" };
  } catch (e) {
    console.error("  ❌ API Fail:", e.message);
    return { events: [], status: "failed", error: e.message };
  }
}

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/smartWardrobe');
    const result = await getUpcomingEvents();
    console.log("FINAL_RESULT:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
