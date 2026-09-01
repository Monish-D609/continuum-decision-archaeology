# Continuum — Decision Archaeology

> Recovers the **why** behind engineering decisions from GitHub history.  
> Every answer is citation-grounded with PR/issue/commit links.

## Quick Start

### 1. Set up environment```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```env
OPENROUTER_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_key_here
GITHUB_TOKEN=your_github_pat_here
```

### 3. Set up Supabase

Run the SQL migration in your Supabase SQL Editor — the setup SQL is printed by:
```bash
python -c "from continuum.vector_store import SETUP_SQL; print(SETUP_SQL)"
```

### 4. Run the pipeline (bottom-up)

```bash
# Stage 1: Ingest GitHub data
python scripts/01_ingest.py --repo facebook/react --max-prs 100

# Stage 2: Extract decision records
python scripts/02_extract.py --repo facebook/react

# Stage 3: Embed and index into Supabase pgvector
python scripts/03_embed_and_index.py --repo facebook/react --test-query "Why were hooks introduced?"

# Stage 4+5: Query the pipeline
python scripts/04_query.py --question "Why were React Hooks introduced?"

# End-to-end validation
python scripts/05_end_to_end.py
```

### 5. Start the API server

```bash
uvicorn api.main:app --reload --port 8000
```

Visit http://localhost:8000/docs for the OpenAPI documentation.  
Visit http://localhost:8000 for the demo UI.

## Architecture

```
GitHub artifacts → ingestion → decision extraction → embedding/indexing
    → hybrid retrieval (semantic + BM25) → evidence-grounded synthesis → cited answer
```

### Key Design Principles

- **Decision archaeology, not generic RAG** — extracts structured decision records with alternatives, rejections, and evidence
- **Citation-grounded** — every claim traces to a specific PR/issue/commit
- **Honest gaps** — explicitly reports when evidence is insufficient rather than guessing
- **Confidence tagging** — every fact is labeled confirmed, inferred, or unknown

### Tech Stack

| Layer | Technology |
|---|---|
| LLM | OpenRouter free-tier (Gemma 4 31B → Nemotron 3 → auto-router) |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 (local GPU) |
| Vector store | Supabase pgvector |
| Keyword search | BM25 (in-memory) |
| API | FastAPI |
| UI | Vanilla HTML/CSS/JS |

## API Contract

### POST /api/query
```json
// Request
{ "question": "Why were React Hooks introduced?" }

// Response
{
  "answer": "React Hooks were introduced because...",
  "citations": [
    {
      "text": "Hooks simplify component logic reuse",
      "source_url": "https://github.com/facebook/react/pull/...",
      "source_type": "pr",
      "source_id": "1234",
      "confidence": "confirmed"
    }
  ],
  "confidence_summary": "strong_evidence",
  "is_insufficient_evidence": false
}
```

## ⚠️ Supabase Free Tier Note

Free Supabase projects **pause after 7 days of inactivity**. If there's a gap before the demo, ping the project awake by visiting the Supabase dashboard.
