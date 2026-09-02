# Backend & MCP API Testing Guide

This guide provides test commands, payload examples, and expected responses for validating Continuum's REST APIs and MCP Server.

---

## 🌐 Base URL
- **Production:** `https://continuumai.up.railway.app`
- **Local:** `http://localhost:8000`

---

## 🧪 1. Primary Decision Query (`POST /api/query`)

Submit a natural language architectural inquiry.

### Request:
```bash
curl -X POST "https://continuumai.up.railway.app/api/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Why did React remove SyntheticEvent pooling?",
    "repo": "facebook/react"
  }'
```

### Expected Response Format:
```json
{
  "answer": "React deprecated and removed SyntheticEvent pooling in version 17 (PR #18216) because modern JavaScript engines optimized object allocation, making the performance gain negligible while causing confusion and subtle bugs in asynchronous code...",
  "citations": [
    {
      "text": "Event pooling does not improve performance in modern browsers and confuses users.",
      "source_url": "https://github.com/facebook/react/pull/18216",
      "source_type": "pr",
      "source_id": "18216",
      "confidence": "confirmed",
      "author": "gaearon"
    }
  ],
  "confidence_summary": "strong evidence",
  "confidence_breakdown": {
    "confirmed": 3,
    "inferred": 1,
    "unknown": 0
  },
  "decision_records_used": ["facebook/react/pr-18216"],
  "is_insufficient_evidence": false
}
```

---

## ⚰️ 2. The Graveyard Search (`POST /api/graveyard`)

Inspect rejected alternatives, discarded prototypes, and explicit rejection reasons.

### Request:
```bash
curl -X POST "https://continuumai.up.railway.app/api/graveyard" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What alternatives were rejected when redesigning JSX transform?",
    "repo": "facebook/react"
  }'
```

---

## 🔍 3. Semantic Blame-to-Why (`POST /api/blame`)

Submit a code block to surface the historical PR discussions explaining why it exists.

### Request:
```bash
curl -X POST "https://continuumai.up.railway.app/api/blame" \
  -H "Content-Type: application/json" \
  -d '{
    "code_snippet": "function scheduleCallback(priorityLevel, callback, options) { ... }",
    "file_path": "packages/scheduler/src/forks/Scheduler.js",
    "repo": "facebook/react"
  }'
```

---

## ⚠️ 4. Architectural Drift Radar (`POST /api/drift-radar`)

Scan recent commits or changes against established historical invariants.

### Request:
```bash
curl -X POST "https://continuumai.up.railway.app/api/drift-radar" \
  -H "Content-Type: application/json" \
  -d '{
    "principle": "Pure render functions must not mutate global state or produce side effects during reconciliation.",
    "repo": "facebook/react"
  }'
```

---

## 🛡️ 5. Déjà Vu Sentinel (`POST /api/deja-vu`)

Check a proposed PR title/description against historically failed approaches.

### Request:
```bash
curl -X POST "https://continuumai.up.railway.app/api/deja-vu" \
  -H "Content-Type: application/json" \
  -d '{
    "pr_title": "Add object pooling to synthetic event system",
    "pr_description": "Reintroducing pooling to optimize memory reuse across high-frequency scroll events.",
    "repo": "facebook/react"
  }'
```

---

## 🔌 6. Model Context Protocol (MCP) Server

To test the MCP tools locally via stdio:

```bash
python mcp_server.py
```

Or connect it to Claude Desktop / Cursor:
```json
{
  "mcpServers": {
    "continuum": {
      "command": "python",
      "args": ["c:/Users/Monish D/Documents/Tribal Loss/mcp_server.py"],
      "env": {
        "CONTINUUM_API_URL": "https://continuumai.up.railway.app"
      }
    }
  }
}
```
