/**
 * Continuum — Demo UI Client
 *
 * Handles:
 * - Chat interaction with the /api/query endpoint
 * - Rendering citation-grounded answers
 * - Confidence badge display
 * - Health check and status indicator
 */

const API_BASE = window.location.origin;

// ── DOM Elements ─────────────────────────────────────────────────

const chatArea = document.getElementById('chatArea');
const messages = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const queryForm = document.getElementById('queryForm');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');
const statusIndicator = document.getElementById('statusIndicator');

// ── State ────────────────────────────────────────────────────────

let isLoading = false;

// ── Initialization ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    setupEventListeners();
    // Refresh health every 30 seconds
    setInterval(checkHealth, 30000);
});

function setupEventListeners() {
    // Form submission
    queryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitQuery();
    });

    // Enable/disable send button based on input
    questionInput.addEventListener('input', () => {
        sendBtn.disabled = !questionInput.value.trim() || isLoading;
        autoResizeTextarea();
    });

    // Enter to send (Shift+Enter for newline)
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (questionInput.value.trim() && !isLoading) {
                submitQuery();
            }
        }
    });

    // Example query buttons
    document.querySelectorAll('.example-query').forEach(btn => {
        btn.addEventListener('click', () => {
            questionInput.value = btn.dataset.query;
            sendBtn.disabled = false;
            autoResizeTextarea();
            submitQuery();
        });
    });
}

function autoResizeTextarea() {
    questionInput.style.height = 'auto';
    questionInput.style.height = Math.min(questionInput.scrollHeight, 120) + 'px';
}

// ── Health Check ─────────────────────────────────────────────────

async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();

        const dot = statusIndicator.querySelector('.status-dot');
        const text = statusIndicator.querySelector('.status-text');

        dot.className = `status-dot ${data.status}`;
        text.textContent = data.status === 'healthy'
            ? `${data.record_count} decisions indexed`
            : data.message;
    } catch (e) {
        const dot = statusIndicator.querySelector('.status-dot');
        const text = statusIndicator.querySelector('.status-text');
        dot.className = 'status-dot';
        text.textContent = 'Offline';
    }
}

// ── Query Submission ─────────────────────────────────────────────

async function submitQuery() {
    const question = questionInput.value.trim();
    if (!question || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;

    // Hide welcome, show messages
    if (welcome) welcome.style.display = 'none';

    // Add user message
    appendUserMessage(question);
    questionInput.value = '';
    questionInput.style.height = 'auto';

    // Add loading indicator
    const loadingEl = appendLoadingMessage();

    try {
        const res = await fetch(`${API_BASE}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        loadingEl.remove();
        appendAssistantMessage(data);
    } catch (e) {
        loadingEl.remove();
        appendErrorMessage(e.message);
    } finally {
        isLoading = false;
        sendBtn.disabled = !questionInput.value.trim();
    }
}

// ── Message Rendering ────────────────────────────────────────────

function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message message-user';
    div.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messages.appendChild(div);
    scrollToBottom();
}

function appendLoadingMessage() {
    const div = document.createElement('div');
    div.className = 'message message-assistant';
    div.innerHTML = `
        <div class="message-content">
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messages.appendChild(div);
    scrollToBottom();
    return div;
}

function appendAssistantMessage(data) {
    const div = document.createElement('div');
    div.className = 'message message-assistant';

    // Convert markdown links in answer to HTML
    const answerHtml = renderMarkdownLinks(data.answer);

    let html = `
        <div class="message-content">
            <div class="answer-text">${answerHtml}</div>
            <span class="confidence-badge ${data.confidence_summary}">
                ${getConfidenceIcon(data.confidence_summary)}
                ${formatConfidence(data.confidence_summary)}
            </span>
    `;

    // Citations section
    if (data.citations && data.citations.length > 0) {
        html += `
            <div class="citations-section">
                <div class="citations-title">📎 Sources</div>
                ${data.citations.map(c => `
                    <div class="citation-item">
                        <span class="citation-confidence ${c.confidence}">${c.confidence}</span>
                        <div>
                            <div class="citation-text">${escapeHtml(c.text)}</div>
                            <a class="citation-link" href="${escapeHtml(c.source_url)}" target="_blank" rel="noopener">
                                ${c.source_type} #${c.source_id} ↗
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    html += '</div>';
    div.innerHTML = html;
    messages.appendChild(div);
    scrollToBottom();
}

function appendErrorMessage(errorText) {
    const div = document.createElement('div');
    div.className = 'message message-assistant';
    div.innerHTML = `
        <div class="message-content" style="border-color: var(--error);">
            <div class="answer-text" style="color: var(--error);">
                ⚠️ ${escapeHtml(errorText)}
            </div>
        </div>
    `;
    messages.appendChild(div);
    scrollToBottom();
}

// ── Helpers ───────────────────────────────────────────────────────

function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMarkdownLinks(text) {
    // Convert [text](url) to <a> tags
    return escapeHtml(text).replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

function formatConfidence(level) {
    switch (level) {
        case 'strong_evidence': return 'Strong Evidence';
        case 'partial_evidence': return 'Partial Evidence';
        case 'insufficient_evidence': return 'Insufficient Evidence';
        default: return level;
    }
}

function getConfidenceIcon(level) {
    switch (level) {
        case 'strong_evidence': return '✓';
        case 'partial_evidence': return '◐';
        case 'insufficient_evidence': return '⚠';
        default: return '•';
    }
}
