"""
Continuum configuration — loads environment variables and defines
the LLM fallback chain, embedding model config, and Supabase settings.

All secrets are read from environment variables, never hardcoded.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root if it exists
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")


@dataclass
class OpenRouterModel:
    """A single OpenRouter model in the fallback chain."""
    model_id: str
    label: str
    max_context: int = 262144


# ── Cloudflare Workers AI (primary LLM) ─────────────────────────────────────
# Free tier, no rate limits, 128k context window, Llama 3.1 8B
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")
CF_API_TOKEN  = os.getenv("CF_API_TOKEN", "")
CF_MODEL      = "@cf/meta/llama-3.1-8b-instruct"
CF_BASE_URL   = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run"

# ── OpenRouter fallback chain (free-tier only) ────────────────────────────────
# Used only when Cloudflare fails. Order: primary → fallback → auto-router
OPENROUTER_MODELS: list[OpenRouterModel] = [
    OpenRouterModel(
        model_id="google/gemma-4-31b-it:free",
        label="Gemma 4 31B (free)",
        max_context=262144,
    ),
    OpenRouterModel(
        model_id="nvidia/nemotron-3-super-120b-a12b:free",
        label="Nemotron 3 Super 120B (free)",
        max_context=262144,
    ),
    OpenRouterModel(
        model_id="openrouter/free",
        label="OpenRouter Auto-Router (free)",
        max_context=200000,
    ),
]

# Local Ollama fallback (last resort — requires Ollama running + model pulled)
OLLAMA_MODEL = "gemma3:4b-it-q4_K_M"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# ── Embedding model (local, GPU-accelerated) ─────────────────────────────────
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# ── API keys and URLs ────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ── Data paths ────────────────────────────────────────────────────────────────
DATA_DIR = _project_root / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
DECISIONS_DIR = DATA_DIR / "decisions"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
RAW_DATA_DIR.mkdir(exist_ok=True)
DECISIONS_DIR.mkdir(exist_ok=True)

# ── OpenRouter request settings ───────────────────────────────────────────────
OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://github.com/continuum-project",
    "X-Title": "Continuum Decision Archaeology",
    "Content-Type": "application/json",
}

# Retry settings for rate-limited (429) responses
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 2.0
BACKOFF_MULTIPLIER = 2.0

# ── Retrieval settings ────────────────────────────────────────────────────────
SEMANTIC_TOP_K = 10
BM25_TOP_K = 10
FINAL_TOP_K = 5  # After reciprocal rank fusion


def validate_config() -> list[str]:
    """Check that required environment variables are set. Returns list of missing vars."""
    missing = []
    if not OPENROUTER_API_KEY:
        missing.append("OPENROUTER_API_KEY")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not GITHUB_TOKEN:
        missing.append("GITHUB_TOKEN")
    return missing
