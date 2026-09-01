# Work Breakdown Structure (WBS)
## Continuum — 24-Hour Hackathon Build

**Team:** 11:11 (Monish D, Naveen Kasi, third member)
**Event:** HackVerse: Into the Web

---

## 1. WBS Hierarchy

**1.0 Continuum**

- **1.1 Project Setup** (Hours 0–2)
  - 1.1.1 Confirm Claude API access / credits
  - 1.1.2 Select demo repository (rich PR/issue discussion required)
  - 1.1.3 Set up GitHub API access and confirm rate limits
  - 1.1.4 Initialize repo, environments, shared task board

- **1.2 Ingestion Pipeline** (Hours 2–6)
  - 1.2.1 Write script to pull closed PRs (title, description, review comments)
  - 1.2.2 Write script to pull issues and comment threads
  - 1.2.3 Write script to pull commit messages
  - 1.2.4 Cache raw ingested data locally (avoid live re-fetching later)

- **1.3 Chunking & Indexing** (Hours 2–6, parallel with 1.2 once early data lands)
  - 1.3.1 Define decision-unit chunking logic (per PR/issue thread)
  - 1.3.2 Generate embeddings for each chunk
  - 1.3.3 Load embeddings into vector store (Chroma/pgvector)
  - 1.3.4 Validate index — spot-check a few known PRs are retrievable

- **1.4 Retrieval & Agent Layer** (Hours 6–10)
  - 1.4.1 Implement hybrid retrieval (semantic + keyword/BM25)
  - 1.4.2 Build orchestration flow (LangGraph/CrewAI): retrieve → synthesize
  - 1.4.3 Basic end-to-end Q&A working (no citations yet)

- **1.5 Citation & Honest-Gap Logic** (Hours 10–14)
  - 1.5.1 Force citation format in generation prompt (PR/issue/commit links)
  - 1.5.2 Implement confidence/evidence-strength check
  - 1.5.3 Implement "insufficient evidence" fallback response
  - 1.5.4 Test citation accuracy against source links

- **1.6 Chat UI** (Hours 14–18)
  - 1.6.1 Build minimal chat interface (Streamlit or lightweight web page)
  - 1.6.2 Wire UI to backend retrieval/generation API
  - 1.6.3 Render citations as clickable links in the UI

- **1.7 Testing & Demo Prep** (Hours 18–23)
  - 1.7.1 Run real test questions against the demo repo
  - 1.7.2 Fix retrieval/synthesis quality issues found in testing
  - 1.7.3 Select and pre-verify 3 strong demo questions
  - 1.7.4 Deliberately identify one question that triggers the honest-gap fallback
  - 1.7.5 Rehearse demo script and timing

- **1.8 Documentation & Submission** (Hours 20–24, parallel with 1.7)
  - 1.8.1 Finalize pitch deck
  - 1.8.2 Record backup demo video
  - 1.8.3 Write submission README (problem, solution, architecture, stack)
  - 1.8.4 Final buffer / contingency

---

## 2. Task Ownership (Suggested Split)

| Work Package | Suggested Owner |
|---|---|
| 1.1 Project Setup | Whole team |
| 1.2 Ingestion Pipeline | Member A |
| 1.3 Chunking & Indexing | Member A / Member B (handoff) |
| 1.4 Retrieval & Agent Layer | Member B |
| 1.5 Citation & Honest-Gap Logic | Member B / Member C |
| 1.6 Chat UI | Member C |
| 1.7 Testing & Demo Prep | Whole team |
| 1.8 Documentation & Submission | Whole team (deck owner rotates in early) |

*(Assign actual names once role split is confirmed — ingestion/retrieval and UI can run in parallel from Hour 2 onward if split correctly.)*

---

## 3. Milestones

| Time | Milestone |
|---|---|
| Hour 2 | Repo selected, API access confirmed, ingestion started |
| Hour 6 | Raw data ingested and indexed in vector store |
| Hour 10 | Basic end-to-end Q&A working (uncited) |
| Hour 14 | Citations + honest-gap fallback working |
| Hour 18 | Chat UI functional and connected |
| Hour 23 | Demo rehearsed, backup video recorded |
| Hour 24 | Final submission |

---

## 4. Dependencies

- 1.3 (Chunking & Indexing) depends on early output from 1.2 (Ingestion) — don't block on full ingestion completing first; start chunking on the first batch.
- 1.4 (Retrieval & Agent Layer) depends on 1.3 being at least partially complete.
- 1.5 (Citations) depends on 1.4's basic Q&A loop working.
- 1.6 (UI) can be built in parallel from Hour 2 using mocked responses, then wired to the real backend once 1.4/1.5 are ready — do not let UI work block on backend completion.
- 1.7 (Testing) depends on 1.5 and 1.6 both being functional.
