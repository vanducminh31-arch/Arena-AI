import express from 'express';
import multer from 'multer';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import path from 'path';
import { callGroq } from '../providers/groq.js';

const router = express.Router();

const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.zip', '.txt', '.md', '.json', '.env'];

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            const err = new Error(`Invalid file type: ${ext}`);
            err.status = 400;
            err.allowed = allowedExtensions;
            cb(err);
        }
    }
});

// Global Memory Store for Codebase Sessions
const sessions = new Map();

const isTextFile = (filename) => {
    const exts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.md', '.txt', '.java', '.rb', '.go', '.rs', '.php', '.vue', '.svelte'];
    return exts.some(e => filename.toLowerCase().endsWith(e));
};

/* =========================================
   UPLOAD CODEBASE
   POST /api/codebase/upload
========================================= */
router.post('/upload', upload.any(), async (req, res, next) => {
    try {
        const sessionId = uuidv4();
        const fileList = [];
        let totalChars = 0;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        for (const file of req.files) {
            const safeName = path.basename(file.originalname);
            if (safeName.endsWith('.zip')) {
                const directory = await unzipper.Open.buffer(file.buffer);
                for (const zipFile of directory.files) {
                    if (zipFile.type !== 'File' || !isTextFile(zipFile.path)) continue;
                    const contentBuffer = await zipFile.buffer();
                    const content = contentBuffer.toString('utf-8');
                    fileList.push({ filename: zipFile.path, content, size: contentBuffer.length });
                    totalChars += content.length;
                }
            } else if (isTextFile(safeName)) {
                const content = file.buffer.toString('utf-8');
                fileList.push({ filename: safeName, content, size: file.size });
                totalChars += content.length;
            }
        }

        sessions.set(sessionId, {
            fileList,
            totalChars,
            fileCount: fileList.length,
            agentHistory: [],
            modifications: []
        });

        res.json({ sessionId, fileCount: fileList.length, totalChars, files: fileList.map(f => f.filename) });

    } catch (error) {
        next(error);
    }
});

/* =========================================
   AGENT TASK EXECUTION
   POST /api/codebase/agent
========================================= */
router.post('/agent', async (req, res, next) => {
    const { sessionId, task, agentRole } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ error: "Session not found. Please upload code again." });
    }
    if (!task) {
        return res.status(400).json({ error: "Task description missing." });
    }

    try {
        const session = sessions.get(sessionId);

        // Build code context
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

        const rolePrompts = {
            architect: `Architect agent prompt context...`,
            developer: `Developer agent prompt context...`,
            reviewer: `Reviewer agent prompt context...`,
            tester: `QA tester agent prompt context...`
        };

        const systemDirectives = rolePrompts[agentRole] || "AI assistant.";
        const finalPrompt = `System: ${systemDirectives}\nTask: ${task}\n\n${contextBlock}\n\nAnalyze:`;

        const { text: textResponse } = await callGroq(finalPrompt, { model: 'llama-3.3-70b-versatile' });

        // Parse modifications
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

        // Update session
        session.agentHistory.push({ agentRole, task, timestamp: new Date().toISOString() });
        for (const mod of filesModified) {
            const existing = session.modifications.findIndex(m => m.filename === mod.filename);
            if (existing >= 0) session.modifications[existing] = mod;
            else session.modifications.push(mod);
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
        next(e);
    }
});

/* =========================================
   EXPORT ZIP
   POST /api/codebase/export
========================================= */
router.post('/export', async (req, res, next) => {
    const { sessionId } = req.body;
    if (!sessionId || !sessions.has(sessionId)) return res.status(404).json({ error: "Session not found." });

    try {
        const session = sessions.get(sessionId);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="agent-patch.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        const modifiedMap = new Map();
        for (const mod of session.modifications) modifiedMap.set(mod.filename, mod);

        for (const file of session.fileList) {
            const mod = modifiedMap.get(file.filename);
            const content = mod ? mod.newContent : file.content;
            archive.append(content, { name: file.filename });
        }

        for (const mod of session.modifications) {
            if (!session.fileList.find(f => f.filename === mod.filename)) {
                archive.append(mod.newContent, { name: mod.filename });
            }
        }

        await archive.finalize();
    } catch (error) {
        next(error);
    }
});

export default router;
