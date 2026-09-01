# Continuum — Decision Archaeology Agent

> Recovers the **WHY** behind engineering decisions from GitHub history.  
> Every answer is citation-grounded with direct PR, issue, and commit links. Zero hallucination.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-818cf8.svg)](https://modelcontextprotocol.io)

---

## 🌟 10 Standout Features Implemented

Continuum goes far beyond naive RAG over code. It implements 10 purpose-built decision archaeology features designed to preserve institutional knowledge and prevent costly architectural amnesia:

| # | Feature | Description | Artifact / Route |
|:---|:---|:---|:---|
| **1** | **"Déjà Vu" & Anti-Pattern Sentinel** | A GitHub Action & API that checks opened PRs against historical rejected alternatives and warns developers before merging known anti-patterns. | `.github/workflows/deja_vu_check.yml`<br>`POST /api/deja-vu` |
| **2** | **Blame-to-Why** | Semantic `git blame` that answers *why* a code snippet exists, surfacing the PR debates and architectural tradeoffs rather than just author and timestamp. | `ui/blame.html`<br>`POST /api/blame` |
| **3** | **Reverse ADR Generator** | One-click export of any decision query into a standardized [MADR (Markdown Architectural Decision Record)](https://adr.github.io/madr/) ready to commit to `/docs/adr/`. | `continuum/adr_generator.py`<br>`POST /api/export-adr` |
| **4** | **Native MCP Server** | Model Context Protocol server (`mcp_server.py`) with 6 tools, allowing Cursor, Claude Code, and Copilot to query institutional memory directly in your IDE. | `mcp_server.py` |
| **5** | **The Graveyard** | Dedicated search mode that exclusively retrieves abandoned prototypes, failed experiments, and rejected RFCs with explicit rejection reasons. | `ui/index.html` (Graveyard Tab)<br>`POST /api/graveyard` |
| **6** | **Temporal Decision Lineage** | Chronological timeline explorer tracking how decisions evolved over time (Genesis → Modifications → Reversals) grouped by year. | `ui/timeline.html`<br>`GET /api/timeline` |
| **7** | **Honest Gap Confidence Matrix** | Per-claim verification matrix with visual breakdown bars categorizing evidence into *Confirmed by Author*, *Inferred from Review*, or *Unknown Gap*. | `ui/app.js`<br>`api/schemas.py` |
| **8** | **Multi-Repository Switcher** | Live repository selector with benchmark presets (React, FastAPI, Redux, Django, Vue) and scoped backend retrieval. | Header Dropdown<br>`repo` query parameter |
| **9** | **Citation Proof Cards** | Rich expandable cards featuring verbatim quotes, GitHub author avatars, source badges, and deep-link jump buttons. | `ui/app.js`<br>`ui/style.css` |
| **10** | **Architectural Drift Radar** | Automated invariant checker that scans recent decisions against stated architectural principles and flags silent violations with severity ratings. | `ui/radar.html`<br>`POST /api/drift-radar` |

---

## 🚀 Quick Start

### 1. Set up environment
```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies (includes FastAPI, Supabase, sentence-transformers, MCP)
pip install -r requirements.txt
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your keys:
```env
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GITHUB_TOKEN=your_github_pat_token
```

### 3. Set up Supabase pgvector
Print and execute the setup SQL schema in your Supabase SQL Editor:
```bash
python -c "from continuum.vector_store import SETUP_SQL; print(SETUP_SQL)"
```

### 4. Run the Pipeline
```bash
# Stage 1: Ingest GitHub PRs, issues, comments
python scripts/01_ingest.py --repo facebook/react --max-prs 100

# Stage 2: Extract structured decision records
python scripts/02_extract.py --repo facebook/react

# Stage 3: Embed and index into Supabase pgvector
python scripts/03_embed_and_index.py --repo facebook/react --test-query "Why were hooks introduced?"

# Stage 4: Test query from terminal
python scripts/04_query.py --question "Why were React Hooks introduced?"
```

### 5. Start the Application
```bash
uvicorn api.main:app --reload --port 8000
```
- **Main Chat & Graveyard UI:** http://localhost:8000
- **Blame-to-Why Page:** http://localhost:8000/static/blame.html
- **Temporal Timeline Page:** http://localhost:8000/static/timeline.html
- **Architectural Drift Radar:** http://localhost:8000/static/radar.html
- **Interactive OpenAPI Documentation:** http://localhost:8000/docs

---

## 🔌 IDE Integration (Model Context Protocol)

Continuum includes a native **MCP Server** (`mcp_server.py`) that exposes 6 decision-archaeology tools directly to AI coding agents (Cursor, Claude Code, Windsurf):

### MCP Tools Included:
1. `query_decisions(question, repo)` — Ask why decisions were made with full citations
2. `check_graveyard(question, repo)` — Search rejected alternatives before coding
3. `blame_to_why(code_snippet, file_path, repo)` — Explain historical intent behind code
4. `check_deja_vu(pr_title, pr_description, repo)` — Check if a proposal was previously rejected
5. `detect_drift(principle, repo, recent_n)` — Check if changes violate architectural rules
6. `get_decision_timeline(query, repo, top_k)` — Get chronological evolution of a module

### Connect to Cursor / Claude Code:
Add to your `mcpServers` configuration (`claude_desktop_config.json` or Cursor Settings):
```json
{
  "mcpServers": {
    "continuum": {
      "command": "python",
      "args": ["/path/to/continuum/mcp_server.py"],
      "env": {
        "CONTINUUM_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

---

## 🤖 GitHub Action: Déjà Vu PR Sentinel

Automate architectural regression checks on every Pull Request by adding `.github/workflows/deja_vu_check.yml` to your repository:
```yaml
name: "Continuum — Déjà Vu Anti-Pattern Check"
on:
  pull_request:
    types: [opened, synchronize, reopened]
```
Whenever a developer proposes an approach that was previously benchmarked and discarded, Continuum automatically posts a review comment citing the original historical discussion and rejection reason.

---

## 📡 REST API Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Ask 'why' questions with hybrid retrieval & cited synthesis |
| `POST` | `/api/graveyard` | Search explicitly for rejected alternatives & anti-patterns |
| `POST` | `/api/blame` | Explain why a code snippet exists using PR/issue evidence |
| `POST` | `/api/deja-vu` | Check PR title/body against historical rejected approaches |
| `POST` | `/api/export-adr` | Export decision responses as downloadable Markdown ADRs |
| `POST` | `/api/drift-radar` | Detect violations of architectural principles |
| `GET` | `/api/timeline` | Get chronological decision lineage for a topic |
| `GET` | `/api/decisions` | List paginated indexed decision records |
| `GET` | `/api/health` | Service health status and indexed record count |

---

## 🧱 Architecture & Tech Stack

```
GitHub API (PRs, Issues, Commits)
   │
   ▼
[Inference Chunking by Decision Unit]
   │
   ├──> [Dense Embeddings: sentence-transformers/all-MiniLM-L6-v2] ──> [Supabase pgvector]
   └──> [Sparse Tokenization] ────────────────────────────────────> [In-Memory BM25]
                                                                            │
   ┌────────────────────────────────────────────────────────────────────────┘
   ▼
[Reciprocal Rank Fusion (RRF)] ──> [Evidence-Grounded Synthesis] ──> [Cited Output]
                                                                           │
   ├──> UI (Chat, Graveyard, Blame, Timeline, Drift Radar) <───────────────┤
   ├──> MCP Server (Cursor / Claude Code / Windsurf) <─────────────────────┤
   └──> GitHub Action (Déjà Vu Sentinel PR Bot) <──────────────────────────┘
```

- **Backend:** FastAPI, Python 3.10+
- **LLM Synthesis:** OpenRouter (Gemma 4 31B, Nemotron 3) with strict JSON grounding & fallback
- **Vector Search:** Supabase pgvector + ivfflat cosine index
- **Keyword Search:** Rank-BM25 (sparse lexical matching for developer slang)
- **Frontend:** Responsive vanilla HTML5, modern CSS3 glassmorphism, ES6 JavaScript
