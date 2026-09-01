"""
Continuum REST API — FastAPI application.

Serves the decision-archaeology pipeline as a clean REST API
that the frontend team can consume directly.

Endpoints:
  POST /api/query        — Main query endpoint (question → cited answer)
  GET  /api/health       — Health check
  GET  /api/decisions     — List all indexed decision records
  GET  /api/decisions/{id} — Get a specific decision record
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from continuum.bm25_index import BM25Index
from continuum.vector_store import get_all_records

logger = logging.getLogger(__name__)

# Shared state
bm25_index = BM25Index()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load BM25 index at startup."""
    logger.info("Loading decision records for BM25 index...")
    try:
        records = get_all_records()
        bm25_index.build(records)
        logger.info(f"BM25 index ready with {bm25_index.document_count} documents")
    except Exception as e:
        logger.warning(f"Failed to build BM25 index at startup: {e}")
        logger.warning("BM25 keyword search will be unavailable until records are loaded")
    yield


app = FastAPI(
    title="Continuum API",
    description=(
        "Decision-archaeology API — recovers the WHY behind engineering decisions "
        "from GitHub history. Every answer is citation-grounded with PR/issue/commit "
        "links, and explicitly reports when evidence is insufficient."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routes
from api.routes import router
app.include_router(router, prefix="/api")

# Serve the demo UI as static files
ui_dir = Path(__file__).resolve().parent.parent / "ui"
if ui_dir.exists():
    app.mount("/static", StaticFiles(directory=str(ui_dir)), name="static")

    @app.get("/")
    async def serve_ui():
        """Serve the demo UI."""
        return FileResponse(str(ui_dir / "index.html"))
