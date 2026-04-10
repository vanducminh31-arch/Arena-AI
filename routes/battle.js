import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { createMetricsTracker } from '../providers/providerMetrics.js';

const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Streaming /api/battle using Server-Sent Events (SSE)
 */
router.post('/', async (req, res, next) => {
    const { prompt, models: selectedModels } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length === 0) {
        return res.status(400).json({ error: 'Selection required' });
    }

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Concurrently handle providers
    await Promise.all(selectedModels.map(async (modelId) => {
        const isGemini = modelId.toLowerCase().includes('gemini');
        const providerName = isGemini ? 'gemini' : 'groq';
        const metrics = createMetricsTracker(providerName);
        let totalText = "";

        try {
            if (isGemini) {
                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContentStream(prompt);
                
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    totalText += chunkText;
                    metrics.recordFirstToken();
                    sendEvent({ provider: providerName, modelId, delta: chunkText, done: false });
                }
                
                // Final metrics
                const response = await result.response;
                metrics.setTotalTokens(response.usageMetadata?.totalTokenCount || 0);
            } else {
                const stream = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: modelId,
                    stream: true,
                    stream_options: { include_usage: true },
                });

                let tokenCount = 0;
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta?.content || "";
                    if (delta) {
                        totalText += delta;
                        metrics.recordFirstToken();
                        sendEvent({ provider: providerName, modelId, delta, done: false });
                    }
                    // Capture usage from the final chunk
                    if (chunk.x_groq?.usage?.total_tokens) {
                        tokenCount = chunk.x_groq.usage.total_tokens;
                    }
                    if (chunk.usage?.total_tokens) {
                        tokenCount = chunk.usage.total_tokens;
                    }
                }

                // Use reported tokens or estimate (~4 chars per token)
                metrics.setTotalTokens(tokenCount || Math.ceil(totalText.length / 4));
            }

            const finalMetrics = metrics.getFinalMetrics();
            sendEvent({ provider: providerName, modelId, done: true, ...finalMetrics });

        } catch (error) {
            console.error(`Stream error [${modelId}]:`, error);
            const finalMetrics = metrics.getFinalMetrics();
            sendEvent({ provider: providerName, modelId, delta: `\nError: ${error.message}`, error: true, done: true, ...finalMetrics });
        }
    }));

    res.end();
});

export default router;
