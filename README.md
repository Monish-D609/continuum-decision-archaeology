# Continuum — Decision Archaeology Agent

> Recovers the **WHY** behind engineering decisions from GitHub history.  
> Every answer is citation-grounded with direct PR, issue, and commit links. Zero hallucination.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-continuumai.up.railway.app-6366f1?logo=railway&logoColor=white)](https://continuumai.up.railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-818cf8.svg)](https://modelcontextprotocol.io)
[![Deployed on Railway](https://img.shields.io/badge/Deployed%20on-Railway-0B0D0E?logo=railway)](https://railway.com)

---

## 🌐 Live Deployment

**→ [https://continuumai.up.railway.app](https://continuumai.up.railway.app)**

The app is fully deployed on Railway with 75 decision records indexed from the `facebook/react` repository. No setup required — just open the link and start asking questions.

---

## 🌟 Features

Continuum goes far beyond naive RAG over code. It implements purpose-built decision archaeology features designed to preserve institutional knowledge and prevent costly architectural amnesia:

| # | Feature | Description | Route |
|:---|:---|:---|:---|
| **1** | **Decision Chat** | Ask *why* questions and get structured forensic dossier answers with archaeological strata (Context → Decision → Graveyard → Drift) | `POST /api/query` |
| **2** | **The Graveyard** | Dedicated search mode that exclusively retrieves abandoned prototypes, failed experiments, and rejected RFCs with explicit rejection reasons | `POST /api/graveyard` |
| **3** | **Blame-to-Why** | Semantic `git blame` — answers *why* a code snippet exists, surfacing PR debates and architectural tradeoffs | `POST /api/blame` |
| **4** | **Temporal Timeline** | Chronological timeline explorer tracking how decisions evolved over time (Genesis → Modifications → Reversals) | `GET /api/timeline` |
| **5** | **Drift Radar** | Automated invariant checker that scans recent decisions against stated architectural principles and flags silent violations | `POST /api/drift-radar` |
| **6** | **Chat History** | Every conversation is persisted to Supabase. Past sessions appear in the sidebar and can be restored with full message history | `POST /api/sessions` |
| **7** | **Reverse ADR Generator** | One-click export of any decision into a standardized [MADR](https://adr.github.io/madr/) ready to commit to `/docs/adr/` | `POST /api/export-adr` |
| **8** | **Déjà Vu Sentinel** | GitHub Action that checks opened PRs against historical rejected alternatives and warns developers before merging known anti-patterns | `POST /api/deja-vu` |
| **9** | **Native MCP Server** | Model Context Protocol server with 6 tools, allowing Cursor, Claude Code, and Copilot to query institutional memory directly in the IDE | `mcp_server.py` |
| **10** | **Citation Proof Cards** | Rich expandable cards featuring verbatim quotes, GitHub author avatars, source badges, and deep-link jump buttons | UI only |

---

## 🧱 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| **API Framework** | FastAPI 0.115+ (Python 3.10+) |
| **LLM Synthesis** | OpenRouter → Gemma 4 31B / Nemotron 3 (with fallback chain) |
| **Vector Search** | Supabase pgvector + ivfflat cosine index |
| **Keyword Search** | Rank-BM25 (sparse lexical matching for developer slang) |
| **Hybrid Fusion** | Reciprocal Rank Fusion (RRF) over dense + sparse results |
| **Chat Persistence** | Supabase PostgreSQL (`chat_sessions` + `chat_messages`) |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` |
| **Deployment** | Railway (Docker, auto-deploy from `main` branch) |

### Frontend
| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS v4 (custom design tokens) |
| **Icons** | Material Symbols (Google Fonts) |
| **Fonts** | Inter, Space Mono (Google Fonts) |
| **State** | React `useState` / `useEffect` (no external store) |

### Infrastructure
| Component | Technology |
|---|---|
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Hosting** | Railway (containerized, $PORT-aware) |
| **Container** | Multi-stage Dockerfile (Node build → Python runtime) |
| **CI/CD** | Git push → Railway auto-deploy |

---

## 🚀 Quick Start (Local)

### 1. Environment setup
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure `.env`
```env
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GITHUB_TOKEN=your_github_pat_token
```

### 3. Set up Supabase
Run in your Supabase **SQL Editor**:
```bash
# Print the vector store setup SQL
python -c "from continuum.vector_store import SETUP_SQL; print(SETUP_SQL)"
```
Then run [`migrations/001_chat_history.sql`](./migrations/001_chat_history.sql) to enable chat persistence.

### 4. Index a repository
```bash
python scripts/01_ingest.py --repo facebook/react --max-prs 100
python scripts/02_extract.py --repo facebook/react
python scripts/03_embed_and_index.py --repo facebook/react
```

### 5. Run the app
```bash
# Backend
uvicorn api.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📡 REST API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Ask *why* questions — hybrid retrieval + cited forensic synthesis |
| `POST` | `/api/graveyard` | Search rejected alternatives & anti-patterns |
| `POST` | `/api/blame` | Explain why a code snippet exists |
| `POST` | `/api/deja-vu` | Check PR against historically rejected patterns |
| `POST` | `/api/export-adr` | Export response as a Markdown ADR |
| `POST` | `/api/drift-radar` | Detect architectural principle violations |
| `GET`  | `/api/timeline` | Chronological decision lineage |
| `GET`  | `/api/decisions` | List paginated indexed decisions |
| `GET`  | `/api/health` | Health check + record count |
| `POST` | `/api/sessions` | Create a new chat session |
| `GET`  | `/api/sessions` | List recent chat sessions |
| `GET`  | `/api/sessions/{id}` | Get session + full message history |
| `DELETE` | `/api/sessions/{id}` | Delete a session |

---

## 🔌 MCP Server (IDE Integration)

Continuum includes a native **MCP Server** that exposes 6 tools to AI coding agents (Cursor, Claude Code, Windsurf):

```json
{
  "mcpServers": {
    "continuum": {
      "command": "python",
      "args": ["/path/to/mcp_server.py"],
      "env": { "CONTINUUM_API_URL": "http://localhost:8000" }
    }
  }
}
```

**Tools:** `query_decisions`, `check_graveyard`, `blame_to_why`, `check_deja_vu`, `detect_drift`, `get_decision_timeline`

---

## 🏗️ Architecture

```
GitHub API (PRs, Issues, Commits)
   │
   ▼
[Decision Extraction — LLM structured JSON]
   │
   ├──> [Dense Embeddings: all-MiniLM-L6-v2] ──> [Supabase pgvector]
   └──> [Sparse BM25 tokenization] ──────────> [In-Memory BM25 index]
                                                        │
   ┌────────────────────────────────────────────────────┘
   ▼
[Reciprocal Rank Fusion (RRF)]
   │
   ▼
[Evidence-Grounded Synthesis → Forensic Dossier (4 strata)]
   │
   ├──> React + TypeScript UI (Chat · Graveyard · Blame · Timeline · Drift Radar)
   ├──> Chat sessions persisted to Supabase PostgreSQL
   ├──> MCP Server (Cursor / Claude Code / Windsurf)
   └──> GitHub Action (Déjà Vu Sentinel PR Bot)
```

---

## 📝 Notable Changes (Recent)

| Change | Description |
|---|---|
| **Chat History** | All conversations are now persisted to Supabase. The sidebar shows a *Recent Sessions* panel — click any session to restore it, hover to delete. |
| **Forensic Dossier Format** | Every answer is structured as an archaeological excavation with 4 strata: 🏛️ Context, 📜 Decision & Rationale, ⚰️ Graveyard, 🧬 Drift. |
| **Robust Markdown Renderer** | Handles `*italic*`, `***bold-italic***`, `[CONFIRMED]`/`[INFERRED]` tags, mixed bullet/paragraph blocks, and strips LLM instruction echoes and dangling JSON. |
| **Railway Deployment** | Deployed via multi-stage Dockerfile. Auto-deploys on every push to `main`. Live at [continuumai.up.railway.app](https://continuumai.up.railway.app). |
| **Loading Screen** | Thematic boot sequence on app load with animated terminal-style progress indicators. |
| **High-Contrast Citations** | "View Source" buttons and inline citation links rendered as luminous badge chips instead of faded text. |

---

## License

MIT © 2025 — Built as part of the Tribal Loss / Continuum project.
