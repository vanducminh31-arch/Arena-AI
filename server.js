import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import multer from 'multer';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*'
}));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Global Memory Store for Codebase Sessions
// Each session: { fileList, totalChars, fileCount, agentHistory[], modifications[] }
const sessions = new Map();

const upload = multer({ storage: multer.memoryStorage() });

const isTextFile = (filename) => {
    const exts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.md', '.txt', '.java', '.rb', '.go', '.rs', '.php', '.vue', '.svelte'];
    return exts.some(e => filename.toLowerCase().endsWith(e));
};

/* =========================================
   UPLOAD CODEBASE
========================================= */
app.post('/api/upload-codebase', upload.any(), async (req, res) => {
    try {
        const sessionId = uuidv4();
        const fileList = [];
        let totalChars = 0;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        for (const file of req.files) {
            if (file.originalname.endsWith('.zip')) {
                const directory = await unzipper.Open.buffer(file.buffer);
                for (const zipFile of directory.files) {
                    if (zipFile.type !== 'File' || !isTextFile(zipFile.path)) continue;
                    const contentBuffer = await zipFile.buffer();
                    const content = contentBuffer.toString('utf-8');
                    fileList.push({ filename: zipFile.path, content, size: contentBuffer.length });
                    totalChars += content.length;
                }
            } else if (isTextFile(file.originalname)) {
                const content = file.buffer.toString('utf-8');
                fileList.push({ filename: file.originalname, content, size: file.size });
                totalChars += content.length;
            }
        }

        // Store session with history tracking
        sessions.set(sessionId, {
            fileList,
            totalChars,
            fileCount: fileList.length,
            agentHistory: [],     // Track all agent tasks
            modifications: []     // Track file modifications from agents
        });

        res.json({ sessionId, fileCount: fileList.length, totalChars, files: fileList.map(f => f.filename) });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: 'Failed to process files.' });
    }
});

/* =========================================
   AGENT TASK EXECUTION
========================================= */
app.post('/api/agent-task', async (req, res) => {
    const { sessionId, task, agentRole } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ error: "Session not found. Please upload code again." });
    }
    if (!task) {
        return res.status(400).json({ error: "Task description missing." });
    }

    try {
        const session = sessions.get(sessionId);

        // Build code context with smart truncation
        let contextBlock = "--- CODEBASE FILES ---\n";
        let currentChars = 0;
        const MAX_CHARS = 100000;

        for (const f of session.fileList) {
            const addedLength = f.filename.length + f.content.length + 50;
            if (currentChars + addedLength > MAX_CHARS) {
                contextBlock += `\n[... Truncated: ${session.fileList.length} total files, showing partial ...]`;
                break;
            }
            contextBlock += `\n<file name="${f.filename}">\n${f.content}\n</file>`;
            currentChars += addedLength;
        }

        // Role-based system prompts
        const langInstruction = "Always respond in Vietnamese unless the user explicitly asks for English.";
        const rolePrompts = {
            architect: `You are an Architect Agent. ${langInstruction} Analyze the codebase architecture, suggest design improvements, file structural changes, and identify patterns. When suggesting file changes, output them in the format:\n[MODIFY filename]\n\`\`\`\nnew content\n\`\`\``,
            developer: `You are a Developer Agent. ${langInstruction} Implement the requested task by writing or rewriting code. Return the specific modifications in the format:\n[MODIFY filename]\n\`\`\`\nnew content\n\`\`\``,
            reviewer: `You are a Reviewer Agent. ${langInstruction} Find bugs, code smells, security vulnerabilities, and suggest fixes. When proposing fixes, use the format:\n[MODIFY filename]\n\`\`\`\nnew content\n\`\`\``,
            tester: `You are a QA Tester Agent. ${langInstruction} Write comprehensive test cases targeting the primary logic. Output test files in the format:\n[NEW filename]\n\`\`\`\ntest content\n\`\`\``
        };

        const systemDirectives = rolePrompts[agentRole] || "You are an AI Coding Assistant.";

        const finalPrompt = `System Directive: ${systemDirectives}\nTask: ${task}\n\n${contextBlock}\n\nAnalyze and provide your response:`;

        // Use Gemini 1.5 Flash for speed and higher quota limits
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const r = await model.generateContent(finalPrompt);
        const textResponse = (await r.response).text();

        // Parse filesModified from the response
        const filesModified = [];
        const modifyRegex = /\[(?:MODIFY|NEW)\s+([^\]]+)\]\s*```[\w]*\n([\s\S]*?)```/g;
        let match;
        while ((match = modifyRegex.exec(textResponse)) !== null) {
            const filename = match[1].trim();
            const newContent = match[2].trim();
            const original = session.fileList.find(f => f.filename === filename);
            filesModified.push({
                filename,
                originalContent: original ? original.content : null,
                newContent,
                agentRole,
                timestamp: new Date().toISOString()
            });
        }

        // Save to session history
        const historyEntry = {
            agentRole,
            task,
            timestamp: new Date().toISOString(),
            model: 'gemini-1.5-flash',
            filesModified: filesModified.map(f => f.filename),
            outputPreview: textResponse.substring(0, 500)
        };
        session.agentHistory.push(historyEntry);

        // Save modifications
        for (const mod of filesModified) {
            // Update or add to modifications list
            const existing = session.modifications.findIndex(m => m.filename === mod.filename);
            if (existing >= 0) {
                session.modifications[existing] = mod;
            } else {
                session.modifications.push(mod);
            }
        }

        res.json({
            agentRole,
            output: textResponse,
            filesModified: filesModified.map(f => ({
                filename: f.filename,
                isNew: f.originalContent === null,
                preview: f.newContent.split('\n').slice(0, 5).join('\n')
            })),
            status: "success"
        });

    } catch (e) {
        console.error("Agent Task Error:", e);
        res.status(500).json({ error: "Failed to execute agent task: " + e.message });
    }
});

