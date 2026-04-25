const axios = require('axios');

async function test() {
    const sessionId = "test_user_" + Date.now();
    console.log("--- STARTING CHATBOT CONTEXT TEST ---");
    
    // 1. Suggest casual outfit
    console.log("\n1. Asking for casual outfit...");
    const res1 = await axios.post('http://localhost:5000/chatbot', {
        message: "suggest casual outfit for me today",
        sessionId: sessionId
    });
    console.log("Reply:", res1.data.reply);
    if (res1.data.outfits) {
        console.log("Suggested:", res1.data.outfits[0].top, "+", res1.data.outfits[0].bottom);
        console.log("Style Reason:", res1.data.outfits[0].reason);
    }

    // 2. Ask for the same outfit without cap
    console.log("\n2. Asking for same outfit without cap...");
    const res2 = await axios.post('http://localhost:5000/chatbot', {
        message: "can you give me the same outfit but without cap?",
        sessionId: sessionId
    });
    console.log("Reply:", res2.data.reply);
    if (res2.data.outfits) {
        console.log("Modified Outfit:", res2.data.outfits[0].top, "+", res2.data.outfits[0].bottom);
        console.log("Cap:", res2.data.outfits[0].cap);
    }

    // 3. Follow up with Groq to check memory
    console.log("\n3. Testing Groq memory (What did you just show me?)...");
    const res3 = await axios.post('http://localhost:5000/chatbot', {
        message: "What was the T-shirt color in the outfit you just showed me?",
        sessionId: sessionId
    });
    console.log("Reply:", res3.data.reply);
}

test().catch(err => console.error(err.message));
