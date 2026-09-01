import os
import json
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_sb_client = None


def _client():
    global _sb_client
    if _sb_client is None:
        from supabase import create_client
        _sb_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _sb_client


# ── Sessions ────────────────────────────────────────────────────────────────

def create_session(repo_url: Optional[str], title: str) -> Optional[str]:
    """Create a new chat session. Returns the UUID or None on failure."""
    try:
        res = _client().table("chat_sessions").insert({
            "repo_url": repo_url or None,
            "title": title[:120],
        }).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning(f"chat_store.create_session failed: {e}")
    return None


def list_sessions(limit: int = 30) -> list[dict]:
    """Return most recent sessions, newest first."""
    try:
        res = (
            _client()
            .table("chat_sessions")
            .select("id, repo_url, title, created_at, updated_at")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.warning(f"chat_store.list_sessions failed: {e}")
        return []


def get_session(session_id: str) -> Optional[dict]:
    """Return session metadata + its messages."""
    try:
        sess_res = (
            _client()
            .table("chat_sessions")
            .select("id, repo_url, title, created_at, updated_at")
            .eq("id", session_id)
            .single()
            .execute()
        )
        if not sess_res.data:
            return None

        msg_res = (
            _client()
            .table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        session = sess_res.data
        session["messages"] = msg_res.data or []
        return session
    except Exception as e:
        logger.warning(f"chat_store.get_session failed: {e}")
        return None


def delete_session(session_id: str) -> bool:
    """Delete a session and cascade-delete its messages."""
    try:
        _client().table("chat_sessions").delete().eq("id", session_id).execute()
        return True
    except Exception as e:
        logger.warning(f"chat_store.delete_session failed: {e}")
        return False


def _touch_session(session_id: str):
    try:
        _client().table("chat_sessions").update({
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", session_id).execute()
    except Exception as e:
        logger.warning(f"chat_store._touch_session failed: {e}")


# ── Messages ─────────────────────────────────────────────────────────────────

def save_message(
    session_id: str,
    role: str,
    content: str,
    mode: Optional[str] = None,
    citations: Optional[list] = None,
    confidence_summary: Optional[str] = None,
    is_insufficient_evidence: bool = False,
) -> Optional[str]:
    """Persist a single chat message. Returns message UUID or None."""
    try:
        payload = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "mode": mode,
            "citations": json.dumps(citations) if citations else None,
            "confidence_summary": confidence_summary,
            "is_insufficient_evidence": is_insufficient_evidence,
        }
        res = _client().table("chat_messages").insert(payload).execute()
        _touch_session(session_id)
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning(f"chat_store.save_message failed: {e}")
    return None
