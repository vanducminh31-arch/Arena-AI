import dotenv from 'dotenv';

dotenv.config();

/**
 * Basic CI test to verify API keys and connectivity.
 */
async function runTests() {
    console.log("🚀 Starting Arena AI Model Tests...");
    let failed = false;

    // Check Gemini
    try {
        console.log("Checking Gemini API...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Gemini Error: ${res.status}`);
        const data = await res.json();
        if (!data.models) throw new Error("Invalid Gemini response (no models)");
        console.log("✅ Gemini API check passed.");
    } catch(e) {
        console.error(`❌ Gemini API check failed: ${e.message}`);
        failed = true;
    }

    // Check Groq
    try {
        console.log("Checking Groq API...");
        const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });
        if (!res.ok) throw new Error(`Groq Error: ${res.status}`);
        console.log("✅ Groq API check passed.");
    } catch(e) {
        console.error(`❌ Groq API check failed: ${e.message}`);
        failed = true;
    }

    if (failed) {
        console.error("\n💥 Some tests failed. Check your environment variables.");
        process.exit(1);
    } else {
        console.log("\n✨ All tests passed successfully!");
        process.exit(0);
    }
}

runTests();
