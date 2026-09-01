# Product Requirements Document (PRD) — Frontend
## Project: **Continuum Frontend (Powered by Stitch)**
### The Decision-Archaeology Interface for Engineering Teams

**Doc Owner:** Monish + Team 11:11  
**Version:** v2.0 (Stitch Design & Frontend Architecture)  
**Status:** Ready for Implementation  

---

## 1. Executive Summary & Vision

The Continuum Frontend transforms abstract, buried GitHub decision metadata into an intuitive, high-impact **"Decision Archaeology" Command Center**. 

Rather than presenting developers and hackathon judges with a conventional, monotonous AI chatbot, the Continuum Stitch Frontend delivers an ultra-modern, visually arresting, developer-first suite comprising:
1. **Interactive Decision Chat with Zero-Hallucination Proof Cards**
2. **"The Graveyard" Anti-Pattern Explorer** (Filtering exclusively for discarded experiments)
3. **Semantic Blame-to-Why Code Inspector** (IDE-style code view with inline debate drawers)
4. **Temporal Decision Lineage Stepper** (Chronological architectural evolution timeline)
5. **Architectural Drift Radar** (Live invariant gauge & violation tracker)
6. **One-Click MADR (Markdown Architecture Decision Record) Exporter**

---

## 2. Target Personas & Core User Journeys

### Persona A: The Onboarding / Mid-Level Engineer ("Alex")
- **Pain:** Hesitates to touch unfamiliar code; doesn't know why strange workarounds or configurations exist.
- **Journey:** Pastes a suspicious code snippet into **Blame-to-Why** or asks a "Why" question in **Decision Chat**, sees exact PR review quotes and author avatars, and exports the verified rationale into an ADR.

### Persona B: The Tech Lead / System Architect ("Elena")
- **Pain:** Worried about architectural drift; sees developers proposing approaches that were already proven defective 2 years ago.
- **Journey:** Enters team rules into the **Drift Radar** to spot silent architectural violations across recent merges, and inspects **The Graveyard** to confirm past benchmarked results before design reviews.

### Persona C: The Hackathon Judge / Investor
- **Pain:** Bothered by generic AI wrappers that hallucinate; wants instant proof of technical depth and polished aesthetics.
- **Journey:** Switches repositories in the **Multi-Repo Switcher**, clicks pre-verified benchmark queries (React, FastAPI), verifies the **Confidence Matrix breakdown**, and downloads an auto-generated ADR in under 5 seconds.

---

## 3. Design System & Aesthetic Principles (Stitch Architecture)

### 3.1 Visual Language
- **Theme:** Dark engineering terminal meets sleek glassmorphism.
- **Color Palette:**
  - Background Canvas: `#0a0a0f` (Obsidian Deep)
  - Surface Card / Elevate: `rgba(26, 26, 40, 0.7)` with `backdrop-filter: blur(12px)`
  - Primary Accent Gradient: `linear-gradient(135deg, #818cf8 0%, #c084fc 100%)` (Indigo to Orchid)
  - Semantic Status:
    - Confirmed / Accepted: `#34d399` (Emerald 400)
    - Inferred / Warning: `#fbbf24` (Amber 400)
    - Unknown / Error / Rejection: `#f87171` (Rose 400)
    - Source / Info: `#60a5fa` (Sky 400)
- **Typography:**
  - Primary UI: `Inter`, sans-serif (wght: 400, 500, 600, 700)
  - Code & Citations: `JetBrains Mono`, monospace (wght: 400, 500)

### 3.2 Micro-Interactions & Motion
- **Skeletal Loaders:** Shimmering gradient placeholders for asynchronous synthesis and search.
- **Smooth Drawer Transitions:** Slide-in right inspector panel for deep citation proofs.
- **Timeline Pin Drop Animation:** Step-by-step sequential rendering of historical milestones.
- **Interactive Gauge Animation:** Circular SVG radial bar fill on the Drift Radar.

---

## 4. Screen-by-Screen Functional Requirements

