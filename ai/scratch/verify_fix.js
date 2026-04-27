const axios = require('axios');

async function verify() {
  const SESSION_ID = "test_session_" + Date.now();
  const BASE_URL = "http://localhost:5000";

  console.log("1. Sending Feedback...");
  await axios.post(`${BASE_URL}/feedback`, {
    userId: SESSION_ID,
    reaction: "liked",
    occasion: "casual",
    outfit: { top: "White T-Shirt", bottom: "Blue Jeans", shoes: "White Sneakers", colors: "white + blue" }
  });

  console.log("2. Checking Analytics...");
  const res = await axios.get(`${BASE_URL}/analytics?userId=${SESSION_ID}`);
  console.log("Analytics for session:", JSON.stringify(res.data, null, 2));

  if (res.data.totalLikes === 1) {
    console.log("✅ Success: Analytics filtered by userId!");
  } else {
    console.log("❌ Failure: Analytics showing global data or missing new record.");
  }
}

verify().catch(e => console.error("Error during verification:", e.message));
