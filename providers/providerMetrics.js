import { performance } from 'perf_hooks';

const COST_PER_1M = {
    'groq': 0.05,
    'gemini': 0.075
};

/**
 * Metrics utility to track LLM performance.
 */
export const createMetricsTracker = (provider) => {
    const startTime = performance.now();
    let ttft = null;
    let totalTokens = 0;

    return {
        recordFirstToken: () => {
            if (ttft === null) {
                ttft = performance.now() - startTime;
            }
        },
        setTotalTokens: (tokens) => {
            totalTokens = tokens;
        },
        getFinalMetrics: () => {
            const latencyMs = performance.now() - startTime;
            const tps = totalTokens / (latencyMs / 1000);
            const cost = (totalTokens / 1_000_000) * (COST_PER_1M[provider.toLowerCase()] || 0);

            return {
                provider,
                latencyMs: Math.round(latencyMs),
                ttftMs: ttft ? Math.round(ttft) : null,
                totalTokens,
                tokensPerSec: totalTokens > 0 ? parseFloat(tps.toFixed(2)) : 0,
                cost_estimate_usd: parseFloat(cost.toFixed(6))
            };
        }
    };
};

export default createMetricsTracker;
