/**
 * Continuum — Demo UI Client (Enhanced)
 *
 * Handles:
 * - Chat interaction with /api/query and /api/graveyard
 * - Mode tabs: Ask Why / Graveyard
 * - Repo switcher
 * - Rich Citation Proof Cards (author, quote, badge, deep-link)
 * - Confidence Matrix bar (confirmed / inferred / unknown breakdown)
 * - "Export as ADR" button per answer
 * - Health check and status indicator
 */

const API_BASE = window.location.origin;

// ── DOM Elements ─────────────────────────────────────────────────

const chatArea     = document.getElementById('chatArea');
const messages     = document.getElementById('messages');
const welcome      = document.getElementById('welcome');
const queryForm    = document.getElementById('queryForm');
const questionInput = document.getElementById('questionInput');
const sendBtn      = document.getElementById('sendBtn');
const statusIndicator = document.getElementById('statusIndicator');
const repoSelect   = document.getElementById('repoSelect');
const tabQuery     = document.getElementById('tabQuery');
const tabGraveyard = document.getElementById('tabGraveyard');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeDesc  = document.getElementById('welcomeDesc');
const exampleQueries = document.getElementById('exampleQueries');

// ── State ────────────────────────────────────────────────────────

let isLoading = false;
let currentMode = 'query'; // 'query' | 'graveyard'

// ── Initialization ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    setupEventListeners();
    setInterval(checkHealth, 30000);
});

function setupEventListeners() {
    queryForm.addEventListener('submit', (e) => { e.preventDefault(); submitQuery(); });

    questionInput.addEventListener('input', () => {
        sendBtn.disabled = !questionInput.value.trim() || isLoading;
        autoResizeTextarea();
    });

    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (questionInput.value.trim() && !isLoading) submitQuery();
        }
    });

    document.querySelectorAll('.example-query').forEach(btn => {
        btn.addEventListener('click', () => {
            questionInput.value = btn.dataset.query;
            sendBtn.disabled = false;
            autoResizeTextarea();
            submitQuery();
        });
    });

    // Mode tabs
    [tabQuery, tabGraveyard].forEach(tab => {
        tab.addEventListener('click', () => {
            currentMode = tab.dataset.mode;
            [tabQuery, tabGraveyard].forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateWelcomeForMode();
        });
    });
}

