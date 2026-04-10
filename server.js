import './config.js'; // Side-effect: loads and validates env
import express from 'express';
import { dynamicCors } from './middleware/cors.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Route Imports
import battleRoutes from './routes/battle.js';
import codebaseRoutes from './routes/codebase.js';
import healthRoutes from './routes/health.js';
import workflowRoutes from './routes/workflow.js';

const app = express();
const port = process.env.PORT || 3000;

// Application Middleware
app.use(dynamicCors);
app.use(express.json());
app.use('/api/', apiRateLimiter);

// Route Mounting
app.use('/api/battle', battleRoutes);
app.use('/api/codebase', codebaseRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/workflow', workflowRoutes);

// Compatibility Mounts (for old frontend)
app.use('/api/arena/chat', battleRoutes);
app.use('/api/upload-codebase', codebaseRoutes);
app.use('/api/agent-task', codebaseRoutes);
app.use('/api/export-zip', codebaseRoutes);

// Global Error Handler (Prompt 01)
app.use(globalErrorHandler);

app.listen(port, () => {
    console.log(`Arena Backend Proxy listening on port ${port}`);
});
