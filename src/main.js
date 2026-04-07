import './style.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// --- Leaderboard Data ---
const models = [
  { id: 1, name: 'DeepSeek R1 70B', accuracy: '96.2%', speed: 120, cost: 'Free', status: 'Live' },
  { id: 2, name: 'Llama 4 Scout', accuracy: '91.2%', speed: 320, cost: 'Free', status: 'Live' },
  { id: 3, name: 'GPT-OSS 120B', accuracy: '93.1%', speed: 280, cost: 'Free', status: 'Live' },
  { id: 4, name: 'Claude 4 Opus', accuracy: '95.0%', speed: 78, cost: '$15.00', status: 'Live' },
  { id: 5, name: 'Qwen 3 32B', accuracy: '90.5%', speed: 210, cost: 'Free', status: 'Live' },
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
});

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

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
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
    const geminiOutput = document.getElementById('gemini-output');
    const groq1Output = document.getElementById('groq1-output');
    const groq2Output = document.getElementById('groq2-output');

    if (!btnBattle) return;

    btnBattle.addEventListener('click', async () => {
        const prompt = inputPrompt.value.trim();
        if (!prompt) return;

        const loadingHtml = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        btnBattle.disabled = true;
        btnBattle.textContent = 'Battling...';

        geminiOutput.innerHTML = loadingHtml;
        groq1Output.innerHTML = loadingHtml;
        groq2Output.innerHTML = loadingHtml;

        try {
            const response = await fetch(`${API_BASE}/api/arena/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            geminiOutput.textContent = data.gemini;
            groq1Output.textContent = data.groq1;
            groq2Output.textContent = data.groq2;

        } catch (error) {
            const errText = 'Error: ' + error.message;
            geminiOutput.textContent = errText;
            groq1Output.textContent = errText;
            groq2Output.textContent = errText;

            geminiOutput.style.color = '#f87171';
            groq1Output.style.color = '#f87171';
            groq2Output.style.color = '#f87171';
        } finally {
            btnBattle.disabled = false;
            btnBattle.textContent = 'Send Prompt';
        }
    });

    inputPrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnBattle.click();
    });
}
