# Frontend Features & Specifications
## Continuum — Decision Archaeology UI Suite

This document specifies all frontend features, visual components, interactive states, and data binding contracts for the **Continuum Stitch Frontend**.

---

## 1. Feature Matrix Overview

| Feature ID | Feature Name | Description | Target Screen | Endpoint |
|:---|:---|:---|:---|:---|
| **FE-01** | **Multi-Repository Context Switcher** | Dropdown header selector to switch between active and benchmark repositories. | All Screens | Header Query Param (`?repo=...`) |
| **FE-02** | **"Ask Why" Decision Archaeology Chat** | Natural-language query interface returning cited, zero-hallucination architectural rationale. | `index.html` | `POST /api/query` |
| **FE-03** | **"The Graveyard" Anti-Pattern Filter** | Red-themed dedicated mode filtering strictly for rejected alternatives and failed RFCs. | `index.html` | `POST /api/graveyard` |
| **FE-04** | **"Honest Gap" Confidence Matrix** | Visual multi-color ratio bar displaying Confirmed, Inferred, and Unknown evidence percentages. | `index.html`, `blame.html` | `QueryResponse.confidence_breakdown` |
| **FE-05** | **Citation Proof Cards** | Expandable evidence cards with GitHub author avatars, verbatim quotes, badges, and deep links. | `index.html`, `blame.html` | `QueryResponse.citations` |
| **FE-06** | **Blame-to-Why Code Inspector** | Dual-pane code analysis interface explaining the historical intent behind raw code snippets. | `blame.html` | `POST /api/blame` |
| **FE-07** | **Temporal Decision Lineage Stepper** | Vertical chronological stepper grouping decisions by year with causal milestones. | `timeline.html` | `GET /api/timeline` |
| **FE-08** | **Architectural Drift Radar** | Invariant checking dashboard featuring SVG circular drift gauge and severity badges. | `radar.html` | `POST /api/drift-radar` |
| **FE-09** | **One-Click MADR Exporter** | Instant client-side generation and downloading of Markdown Architectural Decision Records. | `index.html`, `blame.html` | `POST /api/export-adr` |
| **FE-10** | **Real-Time Index Health Beacon** | Dynamic pulsating status dot reporting Supabase connection health and record counts. | All Screens | `GET /api/health` |

---

## 2. Detailed Component Specifications

### 2.1 Multi-Repository Context Switcher (`FE-01`)
- **Location:** Global Header (Top Right).
- **Options:**
  - `All indexed repos` (Broadest multi-repo search).
  - `facebook/react` (Hooks, Fiber architecture, ES6 class migration).
  - `tiangolo/fastapi` (Pydantic v2, dependency injection, async handlers).
  - `reduxjs/redux` (Immutability, middleware design, toolkit migration).
  - `django/django` (ORM query design, ASGI transition).
  - `vuejs/vue` (Reactivity system, Composition API vs Options API).
- **Behavior:** Selection persists across view transitions via sessionStorage and automatically attaches to all outbound API payloads.

---

### 2.2 Mode Switcher: Ask Why vs. The Graveyard (`FE-02`, `FE-03`)
- **Toggle Controls:** Segmented button group above the chat viewport.
- **Ask Why Mode (Default):**
  - Accent Color: Indigo / Purple (`#818cf8`).
  - Welcome Prompts: Focus on architectural rationale, design patterns, and tradeoffs.
  - Endpoint: `POST /api/query`.
- **The Graveyard Mode:**
  - Accent Color: Crimson / Rose (`#f87171`).
  - Header Tag: `⚰️ The Graveyard — What NOT to Do`.
  - Welcome Prompts: Focus on failed experiments, rejected RFCs, and avoided anti-patterns.
  - Endpoint: `POST /api/graveyard`.

---

### 2.3 Confidence Matrix & Citation Proof Cards (`FE-04`, `FE-05`)
- **Confidence Matrix Bar:**
  - **Green Segment:** Confirmed by Author (`#34d399`) — directly stated by commit/PR author.
  - **Yellow Segment:** Inferred from Review (`#fbbf24`) — deduced from reviewer debates.
  - **Gray Segment:** Unknown / Gap (`#5a5a78`) — unverified in records (honest gap).
- **Citation Card Elements:**
  - **Badge:** `PR #1234` or `ISSUE #567` (clickable pill).
  - **Author Avatar:** Dynamically loads from `https://github.com/{username}.png?size=20`.
  - **Quote Block:** Border-left highlighted blockquote containing verbatim PR discussion text.
  - **Source Jump:** `↗` icon linking directly to the line of code or comment on GitHub.

---

### 2.4 Blame-to-Why Semantic Code Inspector (`FE-06`)
- **Input Fields:**
  - `File path (optional)`: Text input for module context (e.g., `packages/react-reconciler/src/ReactFiberBeginWork.js`).
  - `Code snippet`: Multi-line monospace textarea with auto-resizing and syntax layout.
- **Action:** `🔍 Explain Why This Exists` (triggers `POST /api/blame`).
- **Output:** Left-bordered archaeology summary card + attached citation proof cards + one-click ADR download button.

---

### 2.5 Temporal Decision Lineage Stepper (`FE-07`)
- **Query Input:** Concept search bar (e.g. `fiber`, `hooks`, `state`).
- **Layout:**
  - **Year Dividers:** High-contrast sticky year markers (`2018`, `2020`, `2023`).
  - **Timeline Nodes:** Connected vertical rail with color-coded circular dots.
  - **Event Cards:** Title, short decision summary, timestamp, and direct PR link.

---

### 2.6 Architectural Drift Radar (`FE-08`)
- **Input Area:** Textarea for team rules + quick preset chips:
  - Chip 1: *"All database mutations must go through the event bus"*
  - Chip 2: *"Authentication must never be handled at the service layer — only at the gateway"*
  - Chip 3: *"All API responses must be paginated for collections larger than 100 items"*
- **Visualization:**
  - **Radial Gauge:** Computes Drift Violation Percentage (`0%` to `100%`).
  - **Status Counters:** Number of Violations (Red) vs. Number of Clean Decisions (Green).
  - **Violation Cards:**
    - Severity Tag: `🔴 HIGH`, `🟡 MEDIUM`, `🟢 LOW`.
    - Violation Explanation: Precise breakdown of how the PR deviated from the principle.
    - Deep Link: Direct link to the violating GitHub PR.

---

### 2.7 Reverse ADR Generator (`FE-09`)
- **Button:** `📄 Export as ADR` (rendered at the foot of every assistant answer).
- **Workflow:**
  1. User clicks button.
  2. Frontend sends query context to `POST /api/export-adr`.
  3. API returns MADR-compliant Markdown payload.
  4. Browser triggers instant file download (e.g., `adr-why-hooks-were-introduced.md`).
  5. Button displays temporary `✅ ADR Downloaded` feedback before resetting.
