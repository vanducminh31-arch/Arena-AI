import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get('/', async (req, res) => {
    const health = {
        status: "ok",
        providers: {
            gemini: "ok",
            groq: "ok"
        },
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    };

    try {
        // Ping Gemini (cheap check)
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        // Use a 5s timeout for the check
        const geminiCheck = Promise.race([
            geminiModel.countTokens("ping"),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        await geminiCheck;
    } catch (e) {
        health.providers.gemini = "error";
        health.status = "degraded";
    }

    try {
        // Ping Groq (cheap check)
        const groqCheck = Promise.race([
            groq.chat.completions.create({
                messages: [{ role: "user", content: "hi" }],
                model: "llama-3.1-8b-instant",
                max_tokens: 1
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        await groqCheck;
    } catch (e) {
        health.providers.groq = "error";
        health.status = "degraded";
    }

    if (health.providers.gemini === "error" && health.providers.groq === "error") {
        health.status = "down";
    }

    res.json(health);
});

export default router;
