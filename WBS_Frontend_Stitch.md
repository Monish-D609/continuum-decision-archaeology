# Work Breakdown Structure (WBS) — Frontend
## Project: **Continuum Frontend Implementation (Stitch Suite)**

**Team:** 11:11  
**Scope:** Complete Frontend Overhaul, Component Modularization & Stitch Polish  

---

## 1. WBS Hierarchy

```
1.0 Continuum Stitch Frontend
 ├── 1.1 Foundation & Stitch Design System
 │    ├── 1.1.1 Color tokens, glassmorphic card utilities, typography
 │    ├── 1.1.2 Reusable SVG iconography (Graveyard, Radar, Timeline, Citations)
 │    └── 1.1.3 CSS micro-animation keyframes (shimmer, pulse, gauge rotation)
 │
 ├── 1.2 Global Navigation & Context Layer
 │    ├── 1.2.1 Unified Glassmorphic Header
 │    ├── 1.2.2 Multi-Repo Switcher with local state persistence
 │    ├── 1.2.3 Real-time Supabase health ping indicator (polling / status)
 │    └── 1.2.4 Global route tabs (Chat, Blame, Timeline, Radar)
 │
 ├── 1.3 Decision Chat & "The Graveyard" Module
 │    ├── 1.3.1 Mode Tab Switcher (Ask Why vs. ⚰️ Graveyard)
 │    ├── 1.3.2 Query input with auto-growing textarea & keyboard triggers
 │    ├── 1.3.3 Dynamic example query chip library (React, FastAPI, Redux presets)
 │    ├── 1.3.4 Shimmering multi-state message loader
 │    ├── 1.3.5 Markdown link & code block parser
 │    ├── 1.3.6 Confidence Matrix Progress Bar (Confirmed / Inferred / Unknown)
 │    └── 1.3.7 Expandable Citation Proof Cards with GitHub avatar integration
 │
 ├── 1.4 Blame-to-Why Semantic Code Inspector
 │    ├── 1.4.1 Dual-pane split view layout (Code Editor + Archaeology Drawer)
 │    ├── 1.4.2 Monospace code editor area with line numbers & paste handler
 │    ├── 1.4.3 File path metadata tag input
 │    ├── 1.4.4 Async synthesis result renderer with citation binding
 │    └── 1.4.5 Instant ADR export integration
 │
 ├── 1.5 Temporal Decision Lineage Visualizer
 │    ├── 1.5.1 Topic / Concept query input with instant suggestions
 │    ├── 1.5.2 Chronological grouping engine (group by year / milestone)
 │    ├── 1.5.3 Interactive vertical timeline track with node connectors
 │    └── 1.5.4 Collapsible decision event cards with source jump links
 │
 ├── 1.6 Architectural Drift Radar
 │    ├── 1.6.1 Architectural principle input with predefined rule chips
 │    ├── 1.6.2 Sample depth slider / counter (5–100 decisions)
 │    ├── 1.6.3 Animated SVG Circular Drift Percentage Gauge
 │    ├── 1.6.4 High/Medium/Low violation classification badges
 │    └── 1.6.5 Clean vs. Violations counter cards
 │
 ├── 1.7 Reverse ADR Manager & Exporter
 │    ├── 1.7.1 MADR (Markdown Architectural Decision Record) formatter
 │    ├── 1.7.2 Dynamic blob builder and download trigger
 │    └── 1.7.3 Copy-to-clipboard markdown modal/toast feedback
 │
 └── 1.8 Polish, Verification & Demo Rehearsal
      ├── 1.8.1 Responsive layout testing across Desktop, Laptop, and Mobile
      ├── 1.8.2 Fast offline cache fallback for zero-latency judge demos
      └── 1.8.3 Pre-configured 3-minute judge walkthrough flow
```

---

## 2. Work Package Schedule & Milestones

| Stage | Focus Area | Deliverables | Status |
|:---|:---|:---|:---:|
| **Stage 1** | **Design System & Foundation** | Glassmorphism styles, dark obsidian palette, CSS variables, typography | ✅ Complete |
| **Stage 2** | **Chat & Graveyard Core** | Mode switching, rich proof cards, confidence matrix bar | ✅ Complete |
| **Stage 3** | **Blame-to-Why Inspector** | Code submission UI, semantic blame result panel, ADR download | ✅ Complete |
| **Stage 4** | **Temporal Timeline** | Vertical chronological stepper, year markers, event grouping | ✅ Complete |
| **Stage 5** | **Drift Radar** | Invariant rule input, circular gauge animation, violation cards | ✅ Complete |
| **Stage 6** | **Global Navigation & Switcher** | Multi-repo dropdown, unified nav header, live health indicator | ✅ Complete |
| **Stage 7** | **Final Polish & Demo Prep** | Responsive adjustments, quick sample presets, demo script rehearsal | ✅ Ready |

---

## 3. Component Architecture & File Mapping

```
ui/
 ├── index.html        ──> Main Chat & "The Graveyard" Hub
 ├── blame.html        ──> Blame-to-Why Semantic Code Inspector
 ├── timeline.html     ──> Temporal Decision Lineage Visualizer
 ├── radar.html        ──> Architectural Drift Radar
 ├── app.js            ──> Core Chat, Graveyard & ADR Export Controller
 └── style.css         ──> Unified Stitch Design System & Glassmorphism Tokens
```
