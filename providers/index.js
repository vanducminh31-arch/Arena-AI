import { callGemini } from './gemini.js';
import { callGroq } from './groq.js';

export { callGemini, callGroq };

/**
 * Centrally call a provider by name
 * @param {string} name - 'gemini' or 'groq'
 * @param {string} prompt 
 * @param {object} options 
 */
export const callProvider = async (name, prompt, options = {}) => {
    try {
        if (name.toLowerCase().includes('gemini')) {
            return await callGemini(prompt, options);
        } else {
            return await callGroq(prompt, options);
        }
    } catch (error) {
        console.error(`Error calling provider ${name}:`, error);
        // Prompt 01 Requirement: Partial success response handled by returning error object
        return { 
            text: `Error [${name}]: ${error.message}`, 
            tokens: 0, 
            latencyMs: 0,
            error: true 
        };
    }
};