function updateWelcomeForMode() {
    if (currentMode === 'graveyard') {
        welcomeTitle.textContent = '⚰️ The Graveyard — What NOT to Do';
        welcomeDesc.innerHTML = 'Search for approaches that were <strong>explicitly tried and rejected</strong> in this repository\'s history. Surface the anti-patterns before you repeat them.';
        questionInput.placeholder = 'Ask what was tried and discarded... (e.g. "What REST alternatives were rejected?")';
    } else {
        welcomeTitle.textContent = 'Ask about past decisions';
        welcomeDesc.innerHTML = 'Continuum recovers the <strong>why</strong> behind engineering decisions from GitHub history — PRs, issues, and commits — with cited evidence you can verify.';
        questionInput.placeholder = "Ask a 'why' question about a past engineering decision...";
    }
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
        const dot  = statusIndicator.querySelector('.status-dot');
        const text = statusIndicator.querySelector('.status-text');
        dot.className = `status-dot ${data.status}`;
        text.textContent = data.status === 'healthy'
            ? `${data.record_count} decisions indexed`
            : data.message;
    } catch {
        const dot  = statusIndicator.querySelector('.status-dot');
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
    if (welcome) welcome.style.display = 'none';

    appendUserMessage(question, currentMode);
    questionInput.value = '';
    questionInput.style.height = 'auto';
    const loadingEl = appendLoadingMessage();

    const endpoint = currentMode === 'graveyard' ? 'graveyard' : 'query';
    const repo = repoSelect ? repoSelect.value : '';

    try {
        const body = { question };
        if (repo) body.repo = repo;

        const res = await fetch(`${API_BASE}/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        loadingEl.remove();
        appendAssistantMessage(data, question, currentMode);
    } catch (e) {
        loadingEl.remove();
        appendErrorMessage(e.message);
    } finally {
        isLoading = false;
        sendBtn.disabled = !questionInput.value.trim();
    }
}

// ── Message Rendering ────────────────────────────────────────────

function appendUserMessage(text, mode) {
    const div = document.createElement('div');
    div.className = 'message message-user';
    const modeTag = mode === 'graveyard' ? '<span class="mode-pill graveyard">⚰️ Graveyard</span>' : '';
    div.innerHTML = `<div class="message-content">${modeTag}${escapeHtml(text)}</div>`;
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
            <div class="loading-label">Searching decision records...</div>
        </div>
    `;
    messages.appendChild(div);
    scrollToBottom();
    return div;
}

function appendAssistantMessage(data, originalQuestion, mode) {
    const div = document.createElement('div');
    div.className = 'message message-assistant';

    const answerHtml = renderMarkdownLinks(data.answer);
    const breakdown = data.confidence_breakdown || { confirmed: 0, inferred: 0, unknown: 0 };
    const totalCitations = (breakdown.confirmed || 0) + (breakdown.inferred || 0) + (breakdown.unknown || 0);

    let html = `<div class="message-content">`;

    // Answer text
    html += `<div class="answer-text">${answerHtml}</div>`;

    // Confidence badge + matrix
    html += `
        <div class="confidence-row">
            <span class="confidence-badge ${data.confidence_summary}">
                ${getConfidenceIcon(data.confidence_summary)}
                ${formatConfidence(data.confidence_summary)}
            </span>
            ${totalCitations > 0 ? renderConfidenceMatrix(breakdown, totalCitations) : ''}
        </div>
    `;

    // Citation Proof Cards
    if (data.citations && data.citations.length > 0) {
        html += `<div class="citations-section">`;
        html += `<div class="citations-title">📎 Evidence Sources</div>`;
        html += `<div class="citation-cards">`;
        data.citations.forEach(c => {
            html += renderCitationCard(c);
        });
        html += `</div></div>`;
    }

    // Action buttons
    html += `
        <div class="message-actions">
            <button class="action-btn export-adr-btn"
                data-question="${escapeAttr(originalQuestion)}"
                data-answer="${escapeAttr(data.answer)}"
                data-citations="${escapeAttr(JSON.stringify(data.citations || []))}"
                data-confidence="${escapeAttr(data.confidence_summary)}">
                📄 Export as ADR
            </button>
        </div>
    `;

    html += `</div>`;
    div.innerHTML = html;

    // Wire up ADR export button
    const adrBtn = div.querySelector('.export-adr-btn');
    if (adrBtn) {
        adrBtn.addEventListener('click', () => exportAsADR(adrBtn));
    }

    messages.appendChild(div);
    scrollToBottom();
}

function renderCitationCard(c) {
    const badgeClass = c.confidence === 'confirmed' ? 'badge-confirmed'
        : c.confidence === 'inferred' ? 'badge-inferred' : 'badge-unknown';
    const badgeIcon = c.confidence === 'confirmed' ? '✓' : c.confidence === 'inferred' ? '◐' : '?';
    const sourceIcon = c.source_type === 'pr' ? '⤴' : c.source_type === 'issue' ? '●' : '◆';
    const sourceLabel = `${c.source_type.toUpperCase()} #${c.source_id}`;

    const authorHtml = c.author
        ? `<div class="citation-author">
              <img class="author-avatar" src="https://github.com/${c.author}.png?size=20" alt="@${c.author}" onerror="this.style.display='none'">
              <span>@${c.author}</span>
           </div>`
        : '';

    const quoteHtml = c.quote
        ? `<blockquote class="citation-quote">"${escapeHtml(c.quote)}"</blockquote>`
        : '';

    return `
        <div class="citation-card">
            <div class="citation-card-header">
                <span class="citation-badge ${badgeClass}">${badgeIcon} ${c.confidence}</span>
                ${authorHtml}
                <a class="citation-source-link" href="${escapeHtml(c.source_url)}" target="_blank" rel="noopener">
                    ${sourceIcon} ${sourceLabel} ↗
                </a>
            </div>
            <div class="citation-claim">${escapeHtml(c.text)}</div>
            ${quoteHtml}
        </div>
    `;
}

function renderConfidenceMatrix(breakdown, total) {
    const confirmedPct = total > 0 ? Math.round((breakdown.confirmed / total) * 100) : 0;
    const inferredPct  = total > 0 ? Math.round((breakdown.inferred  / total) * 100) : 0;
    const unknownPct   = total > 0 ? Math.round((breakdown.unknown   / total) * 100) : 0;

    return `
        <div class="confidence-matrix">
            <div class="matrix-bar-row">
                ${confirmedPct > 0 ? `<div class="matrix-seg confirmed" style="width:${confirmedPct}%" title="${breakdown.confirmed} confirmed"></div>` : ''}
                ${inferredPct > 0  ? `<div class="matrix-seg inferred"  style="width:${inferredPct}%"  title="${breakdown.inferred} inferred"></div>`  : ''}
                ${unknownPct > 0   ? `<div class="matrix-seg unknown"   style="width:${unknownPct}%"   title="${breakdown.unknown} unknown"></div>`    : ''}
            </div>
            <div class="matrix-legend">
                ${breakdown.confirmed > 0 ? `<span class="legend-dot confirmed"></span>${breakdown.confirmed} confirmed` : ''}
                ${breakdown.inferred > 0  ? `<span class="legend-dot inferred"></span>${breakdown.inferred} inferred`   : ''}
                ${breakdown.unknown > 0   ? `<span class="legend-dot unknown"></span>${breakdown.unknown} unknown`      : ''}
            </div>
        </div>
    `;
}

// ── Export as ADR ─────────────────────────────────────────────────

async function exportAsADR(btn) {
    const question   = btn.dataset.question;
    const answer     = btn.dataset.answer;
    const citations  = JSON.parse(btn.dataset.citations || '[]');
    const confidence = btn.dataset.confidence;

    btn.disabled = true;
    btn.textContent = '⏳ Generating ADR...';

    try {
        const res = await fetch(`${API_BASE}/api/export-adr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, citations, confidence_summary: confidence }),
        });
        if (!res.ok) throw new Error('Export failed');
        const data = await res.json();

        // Trigger download
        const blob = new Blob([data.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);

        btn.textContent = '✅ ADR Downloaded';
        setTimeout(() => { btn.textContent = '📄 Export as ADR'; btn.disabled = false; }, 2000);
    } catch (e) {
        btn.textContent = '❌ Export failed';
        btn.disabled = false;
        setTimeout(() => { btn.textContent = '📄 Export as ADR'; }, 2000);
    }
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

function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMarkdownLinks(text) {
    return escapeHtml(text).replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

function formatConfidence(level) {
    switch (level) {
        case 'strong_evidence':      return 'Strong Evidence';
        case 'partial_evidence':     return 'Partial Evidence';
        case 'insufficient_evidence': return 'Insufficient Evidence';
        default: return level;
    }
}

function getConfidenceIcon(level) {
    switch (level) {
        case 'strong_evidence':      return '✓';
        case 'partial_evidence':     return '◐';
        case 'insufficient_evidence': return '⚠';
        default: return '•';
    }
}
