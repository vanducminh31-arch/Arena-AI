import './style.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// --- Leaderboard Data ---
const models = [
  { id: 1, name: 'GPT-4o', accuracy: '98.5%', speed: 105, cost: '$5.00', status: 'Live' },
  { id: 2, name: 'Claude 3.5 Sonnet', accuracy: '98.2%', speed: 110, cost: '$3.00', status: 'Live' },
  { id: 3, name: 'DeepSeek R1 70B', accuracy: '97.8%', speed: 120, cost: 'Free', status: 'Live' },
  { id: 4, name: 'GPT-4 Turbo', accuracy: '97.5%', speed: 90, cost: '$10.00', status: 'Live' },
  { id: 5, name: 'Claude 3 Opus', accuracy: '96.9%', speed: 78, cost: '$15.00', status: 'Live' },
  { id: 6, name: 'Gemini 1.5 Pro', accuracy: '96.5%', speed: 130, cost: '$7.00', status: 'Live' },
  { id: 7, name: 'Llama 3.1 405B', accuracy: '96.0%', speed: 85, cost: 'Free', status: 'Live' },
  { id: 8, name: 'Mistral Large 2', accuracy: '95.5%', speed: 140, cost: '$4.00', status: 'Live' },
  { id: 9, name: 'Claude 3.5 Haiku', accuracy: '94.8%', speed: 250, cost: '$0.25', status: 'Live' },
  { id: 10, name: 'Gemini 1.5 Flash', accuracy: '94.2%', speed: 280, cost: '$0.35', status: 'Live' },
  { id: 11, name: 'GPT-OSS 120B', accuracy: '93.1%', speed: 280, cost: 'Free', status: 'Live' },
  { id: 12, name: 'Qwen 2.5 72B', accuracy: '92.7%', speed: 180, cost: 'Free', status: 'Live' },
  { id: 13, name: 'Llama 4 Scout', accuracy: '91.2%', speed: 320, cost: 'Free', status: 'Live' },
  { id: 14, name: 'Mistral Nemo', accuracy: '90.8%', speed: 310, cost: 'Free', status: 'Live' },
  { id: 15, name: 'Qwen 3 32B', accuracy: '90.5%', speed: 210, cost: 'Free', status: 'Live' },
  { id: 16, name: 'Gemma 2 27B', accuracy: '89.9%', speed: 260, cost: 'Free', status: 'Live' },
  { id: 17, name: 'Llama 3.1 8B', accuracy: '89.5%', speed: 380, cost: 'Free', status: 'Live' },
  { id: 18, name: 'Phi-3 Medium', accuracy: '88.2%', speed: 350, cost: 'Free', status: 'Live' },
  { id: 19, name: 'Command R+', accuracy: '87.5%', speed: 190, cost: '$3.00', status: 'Live' },
  { id: 20, name: 'Yi-Large', accuracy: '86.8%', speed: 200, cost: '$2.50', status: 'Live' }
];

const availableModels = [
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', color: 'var(--primary-gradient)' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', color: '#8b5cf6' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', color: '#ec4899' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', color: '#ef4444' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', color: '#3b82f6' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', color: '#10b981' }
];

// --- Navigation Logic ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const views = document.querySelectorAll('.dashboard-view');
    const viewTitle = document.getElementById('view-title');
    const app = document.getElementById('app');
    const logoIcon = document.querySelector('.logo-icon');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            
            // Toggle Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Toggle Active View
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(targetView).classList.add('active');

            // Update Title
            viewTitle.textContent = item.querySelector('span').textContent;
            
            // Mobile auto-collapse sidebar if needed (later)
        });
    });

    // Sidebar Collapse Toggle (Click on Logo Icon)
    if (logoIcon) {
        logoIcon.addEventListener('click', () => {
            app.classList.toggle('collapsed');
        });
    }
}

// --- Core Logic ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initLeaderboard();
    initLiveUpdates();
    initCodebaseAgent();
    initArenaBattle();
    initWorkflowBattle();
    initStatusPolling();
});

