import Groq from 'groq-sdk';
import { performance } from 'perf_hooks';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Call Groq provider
 * @param {string} prompt 
 * @param {object} options 
 * @returns {Promise<{ text: string, tokens: number, latencyMs: number }>}
 */
export const callGroq = async (prompt, options = {}) => {
    const start = performance.now();
    const { model = 'llama-3.3-70b-versatile', maxTokens = 1000 } = options;

    try {
        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'Always respond in Vietnamese unless requested otherwise. Use clear formatting.' },
                { role: 'user', content: prompt }
            ],
            model,
            max_tokens: maxTokens
        });

        const latencyMs = performance.now() - start;
        const text = response.choices[0]?.message?.content || "";
        const tokens = response.usage?.total_tokens || 0;

        return { text, tokens, latencyMs };
    } catch (error) {
        error.provider = 'groq';
        throw error;
    }
};

export default callGroq;
