# Contributor Guide & Role Allocation

Welcome to **Continuum**! This guide outlines the development workflow, role boundaries, API contracts, and engineering practices for our team.

---

## 👥 Engineering Team Ownership

```
Continuum Engineering Team
├── 🎨 Person 1: Frontend & Interface Lead
│   ├── React 18 + TypeScript + Vite Dashboard
│   ├── 4-Strata Dossier Views & Citation Badge Cards
│   ├── Semantic Blame-to-Why & Timeline Visualization
│   └── Community Session Persistence & Multi-Repo Switcher
│
├── ⚙️ Person 2: Backend & Infrastructure Lead
│   ├── FastAPI Endpoints & Asynchronous Lifecycle
│   ├── Supabase pgvector Indexing & DDL Migrations
│   ├── In-Memory BM25 Index & RRF Merging Logic
│   └── Railway Multi-Stage Docker Container Deployment
│
└── 🧠 Person 3: AI Architecture & Decision Pipeline Lead
    ├── Schema-Constrained Extraction Prompts (Pydantic / Zod)
    ├── Confidence Classification Engine (Confirmed / Inferred / Unknown)
    ├── Model Context Protocol (MCP Server for IDEs)
    └── Déjà Vu Sentinel (GitHub PR CI/CD Bot)
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and `npm`
- Git

### 2. Backend Environment
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📐 API Interface Contract

All backend routes follow strict Pydantic schemas in [`api/schemas.py`](../api/schemas.py).

### Core Response Schema (`POST /api/query`):
```typescript
interface QueryResponse {
  answer: string;
  citations: Citation[];
  confidence_summary: "strong evidence" | "partial evidence" | "insufficient evidence";
  confidence_breakdown: {
    confirmed: number;
    inferred: number;
    unknown: number;
  };
  decision_records_used: string[];
  is_insufficient_evidence: boolean;
}

interface Citation {
  text: string;
  source_url: string;
  source_type: "pr" | "issue" | "commit";
  source_id: string;
  confidence: "confirmed" | "inferred" | "unknown";
  author?: string;
  quote?: string;
}
```

---

## 🌿 Git Workflow & Branching Policies

1. **Branch Naming:**
   - `feat/feature-name` (New capabilities)
   - `fix/bug-description` (Bug fixes)
   - `docs/doc-update` (Documentation improvements)
2. **Pull Request Protocol:**
   - All PRs must include before/after screenshots for UI updates.
   - Zero hardcoded API keys; `.env` must never be committed.
   - Run linter and tests before submitting.