function initStatusPolling() {
    const poll = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/health`);
            const data = await res.json();
            
            updateStatusDot('railway', 'ok'); // Backend is responding if we get here
            updateStatusDot('gemini', data.providers.gemini);
            updateStatusDot('groq', data.providers.groq);
        } catch (e) {
            updateStatusDot('railway', 'down');
            updateStatusDot('gemini', 'down');
            updateStatusDot('groq', 'down');
        }
    };

    function updateStatusDot(id, status) {
        const el = document.getElementById(`status-${id}`);
        if (!el) return;

        if (status === 'ok') {
            el.textContent = '● Operational';
            el.style.color = 'var(--success)';
        } else if (status === 'degraded') {
            el.textContent = '● Degraded';
            el.style.color = '#fbbf24'; // Orange/Yellow
        } else {
            el.textContent = '● Offline';
            el.style.color = 'var(--error)';
        }
    }

    poll();
    setInterval(poll, 30000);
}

function initLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body');
    if (!leaderboardBody) return;

    leaderboardBody.innerHTML = models.map(model => `
        <tr id="model-${model.id}" style="border-bottom: 1px solid var(--border-subtle); transition: var(--transition);">
            <td style="padding: var(--space-4); font-weight: 600;">${model.name}</td>
            <td style="padding: var(--space-4); color: var(--success);">${model.accuracy}</td>
            <td style="padding: var(--space-4);" class="speed-val">${model.speed}</td>
            <td style="padding: var(--space-4); color: var(--text-secondary);">${model.cost}</td>
            <td style="padding: var(--space-4);"><span class="status-active">${model.status}</span></td>
        </tr>
    `).join('');
}

// Removed initScrollAnimations as we are using a Dashboard layout now

function initLiveUpdates() {
    setInterval(() => {
        const randomIndex = Math.floor(Math.random() * models.length);
        const modelEl = document.getElementById(`model-${models[randomIndex].id}`);
        if (modelEl) {
            const speedEl = modelEl.querySelector('.speed-val');
            const currentSpeed = parseInt(speedEl.textContent);
            const fluctuation = Math.floor(Math.random() * 5) - 2;
            const newSpeed = Math.max(10, currentSpeed + fluctuation);

            speedEl.textContent = newSpeed;
            speedEl.style.color = fluctuation > 0 ? '#10b981' : '#f87171';

            setTimeout(() => { speedEl.style.color = ''; }, 1000);
        }
    }, 2000);
}

// Navbar scroll effect (legacy - dashboard uses sidebar now)
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(5, 5, 5, 0.8)';
        navbar.style.backdropFilter = 'blur(12px)';
    } else {
        navbar.style.background = 'transparent';
        navbar.style.backdropFilter = 'none';
    }
});

/* =========================================
   CODEBASE INTELLIGENCE
========================================= */
function initCodebaseAgent() {
    let currentSessionId = null;

    // DOM refs
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const sessionStatus = document.getElementById('session-status');
    const sessionBadge = document.getElementById('session-badge');
    const sessionDetails = document.getElementById('session-details');
    const btnRunAgent = document.getElementById('btn-run-agent');
    const agentTaskInput = document.getElementById('agent-task-input');
    const agentRole = document.getElementById('agent-role');
    const agentConsole = document.getElementById('agent-console');
    const diffSummary = document.getElementById('diff-summary');
    const diffList = document.getElementById('diff-list');
    const btnExportZip = document.getElementById('btn-export-zip');
    const btnNewSession = document.getElementById('btn-new-session');

    if (!uploadForm) return;

    // --- Drag & Drop ---
    uploadForm.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadForm.style.borderColor = '#00f0ff';
        uploadForm.style.background = 'rgba(0, 240, 255, 0.05)';
    });
    uploadForm.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadForm.style.background = 'transparent';
    });
    uploadForm.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadForm.style.background = 'transparent';
        if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleUpload(e.target.files);
    });

    // --- Console Logger Helpers ---
    function logToConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        const line = document.createElement('div');
        line.style.marginBottom = '4px';
        
        let color = '#a5b4fc'; // default violet
        if (type === 'success') color = '#10b981';
        if (type === 'error') color = '#f43f5e';
        if (type === 'info') color = '#3b82f6';

        line.innerHTML = `<span style="color: var(--text-muted); font-size: 0.75rem;">[${timestamp}]</span> <span style="color: ${color}">${message}</span>`;
        agentConsole.appendChild(line);
        agentConsole.scrollTop = agentConsole.scrollHeight;
    }

    // --- Upload Handler ---
    async function handleUpload(files) {
        logToConsole('Initiating workspace upload...', 'info');

        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('workspace', f));

        try {
            const res = await fetch(`${API_BASE}/api/upload-codebase`, {
                method: 'POST', body: formData
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            currentSessionId = data.sessionId;

            sessionStatus.style.display = 'block';
            sessionBadge.textContent = '✓ Session: ' + currentSessionId.split('-')[0];
            sessionDetails.textContent = `Loaded ${data.fileCount} files (${(data.totalChars / 1024).toFixed(1)} KB of code)`;
            
            logToConsole(`Upload successful. Loaded ${data.fileCount} files.`, 'success');

            btnRunAgent.disabled = false;
            btnNewSession.style.display = 'inline-flex';

            // Reset previous results
            diffSummary.style.display = 'none';
            diffList.innerHTML = '';
            btnExportZip.style.display = 'none';

        } catch (err) {
            logToConsole(`Upload failed: ${err.message}`, 'error');
            alert('Upload error: ' + err.message);
        }
    }

    // --- Run Agent ---
    btnRunAgent.addEventListener('click', async () => {
        const task = agentTaskInput.value.trim();
        if (!task || !currentSessionId) return;

        btnRunAgent.disabled = true;
        btnRunAgent.textContent = 'Thinking...';
        logToConsole(`Running Agent (${agentRole.value}): "${task.substring(0, 30)}..."`, 'info');
        logToConsole('Analyzing codebase context...', 'info');

        try {
            const response = await fetch(`${API_BASE}/api/agent-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    task,
                    agentRole: agentRole.value
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Show output
            logToConsole(`Task complete. Applied architecture updates.`, 'success');
            // We append the full output to console as well but formatted
            const outLine = document.createElement('div');
            outLine.className = 'agent-raw-output';
            outLine.style.marginTop = '12px';
            outLine.style.padding = '12px';
            outLine.style.background = 'rgba(255,255,255,0.03)';
            outLine.style.borderRadius = '4px';
            outLine.textContent = data.output;
            agentConsole.appendChild(outLine);
            agentConsole.scrollTop = agentConsole.scrollHeight;

            // Show diff summary if files were modified
            if (data.filesModified && data.filesModified.length > 0) {
                diffSummary.style.display = 'block';

                // Add a count badge
                const countBadge = document.createElement('span');
                countBadge.style.cssText = 'display:inline-block; background:#10b981; color:#000; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; margin-bottom:0.5rem;';
                countBadge.textContent = `${data.filesModified.length} file(s) changed`;

                // Build diff items
                const newItems = data.filesModified.map(f => {
                    const badge = f.isNew ? '🆕 NEW' : '✏️ MODIFIED';
                    const previewLines = f.preview ? f.preview.split('\n').slice(0, 3).join('\n') : '';
                    return `
                        <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:0.75rem;">
                            <div style="font-weight:600; margin-bottom:0.25rem;">${badge} ${f.filename}</div>
                            <pre style="font-size:0.75rem; color:#94a3b8; margin:0; overflow-x:auto;">${previewLines}</pre>
                        </div>
                    `;
                }).join('');

                diffList.innerHTML = '';
                diffList.appendChild(countBadge);
                diffList.insertAdjacentHTML('beforeend', newItems);

                // Show export button
                btnExportZip.style.display = 'inline-flex';
            }

        } catch (error) {
            logToConsole(`Agent execution failed: ${error.message}`, 'error');
        } finally {
            btnRunAgent.disabled = false;
            btnRunAgent.textContent = 'Run Agent';
        }
    });

    // --- Export ZIP ---
    btnExportZip.addEventListener('click', async () => {
        if (!currentSessionId) return;

        btnExportZip.textContent = '⏳ Generating...';
        btnExportZip.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/export-zip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'agent-output.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            btnExportZip.textContent = '✓ Downloaded!';
            setTimeout(() => { btnExportZip.textContent = '⬇ Export ZIP'; }, 2000);

        } catch (err) {
            alert('Export error: ' + err.message);
            btnExportZip.textContent = '⬇ Export ZIP';
        } finally {
            btnExportZip.disabled = false;
        }
    });

    // --- New Session ---
    btnNewSession.addEventListener('click', () => {
        currentSessionId = null;

        sessionStatus.style.display = 'none';
        diffSummary.style.display = 'none';
        diffList.innerHTML = '';
        btnExportZip.style.display = 'none';
        btnNewSession.style.display = 'none';
        btnRunAgent.disabled = true;

        agentConsole.style.color = '#10b981';
        agentConsole.textContent = 'Awaiting task initialization...';
        agentTaskInput.value = '';

        uploadForm.querySelector('h3').textContent = 'Drag & Drop files or .zip here';
    });
}

