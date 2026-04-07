import { GoogleGenerativeAI } from '@google/generative-ai';
import { performance } from 'perf_hooks';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Call Gemini provider
 * @param {string} prompt 
 * @param {object} options 
 * @returns {Promise<{ text: string, tokens: number, latencyMs: number }>}
 */
export const callGemini = async (prompt, options = {}) => {
    const start = performance.now();
    const { model = 'gemini-2.0-flash', maxTokens = 1000 } = options;

    try {
        const genModel = genAI.getGenerativeModel({ model });
        
        const result = await genModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const latencyMs = performance.now() - start;
        const tokens = response.usageMetadata?.totalTokenCount || 0;

        return { text, tokens, latencyMs };
    } catch (error) {
        error.provider = 'gemini';
        throw error;
    }
};

export default callGemini;