/* =========================================
   EXPORT ZIP
========================================= */
app.post('/api/export-zip', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ error: "Session not found." });
    }

    try {
        const session = sessions.get(sessionId);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="agent-output.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        // Build a map of modified filenames for quick lookup
        const modifiedMap = new Map();
        for (const mod of session.modifications) {
            modifiedMap.set(mod.filename, mod);
        }

        // Add all original files (use modified version if available)
        for (const file of session.fileList) {
            const mod = modifiedMap.get(file.filename);
            const content = mod ? mod.newContent : file.content;
            archive.append(content, { name: file.filename });
        }

        // Add brand new files (from agents) that weren't in the original
        for (const mod of session.modifications) {
            if (!session.fileList.find(f => f.filename === mod.filename)) {
                archive.append(mod.newContent, { name: mod.filename });
            }
        }

        // Generate AGENT_REPORT.md
        let report = `# Agent Report\n\n`;
        report += `**Session ID:** ${sessionId}\n`;
        report += `**Generated:** ${new Date().toISOString()}\n`;
        report += `**Total Files:** ${session.fileCount}\n`;
        report += `**Total Characters:** ${session.totalChars.toLocaleString()}\n\n`;
        report += `---\n\n## Agent Tasks Executed\n\n`;

        if (session.agentHistory.length === 0) {
            report += `_No agent tasks were run in this session._\n`;
        } else {
            session.agentHistory.forEach((entry, i) => {
                report += `### Task ${i + 1}: ${entry.agentRole.toUpperCase()}\n`;
                report += `- **Model:** ${entry.model}\n`;
                report += `- **Timestamp:** ${entry.timestamp}\n`;
                report += `- **Instruction:** ${entry.task}\n`;
                report += `- **Files Modified:** ${entry.filesModified.length > 0 ? entry.filesModified.join(', ') : 'None detected'}\n\n`;
            });
        }

        report += `---\n\n## Modified Files Summary\n\n`;
        if (session.modifications.length === 0) {
            report += `_No files were modified._\n`;
        } else {
            session.modifications.forEach(mod => {
                report += `### ${mod.filename}\n`;
                report += `- **Modified by:** ${mod.agentRole}\n`;
                report += `- **At:** ${mod.timestamp}\n`;
                report += `- **Is New File:** ${mod.originalContent === null ? 'Yes' : 'No'}\n\n`;
            });
        }

        archive.append(report, { name: 'AGENT_REPORT.md' });

        await archive.finalize();

    } catch (error) {
        console.error("Export Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to export zip.' });
        }
    }
});

/* =========================================
   SESSION INFO
========================================= */
app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json({
        fileCount: session.fileCount,
        totalChars: session.totalChars,
        agentTasksRun: session.agentHistory.length,
        modificationsCount: session.modifications.length
    });
});

app.post('/api/arena/chat', async (req, res) => {
    const { prompt, models: selectedModels } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!selectedModels || !Array.from(selectedModels).length) {
        return res.status(400).json({ error: 'Selection of at least one model is required' });
    }

    try {
        const results = await Promise.all(selectedModels.map(async (modelId) => {
            try {
                // Determine Provider
                if (modelId.startsWith('gemini-')) {
                    const model = genAI.getGenerativeModel({ model: modelId });
                    const promptWithLang = `Instruction: Always respond in Vietnamese even if the prompt is in English, unless the user specifically asks for an English response. \n\nUser Prompt: ${prompt}`;
                    const r = await model.generateContent(promptWithLang);
                    return (await r.response).text();
                } else {
                    // Default to Groq for other IDs
                    const response = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: 'Always respond in Vietnamese unless requested otherwise. Use clear formatting.' },
                            { role: 'user', content: prompt }
                        ],
                        model: modelId,
                    });
                    return response.choices[0]?.message?.content || "No response from model.";
                }
            } catch (err) {
                console.error(`Error with model ${modelId}:`, err);
                return `Error [${modelId}]: ${err.message}`;
            }
        }));

        res.json({ 
            results: results.map((text, index) => ({
                modelId: selectedModels[index],
                output: text
            }))
        });

    } catch (error) {
        console.error("Arena Chat Error:", error);
        res.status(500).json({ error: 'Failed to fetch AI responses' });
    }
});

app.listen(port, () => {
    console.log(`Arena Backend Proxy listening on port ${port}`);
});