/* =========================================
   ARENA BATTLE
========================================= */
function initArenaBattle() {
    const btnBattle = document.getElementById('btn-battle');
    const inputPrompt = document.getElementById('battle-prompt');
    const arenaGrid = document.getElementById('arena-dynamic-grid');

    if (!btnBattle || !arenaGrid) return;

    // Render Initial Dynamic Boxes
    function renderArenaBoxes() {
        arenaGrid.innerHTML = availableModels.map(model => `
            <div class="result-column arena-box" data-model="${model.id}">
                <div class="arena-box-header">
                    <span class="model-badge" style="background: ${model.color || 'var(--surface-color)'}">${model.name}</span>
                    <span class="status-indicator">Idle</span>
                </div>
                <div class="arena-output-container scroll-container" id="output-${model.id.replace(/[\/\.]/g, '-')}">
                    <p class="placeholder-text">Awaiting input...</p>
                </div>
            </div>
        `).join('');
    }

    renderArenaBoxes();

    btnBattle.addEventListener('click', async () => {
        const prompt = inputPrompt.value.trim();
        if (!prompt) return;

        btnBattle.disabled = true;
        btnBattle.textContent = 'Streaming Battle...';

        const boxes = document.querySelectorAll('.arena-box');
        boxes.forEach(box => {
            const output = box.querySelector('.arena-output-container');
            const status = box.querySelector('.status-indicator');
            box.classList.add('loading');
            output.innerHTML = `
                <div class="skeleton" style="width: 90%"></div>
                <div class="skeleton" style="width: 70%"></div>
                <div class="skeleton" style="width: 85%"></div>
                <div class="skeleton" style="width: 40%"></div>
            `;
            status.textContent = 'Connecting...';
            status.style.color = 'var(--text-muted)';
        });

        const selectedModels = availableModels.map(m => m.id);

        try {
            const response = await fetch(`${API_BASE}/api/battle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, models: selectedModels })
            });

            if (!response.ok) throw new Error('Stream request failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep partial line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.substring(6));
                        const safeId = data.modelId.replace(/[\/\.]/g, '-');
                        const outputEl = document.getElementById(`output-${safeId}`);
                        const boxEl = outputEl?.parentElement;
                        const statusEl = boxEl?.querySelector('.status-indicator');

                        if (!outputEl) continue;

                        if (data.done) {
                            if (boxEl) boxEl.classList.remove('loading');
                            if (statusEl) {
                                statusEl.textContent = `${data.latencyMs}ms | ${data.tokensPerSec}t/s`;
                                statusEl.style.color = '#10b981';
                            }
                        } else {
                            if (statusEl && statusEl.textContent !== 'Streaming...') {
                                statusEl.textContent = 'Streaming...';
                                statusEl.style.color = 'var(--primary-blue)';
                            }

                            if (boxEl && boxEl.classList.contains('loading')) {
                                boxEl.classList.remove('loading');
                                outputEl.innerHTML = ''; // Clear skeleton
                            }

                            // Append token
                            const tokenSpan = document.createElement('span');
                            tokenSpan.textContent = data.delta;
                            outputEl.appendChild(tokenSpan);
                            outputEl.scrollTop = outputEl.scrollHeight;
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Battle Error:", error);
            boxes.forEach(box => {
                const status = box.querySelector('.status-indicator');
                status.textContent = 'Error';
                status.style.color = '#f43f5e';
            });
        } finally {
            btnBattle.disabled = false;
            btnBattle.textContent = 'Invoke Battle';
        }
    });

    inputPrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnBattle.click();
    });
}

/* =========================================
   MULTI-AGENT AI ORCHESTRATOR
========================================= */
function initWorkflowBattle() {
    const btnWorkflow = document.getElementById('btn-workflow');
    const inputPrompt = document.getElementById('workflow-prompt');
    const outputArea = document.getElementById('workflow-output-area');
    const pipelineStatus = document.getElementById('pipeline-status');
    const pipelineSummary = document.getElementById('pipeline-summary');
    const modeBtns = document.querySelectorAll('.mode-btn');

    if (!btnWorkflow) return;

    let selectedMode = 'auto';

    // --- Mode Selector Logic ---
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMode = btn.dataset.mode;
        });
    });

    // --- Pipeline Status Helpers ---
    function setPipelineStep(stepId, state, detail = '') {
        const el = document.getElementById(stepId);
        if (!el) return;
        el.className = 'pipeline-step ' + state; // active | done | error
        const stateEl = el.querySelector('.ps-state');
        if (stateEl) stateEl.textContent = detail || (state === 'active' ? '...' : state === 'done' ? '✓' : '✗');
    }

    // --- Dynamic Panel Builder ---
    function createPanel(id, title, badgeColor, modelName = '') {
        return `
            <div class="workflow-panel" id="panel-${id}">
                <div class="workflow-panel-header">
                    <span class="model-badge" style="background: ${badgeColor}">${title}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="panel-model-name" id="model-name-${id}">${modelName}</span>
                        <span class="status-indicator" id="status-${id}">Idle</span>
                    </div>
                </div>
                <div class="workflow-panel-body" id="output-${id}">
                    <p class="placeholder-text">Waiting...</p>
                </div>
            </div>
        `;
    }

    function buildLayout(mode) {
        outputArea.innerHTML = '';
        outputArea.className = 'workflow-output-area';

        if (mode === 'fast') {
            outputArea.classList.add('layout-single');
            outputArea.innerHTML = createPanel('answering', '⚡ Direct Answer', '#10b981; color: #000');
        } else if (mode === 'balanced') {
            outputArea.classList.add('layout-balanced');
            outputArea.innerHTML =
                createPanel('parallel-a', '🔬 Response A', '#ec4899') +
                createPanel('parallel-b', '🔭 Response B', '#ef4444') +
                createPanel('judging', '⚖️ Judge Verdict', '#f59e0b; color: #000', '');
            // Make judge panel span full width
            document.getElementById('panel-judging')?.classList.add('judge-panel');
        } else { // smart
            outputArea.classList.add('layout-smart');
            outputArea.innerHTML =
                createPanel('drafting', 'Step 1: Draft', 'var(--primary-gradient)') +
                createPanel('reviewing', 'Step 2: Review', '#06b6d4') +
                createPanel('synthesizing', 'Step 3: Synthesize', '#10b981; color: #000');
        }
    }

    // --- Append Text to Panel ---
    function appendToPanel(panelId, text) {
        const el = document.getElementById(`output-${panelId}`);
        if (!el) return;
        // Clear placeholder on first write
        if (el.querySelector('.placeholder-text')) el.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = text;
        el.appendChild(span);
        el.scrollTop = el.scrollHeight;
    }

    function setStatus(panelId, text, color) {
        const el = document.getElementById(`status-${panelId}`);
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
    }

    function setModelName(panelId, name) {
        const el = document.getElementById(`model-name-${panelId}`);
        if (el) el.textContent = name;
    }

    function setActivePanel(panelId) {
        document.querySelectorAll('.workflow-panel').forEach(p => p.classList.remove('active-step'));
        const panel = document.getElementById(`panel-${panelId}`);
        if (panel) panel.classList.add('active-step');
    }

    function completePanel(panelId) {
        const panel = document.getElementById(`panel-${panelId}`);
        if (panel) {
            panel.classList.remove('active-step');
            panel.classList.add('completed');
        }
    }

    // --- Main Execution ---
    btnWorkflow.addEventListener('click', async () => {
        const prompt = inputPrompt.value.trim();
        if (!prompt) return;

        btnWorkflow.disabled = true;
        btnWorkflow.textContent = 'Orchestrating...';
        pipelineStatus.style.display = 'flex';
        pipelineSummary.style.display = 'none';
        pipelineSummary.innerHTML = '';

        // Reset all pipeline steps
        ['ps-security', 'ps-routing', 'ps-execution', 'ps-output'].forEach(id => setPipelineStep(id, '', '—'));

        // We'll build layout once we know the mode
        let resolvedMode = selectedMode;
        if (resolvedMode !== 'auto') {
            buildLayout(resolvedMode);
        }

        try {
            const response = await fetch(`${API_BASE}/api/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, mode: selectedMode })
            });

            if (!response.ok) throw new Error('Orchestration request failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done: readerDone } = await reader.read();
                if (readerDone) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    let data;
                    try { data = JSON.parse(line.substring(6)); } catch { continue; }

                    // ---- Pipeline Events ----
                    if (data.type === 'security_start') {
                        setPipelineStep('ps-security', 'active', 'checking...');
                    }
                    else if (data.type === 'security_done') {
                        setPipelineStep('ps-security', 'done', `${data.latencyMs}ms`);
                    }
                    else if (data.type === 'blocked') {
                        setPipelineStep('ps-security', 'error', 'BLOCKED');
                        outputArea.innerHTML = `<div class="workflow-panel"><div class="workflow-panel-body" style="color: var(--error); text-align: center; padding-top: 3rem;">
                            <p style="font-size: 1.5rem;">🛡️ Blocked</p>
                            <p style="margin-top: 8px;">Reason: ${data.reason || 'Security violation detected'}</p>
                        </div></div>`;
                        outputArea.className = 'workflow-output-area layout-single';
                    }
                    else if (data.type === 'routing_start') {
                        setPipelineStep('ps-routing', 'active', 'classifying...');
                    }
                    else if (data.type === 'routing_done') {
                        setPipelineStep('ps-routing', 'done', `${data.complexity} (${data.latencyMs}ms)`);
                    }
                    else if (data.type === 'mode_selected') {
                        resolvedMode = data.mode;
                        buildLayout(resolvedMode);
                        setPipelineStep('ps-execution', 'active', resolvedMode.toUpperCase());
                        // Highlight the mode button
                        modeBtns.forEach(b => b.classList.remove('active'));
                        const activeBtn = document.getElementById(`mode-${resolvedMode}`);
                        if (activeBtn) activeBtn.classList.add('active');
                    }

                    // ---- Step Events ----
                    else if (data.type === 'step_start') {
                        setActivePanel(data.step);
                        setStatus(data.step, 'Streaming...', 'var(--primary-blue)');
                        if (data.model) setModelName(data.step, data.model);
                    }
                    else if (data.type === 'delta') {
                        appendToPanel(data.step, data.content);
                    }
                    else if (data.type === 'step_done') {
                        completePanel(data.step);
                        const detail = data.latencyMs ? `${data.latencyMs}ms` : '';
                        setStatus(data.step, detail || 'Done', 'var(--success)');
                    }

                    // ---- Balanced Mode: Parallel Results ----
                    else if (data.type === 'parallel_results') {
                        // Fill both parallel panels with their text
                        const elA = document.getElementById('output-parallel-a');
                        const elB = document.getElementById('output-parallel-b');
                        if (elA) { elA.innerHTML = ''; elA.textContent = data.resultA.text; }
                        if (elB) { elB.innerHTML = ''; elB.textContent = data.resultB.text; }
                        setModelName('parallel-a', data.resultA.model);
                        setModelName('parallel-b', data.resultB.model);
                        setStatus('parallel-a', `${data.resultA.latencyMs}ms`, 'var(--success)');
                        setStatus('parallel-b', `${data.resultB.latencyMs}ms`, 'var(--success)');
                        completePanel('parallel-a');
                        completePanel('parallel-b');
                    }

                    // ---- Pipeline Complete ----
                    else if (data.type === 'pipeline_done') {
                        setPipelineStep('ps-execution', 'done', '✓');
                        setPipelineStep('ps-output', 'done', `${data.totalPipelineMs}ms`);
                        pipelineSummary.style.display = 'flex';
                        pipelineSummary.innerHTML = `
                            <span>✅ Pipeline complete</span>
                            <span>Mode: <strong>${data.mode.toUpperCase()}</strong></span>
                            <span>Total: <strong>${data.totalPipelineMs}ms</strong></span>
                        `;
                    }

                    // ---- Error ----
                    else if (data.type === 'error') {
                        console.error('Pipeline error:', data.message);
                        setPipelineStep('ps-execution', 'error', 'Error');
                    }
                }
            }

        } catch (error) {
            console.error('Orchestrator Error:', error);
            setPipelineStep('ps-execution', 'error', 'Failed');
        } finally {
            btnWorkflow.disabled = false;
            btnWorkflow.textContent = 'Start Orchestration';
        }
    });

    inputPrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnWorkflow.click();
    });
}

