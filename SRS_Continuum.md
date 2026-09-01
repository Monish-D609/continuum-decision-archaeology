# Software Requirements Specification (SRS)
## Continuum — Decision-Rationale Retrieval Agent

**Team:** 11:11
**Event:** HackVerse: Into the Web
**Version:** 1.0 (Hackathon Scope)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **Continuum**, an agent that retrieves and answers questions about *why* past engineering decisions were made, using a team's existing GitHub history (commits, pull requests, issues) as its evidence source.

### 1.2 Scope
Continuum ingests the history of a single GitHub repository, indexes it by decision unit, and answers natural-language "why" questions with citation-grounded responses. It does not generate or review code, and does not judge code quality — it retrieves and explains historical reasoning that already exists but is otherwise buried.

### 1.3 Intended Audience
Hackathon judges, team members (Monish D, Naveen Kasi, and third member) building the system, and any future contributor extending it past the hackathon.

### 1.4 Definitions
- **Decision unit** — a chunk of ingested content representing one coherent decision (typically a full PR conversation thread, not an individual line or diff).
- **Grounded answer** — a response backed by a specific citation (commit SHA, PR number, or issue link) the user can independently verify.
- **Honest gap** — a response where the system explicitly states it found insufficient evidence, rather than guessing.

---

## 2. Overall Description

### 2.1 Product Perspective
Continuum is a standalone, single-tenant application for the hackathon demo: one connected repository, one indexed dataset, one chat interface. It is architected so a production version could later support multiple repos and users, but that is out of scope for this build.

### 2.2 Product Functions (Summary)
1. Ingest a GitHub repository's commits, PRs, and issues.
2. Chunk and embed that history by decision unit.
3. Accept natural-language questions from a user via chat.
4. Retrieve relevant historical context using hybrid (semantic + keyword) search.
5. Generate a cited answer, or explicitly report insufficient evidence.

### 2.3 User Classes
- **New/mid-level developer** — asks "why" questions before touching unfamiliar code.
- **Tech lead / reviewer** — checks whether an approach has already been tried or rejected.

### 2.4 Assumptions and Dependencies
- Target repository is public (or the team has access) and has meaningful PR/issue discussion — not just terse commit messages.
- Claude API access is available for the duration of the hackathon.
- GitHub API rate limits are sufficient for a single-repo ingestion within the build window.

### 2.5 Constraints
- 24-hour build window.
- Single repository, single tenant, no auth system.
- No model fine-tuning — retrieval and prompting only.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | The system shall connect to a specified public GitHub repository via the GitHub API. |
| FR-2 | The system shall retrieve closed pull requests including title, description, and review comments. |
| FR-3 | The system shall retrieve issues and their comment threads. |
| FR-4 | The system shall retrieve commit messages associated with the above. |
| FR-5 | The system shall chunk ingested content by decision unit (one PR/issue thread per chunk), not by raw diff line. |
| FR-6 | The system shall generate vector embeddings for each decision-unit chunk and store them in a vector database. |
| FR-7 | The system shall accept a natural-language question from the user via a chat interface. |
| FR-8 | The system shall retrieve candidate decision-unit chunks relevant to the question using hybrid semantic + keyword search. |
| FR-9 | The system shall synthesize an answer from retrieved chunks using an LLM, including inline citations (PR/issue/commit links). |
| FR-10 | The system shall detect when retrieved evidence is weak or absent and respond with an explicit "insufficient evidence" message rather than a fabricated answer. |
| FR-11 | The system shall display citations as clickable links back to the original GitHub source. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 (Performance) | End-to-end query response time shall be under ~10 seconds for the demo repository. |
| NFR-2 (Reliability) | Ingestion shall complete and be cached before the live demo; the system shall not depend on live GitHub API calls during demonstration. |
| NFR-3 (Usability) | The chat interface shall be simple enough to demo without explanation — a judge should be able to read a question and its cited answer without guidance. |
| NFR-4 (Accuracy/Trust) | The system shall never present an uncited claim as a factual historical rationale. |
| NFR-5 (Maintainability) | Ingestion, retrieval, and generation shall be separable components so any one can be modified without rebuilding the others. |

### 3.3 External Interface Requirements
- **GitHub API** — read-only access (REST or GraphQL) for commits, PRs, issues.
- **Claude API** — for answer synthesis and citation generation.
- **Vector store** (Chroma or pgvector) — for embedding storage and retrieval.
- **Chat UI** — minimal web interface (e.g., Streamlit or a lightweight Next.js page).

### 3.4 Out of Scope (Explicit Non-Requirements)
- Multi-repository support
- Slack/Discord ingestion
- User authentication / multi-tenancy
- Code generation or code review functionality
- Model fine-tuning

---

## 4. Acceptance Criteria (Demo-Readiness)
- A live question against the demo repository returns a cited, verifiable answer.
- At least one demo question deliberately triggers the "insufficient evidence" response.
- All citations resolve to real, correct GitHub PR/issue/commit links.
