import './style.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// --- Leaderboard Data ---
const models = [
  { id: 1, name: 'Gemini 2.5 Pro', accuracy: '94.8%', speed: 145, cost: '$1.25', status: 'Live' },
  { id: 2, name: 'Llama 4 Scout', accuracy: '91.2%', speed: 320, cost: 'Free', status: 'Live' },
  { id: 3, name: 'GPT-OSS 120B', accuracy: '93.1%', speed: 280, cost: 'Free', status: 'Live' },
  { id: 4, name: 'Claude 4 Opus', accuracy: '95.0%', speed: 78, cost: '$15.00', status: 'Live' },
  { id: 5, name: 'Qwen 3 32B', accuracy: '90.5%', speed: 210, cost: 'Free', status: 'Live' },
];

// --- Core Logic ---
document.addEventListener('DOMContentLoaded', () => {
    initLeaderboard();
    initScrollAnimations();
    initLiveUpdates();
    initCodebaseAgent();
    initArenaBattle();
});

function initLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body');
    if (!leaderboardBody) return;

    leaderboardBody.innerHTML = models.map(model => `
        <div class="leaderboard-row" id="model-${model.id}">
            <div class="col model-name">${model.name}</div>
            <div class="col score-high">${model.accuracy}</div>
            <div class="col speed-val">${model.speed}</div>
            <div class="col cost-val">${model.cost}</div>
            <div class="col"><span class="status-active">${model.status}</span></div>
        </div>
    `).join('');
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.content-reveal').forEach(el => observer.observe(el));

    setTimeout(() => {
        document.querySelector('.hero').classList.add('active');
    }, 1000);
}

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

    // --- Upload Handler ---
    async function handleUpload(files) {
        const heading = uploadForm.querySelector('h3');
        heading.textContent = 'Uploading...';

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
            heading.textContent = '✓ Upload Complete — Drop more to replace';

            btnRunAgent.disabled = false;
            btnNewSession.style.display = 'inline-flex';

            // Reset previous results
            diffSummary.style.display = 'none';
            diffList.innerHTML = '';
            btnExportZip.style.display = 'none';
            agentConsole.style.color = '#10b981';
            agentConsole.textContent = 'Awaiting task initialization...';

        } catch (err) {
            heading.textContent = 'Upload failed — try again';
            alert('Upload error: ' + err.message);
        }
    }

    // --- Run Agent ---
    btnRunAgent.addEventListener('click', async () => {
        const task = agentTaskInput.value.trim();
        if (!task || !currentSessionId) return;

        btnRunAgent.disabled = true;
        btnRunAgent.textContent = 'Thinking...';
        agentConsole.style.color = '#10b981';
        agentConsole.textContent = '⏳ Agent is analyzing your codebase... This may take 10-30 seconds.';

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
            agentConsole.style.color = '#10b981';
            agentConsole.textContent = data.output;

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
            agentConsole.style.color = '#f87171';
            agentConsole.textContent = '[Agent Error] ' + error.message;
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
