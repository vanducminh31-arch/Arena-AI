import express from 'express';
import {
    checkSecurity,
    classifyPrompt,
    executeFastMode,
    executeBalancedMode,
    executeSmartMode,
    MODEL_REGISTRY
} from '../providers/orchestrator.js';
import { performance } from 'perf_hooks';

const router = express.Router();

/* =========================================
   POST /api/workflow
   Body: { prompt: string, mode: "fast"|"balanced"|"smart"|"auto" }
   Response: SSE stream
========================================= */
router.post('/', async (req, res, next) => {
    const { prompt, mode = 'auto' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const pipelineStart = performance.now();

    try {
        // ======== BƯỚC 1: SECURITY CHECK ========
        sendEvent({ type: 'security_start' });
        const security = await checkSecurity(prompt);
        sendEvent({ type: 'security_done', safe: security.safe, reason: security.reason, latencyMs: security.latencyMs });

        if (!security.safe) {
            sendEvent({ type: 'blocked', reason: security.reason });
            res.end();
            return;
        }

        // ======== BƯỚC 2: DETERMINE MODE ========
        let resolvedMode = mode;

        if (mode === 'auto') {
            sendEvent({ type: 'routing_start' });
            const classification = await classifyPrompt(prompt);
            sendEvent({ type: 'routing_done', ...classification });

            // Map complexity → mode
            if (classification.complexity === 'simple') resolvedMode = 'fast';
            else if (classification.complexity === 'medium') resolvedMode = 'balanced';
            else resolvedMode = 'smart';
        }

        sendEvent({ type: 'mode_selected', mode: resolvedMode });

        // ======== BƯỚC 3: EXECUTE MODE ========
        let generator;
        if (resolvedMode === 'fast') {
            generator = executeFastMode(prompt);
        } else if (resolvedMode === 'balanced') {
            generator = executeBalancedMode(prompt);
        } else {
            generator = executeSmartMode(prompt);
        }

        for await (const event of generator) {
            sendEvent(event);
        }

        // ======== BƯỚC 4: PIPELINE COMPLETE ========
        const totalPipelineMs = Math.round(performance.now() - pipelineStart);
        sendEvent({ type: 'pipeline_done', totalPipelineMs, mode: resolvedMode });

    } catch (error) {
        console.error('Workflow pipeline error:', error);
        sendEvent({ type: 'error', message: error.message });
    }

    res.end();
});

/* =========================================
   GET /api/workflow/models
   Trả về thông tin các model đang sử dụng
========================================= */
router.get('/models', (req, res) => {
    res.json({
        models: Object.entries(MODEL_REGISTRY).map(([key, val]) => ({
            key,
            ...val
        })),
        modes: {
            fast: { description: 'Tốc độ cao, 1 model trực tiếp', models: ['drafter'] },
            balanced: { description: '2 model song song + Judge', models: ['reasoner', 'explorer', 'judge'] },
            smart: { description: 'Pipeline Draft → Review → Synthesize', models: ['drafter', 'thinker', 'judge'] },
        }
    });
});

export default router;
