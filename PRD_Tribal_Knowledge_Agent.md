# Product Requirements Document
## Codename: **Continuum** — An Agent That Remembers Why, Not Just What
*(rename freely — used as a placeholder throughout)*

**Event:** HackVerse: Into the Web (24-hour open innovation hackathon)
**Doc owner:** Monish + team
**Version:** v1.0 — Hackathon Scope
**Status:** Draft for build kickoff

---

## 1. Problem Statement

When a senior or long-tenured engineer leaves a team, the codebase stays — but the *reasoning* behind it doesn't. Why was this service split this way? Why was that "obvious" refactor rejected twice? Why does this config flag exist? That context lives in closed PR threads, buried Slack messages, and people's heads. It is almost never in the code or the docs.

New hires and even existing teammates re-litigate settled decisions, re-introduce previously-rejected approaches, and burn cycles reconstructing context that already existed and was already lost. This is a recognized, expensive, real bottleneck in every engineering org — not a hypothetical.

**Evidence this is a real, judge-recognized problem:** it was the exact framing GitLab used to describe why their 2026 AI Hackathon Grand Prize-winning project (a code-dependency/evolution mapper) mattered to judges — the "senior engineer leaves and takes half the team's knowledge with them" scenario.

---

## 2. Goal

Build an agent that **reconstructs institutional "why" from the artifacts a team already produces** — commits, PR discussions, issue threads — and answers questions about past decisions with sourced, traceable evidence, not hallucinated guesses.

**Non-goal (explicitly out of scope for this build):** This is not a general codebase Q&A bot ("what does this function do") and not a documentation generator. It answers *decision* and *rationale* questions specifically: "why," "why not," "who decided," "what was tried before."

---

## 3. Target User

- Primary: a mid-level engineer or new hire joining an existing codebase, who needs to understand a decision before touching related code.
- Secondary: a tech lead doing a design review who wants to check "has this been proposed and rejected before?" before a meeting.

---

## 4. Core User Stories (MVP)

1. As an engineer, I can ask *"Why is auth handled in the gateway instead of per-service?"* and get an answer grounded in actual PR/issue discussion, with links back to source.
2. As an engineer, I can ask *"Has anyone tried [X approach] before?"* and the agent surfaces prior attempts/rejections, even if the words don't match exactly (semantic search, not keyword search).
3. As a tech lead, I can point the agent at a specific file or module and get a timeline: what changed, in what order, and the stated reasoning for each major change.
4. As any user, every answer includes citations (commit SHA / PR number / issue link) — the agent never presents unsourced reasoning as fact.

---

## 5. Explicitly Out of Scope for the 24-Hour Build

- Multi-repo support (single repo only for the demo)
- Slack/Discord ingestion (stretch goal only if time allows — PRs + issues + commits are the MVP data source)
- Fine-tuning any model — this is a retrieval + agent orchestration problem, not a training problem
- Auth/permissions/multi-tenant anything
- Polished UI beyond a functional chat interface

---

## 6. System Architecture (MVP)

```
                    ┌─────────────────────┐
                    │   GitHub Repo (API)  │
                    │  commits / PRs /     │
                    │  issues / review     │
                    │  comments            │
                    └──────────┬───────────┘
                               │ ingestion script
                               ▼
                    ┌─────────────────────┐
                    │  Chunking + Embedding │
                    │  (per PR/issue thread,│
                    │   not per-line diff)  │
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Vector Store        │
                    │  (Chroma / pgvector)  │
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │  Retrieval + Agent    │
                    │  Orchestration Layer  │
                    │  (LangGraph / CrewAI) │
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │  LLM (Claude API)     │
                    │  answer + citations   │
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │  Chat UI (Next.js /   │
                    │  simple Streamlit)    │
                    └─────────────────────┘
```

### Component Notes

- **Ingestion:** Use GitHub REST/GraphQL API to pull closed PRs (title, description, review comments, linked issues) and commit messages for one demo repo. Cache locally — don't re-fetch during the demo.
- **Chunking strategy is the actual hard part.** Chunk by *decision unit* (a full PR conversation thread), not by raw diff lines. This is what separates "decision archaeology" from generic RAG-over-code.
- **Retrieval:** Hybrid — semantic (embeddings) + keyword/BM25 fallback, since decision language is often informal ("let's not do this," "reverting because...") and doesn't embed cleanly against a formal question.
- **Agent layer:** A simple two-step agent is enough for MVP — (1) retrieve candidate threads, (2) synthesize + cite, with an explicit "insufficient evidence" fallback rather than fabricating a rationale. This "don't hallucinate, say when evidence is thin" behavior is a differentiator judges will notice.
- **Open-source components to lean on, not reinvent:** LangGraph or CrewAI for orchestration, Chroma for vector store, GitHub API for ingestion — all mature, well-documented, fast to wire up under time pressure.

---

## 7. Success Criteria for the Demo

| Criterion | Target |
|---|---|
| Answer includes real citation (PR/issue link) | 100% of demo queries |
| Agent explicitly declines/flags when evidence is weak | At least 1 demo query shows this |
| End-to-end latency per query | Under ~10 seconds |
| Demo repo | Use a real, well-known open-source repo (not a toy repo) so judges can verify answers themselves live |

---

## 8. Mapping to Likely Judging Criteria

| Criterion | How this project scores |
|---|---|
| Real-world impact | Directly addresses a named, expensive org-level failure mode (knowledge attrition) |
| Technical complexity | Chunking-by-decision-unit + hybrid retrieval + citation-grounded synthesis is non-trivial, not a wrapper |
| Originality | Most "codebase AI" tools answer "what," not "why" — this is a clear differentiation |
| Feasibility / could this be real | Directly usable by any engineering org with a GitHub repo, zero training required |
| Demo quality | Live, verifiable answers against a real public repo make the demo self-proving |

---

## 9. 24-Hour Build Plan (Suggested)

| Hours | Focus |
|---|---|
| 0–2 | Finalize demo repo choice, set up ingestion script, confirm GitHub API access/rate limits |
| 2–6 | Build ingestion + chunking-by-decision-unit pipeline, load into vector store |
| 6–10 | Build retrieval + agent orchestration layer, get basic Q&A working end-to-end |
| 10–14 | Add citation grounding + "insufficient evidence" fallback logic |
| 14–18 | Build minimal chat UI, wire to backend |
| 18–21 | Test against real questions on the demo repo, fix retrieval quality issues |
| 21–23 | Polish demo flow, prepare 3 strong pre-tested example queries |
| 23–24 | Record backup demo video, final buffer |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retrieval quality is poor on informal language | Pick a demo repo with rich, well-written PR discussions (not one with terse commit messages only) |
| GitHub API rate limits mid-hackathon | Ingest and cache early (Hour 0–2), don't rely on live fetching during demo |
| Agent hallucinates a rationale that wasn't actually stated | Hard-code a "no strong match found" fallback path and demo it deliberately — turns a limitation into a credibility signal |
| Scope creep (Slack ingestion, multi-repo, etc.) | Treat everything past Section 6 as stretch-only; protect the core loop first |

---

## 11. Open Questions for the Team

- Which public repo do we pick for the demo — one with famously well-documented decision history (stronger demo) vs. speed of ingestion?
- Do we have Claude API access sorted for the hackathon, or need to request credits/sponsor API keys in advance?
- Who owns ingestion vs. retrieval vs. UI — split now to avoid Hour 10 collisions.
