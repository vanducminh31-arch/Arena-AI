import dotenv from 'dotenv';
dotenv.config();

async function checkGemini() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Gemini Models:");
        data.models.forEach(m => console.log(m.name));
    } catch(e) {
        console.error(e);
    }
}
checkGemini();
