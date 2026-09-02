# Continuum — Executive Pitch & Problem Architecture

> *"Code tells you HOW. Git tells you WHEN. Continuum tells you WHY."*

---

## 💥 The Problem: The $500B Tribal Knowledge Deficit

Every year, engineering organizations lose billions in wasted developer velocity due to **Tribal Knowledge Amnesia**:
1. **The Ghost Chest:** Critical architectural decisions live exclusively in PR comment threads, Slack channels, and the minds of senior engineers who eventually leave.
2. **Repeating Past Disasters:** Developers unknowingly propose architectures that were debated, benchmarked, and explicitly rejected 3 years earlier.
3. **Accidental Invariant Violations:** Refactoring teams silently break unwritten invariants that exist nowhere in the code or comments.
4. **The Onboarding Tax:** New engineers spend weeks asking *"Why is this written this way?"* instead of shipping features.

---

## 🎯 The Solution: Continuum

Continuum is the **Decision Archaeology Engine** for modern engineering organizations. It ingests historical GitHub PRs, issues, RFCs, and code review debates, extracts structured decision units, and provides instant, citation-grounded architectural memory.

```
       WITHOUT CONTINUUM                           WITH CONTINUUM
  ┌─────────────────────────┐               ┌─────────────────────────┐
  │ "Why is this written    │               │ Developer queries       │
  │ like this?"             │               │ Continuum / IDE MCP     │
  │                         │               │                         │
  │ 3 days of Slack digging │               │ Instant 4-Strata        │
  │ Guesswork & Hallucination│      VS       │ Forensic Dossier        │
  │ Repeating old mistakes  │               │ 100% Verifiable URLs    │
  │ Accidental Invariant    │               │ Graveyard Rejection Log │
  │ Breaches                │               │ Déjà Vu CI Warning      │
  └─────────────────────────┘               └─────────────────────────┘
```

---

## 🏆 System Boundary & Core Personas

### Target Personas
1. **Staff / Principal Architects:** Verifying that modern refactors do not breach historical architectural invariants.
2. **Senior Developers:** Reviewing pull requests and checking if submitted patterns duplicate rejected experiments.
3. **New Engineers & Contributors:** Understanding why complex modules are structured the way they are in <30 seconds.

---

## 🎤 3-Minute Hackathon Pitch Script

- **[0:00 - 0:30] The Hook:** "Have you ever looked at a weird piece of code and asked: *'Who wrote this and WHY?'* You run `git blame`, see a commit from 2021 with message `fix: update handler`, and you're stuck. Git tells you *what* changed, but the *why* is lost."
- **[0:30 - 1:15] The Demo:** "Watch this. We ask Continuum: *'Why did React eliminate SyntheticEvent pooling in version 17?'* In under 1.2 seconds, Continuum produces a 4-strata archaeological dossier. It unearths the exact discussion in PR #18216, quotes maintainers verbatim, links directly to the GitHub source, and reveals the 'Graveyard' — alternatives that were considered and why they failed."
- **[1:15 - 2:00] Under the Hood:** "Under the hood, Continuum runs a hybrid RRF search combining dense embeddings in Supabase pgvector with in-memory BM25 keyword matching for technical jargon. It extracts atomic Decision Units with strict confidence scores (`confirmed`, `inferred`, `unknown`) — guaranteeing zero hallucination."
- **[2:00 - 2:30] Universal Integration:** "It's not just a web dashboard. Continuum is embedded directly into developer workflows via a native Model Context Protocol (MCP) server for Cursor and Claude Code, plus a Déjà Vu CI bot that warns you on PRs if you're repeating a rejected anti-pattern."
- **[2:30 - 3:00] The Vision:** "Continuum turns tribal knowledge into permanent organizational intelligence. Thank you!"
