// ===============================
// GOOGLE CALENDAR AUTH SETUP
// Run this ONCE to get token.json
// ===============================

const { google } = require("googleapis");
const fs = require("fs");
const readline = require("readline");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const CREDENTIALS_PATH = "./credentials.json";
const TOKEN_PATH = "./token.json";

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\n╔════════════════════════════════════════╗");
console.log("║   📅 GOOGLE CALENDAR AUTH SETUP        ║");
console.log("╚════════════════════════════════════════╝");
console.log("\n1️⃣  Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2️⃣  Login with your Google account");
console.log("3️⃣  Copy the code and paste it below\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Paste the code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log("\n✅ token.json saved successfully!");
    console.log("📅 Google Calendar is now connected!");
    console.log("🚀 Now run: node server.js\n");
  } catch (err) {
    console.log("\n❌ Error:", err.message);
  }
});