### Screen 1: Command Center & Decision Chat (`/`)
- **Global Header:**
  - Logo with gradient pulse.
  - Multi-Repository Dropdown Selector (facebook/react, tiangolo/fastapi, reduxjs/redux, django/django, vuejs/vue).
  - View Navigation Tabs: Chat, Blame-to-Why, Timeline, Drift Radar.
  - Real-time Backend Health & Record Counter badge (e.g. `75 decisions indexed`).
- **Mode Toggle Switch:**
  - `💡 Ask Why Mode` (Comprehensive hybrid decision retrieval).
  - `⚰️ The Graveyard Mode` (Red-tinted UI, focuses exclusively on rejected alternatives and anti-patterns).
- **Interactive Message Feed:**
  - User query bubble with active mode badge.
  - Assistant Response Bubble formatted with parsed Markdown links.
  - **Confidence Matrix Bar:** Proportional multi-segment bar displaying Confirmed / Inferred / Unknown ratios with hover tooltips.
  - **Citation Proof Cards:**
    - Source badge (`PR #123`, `ISSUE #456`, `COMMIT abc12`).
    - Confidence label (`confirmed`, `inferred`, `unknown`).
    - GitHub Author avatar and `@username`.
    - Verbatim italicized quote block.
    - Direct `↗ View on GitHub` deep link button.
  - **Action Bar:** `📄 Export as ADR` button with interactive download feedback state.

### Screen 2: Blame-to-Why Semantic Code Inspector (`/static/blame.html`)
- **Dual-Pane Layout:**
  - Left Pane: Multi-line code editor area with syntax highlighting, optional file path input, and quick sample preset buttons.
  - Right Pane: "Why This Exists" archaeological synthesis card, confidence breakdown, and attached PR debate cards.

### Screen 3: Temporal Decision Lineage Stepper (`/static/timeline.html`)
- **Search Header:** Concept/Module input (e.g., "Hooks", "Reconciler", "State Management").
- **Vertical Evolutionary Stepper:**
  - Grouped by Year (`2018`, `2020`, `2023`, `2025`).
  - Color-coded event nodes (PR = Blue, Issue = Purple, Commit = Green).
  - Expandable decision cards displaying summary, tradeoffs, and source jump-links.

### Screen 4: Architectural Drift Radar (`/static/radar.html`)
- **Principle Input:** Textarea with preset chip selectors (e.g. "Event bus requirement", "Gateway-only auth").
- **Drift Gauge Card:**
  - SVG Circular Gauge showing calculated Drift Percentage.
  - Total Scanned vs. Violations vs. Clean Metrics.
- **Violation Breakdown Cards:**
  - Severity Badges (🔴 `HIGH`, 🟡 `MEDIUM`, 🟢 `LOW`).
  - Explanation of *how* the PR violated the rule.
  - Direct PR link for architectural audits.

---

## 5. Non-Functional & Technical Specifications

| Parameter | Specification |
|---|---|
| **Architecture** | Component-driven, zero-dependency lightweight bundle with responsive Stitch layouts |
| **API Client** | Native asynchronous Fetch API with structured error handling & timeouts |
| **Response Latency** | UI render within < 50ms of API JSON arrival |
| **Cross-Browser** | Chrome, Edge, Safari, Firefox, Mobile Viewports (iOS / Android) |
| **Accessibility (a11y)** | WCAG AA contrast ratios, full keyboard navigation (`Tab`, `Enter`, `Shift+Enter`), screen reader aria labels |
| **Data Persistence** | LocalStorage caching for active repo selection and query history |

---

## 6. Success Metrics for Hackathon Demo

1. **Instant Clarity:** Judges understand within 10 seconds that this is *Decision Archaeology*, not a chatbot wrapper.
2. **Self-Proving Citations:** 100% of demo queries link directly to verifiable, live GitHub PRs.
3. **One-Click Delight:** Judges can generate and download a production-grade `.md` ADR file in 1 click.
4. **Proactive WOW Factor:** Live demo of Drift Radar and Graveyard modes demonstrating proactive developer protection.
