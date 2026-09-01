# Continuum Development Instructions

## Product Definition

Read `PRD.md`, `SRS.md`, and `WBS.md` before making architectural decisions.
If any implementation choice conflicts with what those documents say, stop
and flag the conflict instead of silently picking one.

Continuum is a tribal-knowledge reconstruction system focused on recovering
the WHY behind engineering decisions from GitHub artifacts (commits, pull
requests, issues).

The core problem is decision archaeology:
- Why was a decision made?
- What alternatives were considered?
- Which alternatives were rejected?
- Why were they rejected?
- What evidence supports the conclusion?
- Has the decision changed over time?

Continuum answers these retrospectively, from history that already exists.
It does not generate code, review code quality, or act as a general
codebase-Q&A bot. If a task looks like "explain what this function does,"
that is out of scope — Continuum only answers decision/rationale questions.

## Prior Art

Two existing open-source projects are directly relevant. Study both before
building the ingestion or synthesis pipeline. Neither is the base codebase.

### Keep the Why
https://github.com/oliver-zehentleitner/keep-the-why
(skill lives at `skills/keep-the-why/`, not the repo root)

Must NOT be treated as the base codebase or architecture to fork.
Use it to understand:
- rationale/knowledge representation
- rejected alternatives
- evidence and confidence
- superseded decisions
- retrospective knowledge recovery (see its "retrospective recovery" mode
  specifically — closest existing analogue to Continuum's core loop)
- knowledge maintenance

Do NOT copy its repository architecture, SKILL.md installation model,
Markdown `context/` storage model, or agent-skill installation mechanism
unless there is a specific technical reason to do so. Keep the Why is
forward-and-retrospective knowledge *capture* as a byproduct of ongoing
agent work; Continuum is a dedicated retrieval system over history that
already exists. Different job, related domain.

### git-adr
https://github.com/kaldiflow/git-adr

Must NOT be treated as the base codebase or architecture to fork.
Use it to understand:
- a working Context / Decision / Consequences prompt structure for turning
  a diff into rationale (directly adaptable into Continuum's synthesis step)
- a minimal, provable ADR output schema
- realistic cost/latency for a single Claude call per artifact

Do NOT copy its post-commit-hook trigger mechanism — that fires on live
commits going forward, which is the opposite of Continuum's job (mining
*existing* closed PRs/issues at ingestion time, not new commits at commit
time).

## Continuum's Differentiation

Continuum is primarily a decision-reconstruction system, not a chatbot
wrapper and not generic RAG.

Its core pipeline should be:

```
GitHub artifacts
→ artifact normalization
→ decision extraction
→ decision/alternative detection
→ evidence extraction
→ relationship resolution
→ temporal decision modeling
→ hybrid retrieval
→ evidence-grounded synthesis
→ cited answer
```

The system should explicitly model:
- selected alternatives
- rejected alternatives
- reasons for rejection
- evidence
- confidence
- source artifacts
- temporal/superseded decisions

## Evidence Rules

Never present an inferred rationale as confirmed fact.

Every reconstructed decision should distinguish:
- **confirmed** — directly stated in the source artifact
- **inferred** — reasonably deduced but not explicitly stated
- **unknown** — no supporting evidence found

If evidence is insufficient, explicitly say so rather than guessing. This
applies at both the extraction layer (ingestion) and the synthesis layer
(user-facing answers) — see the `decision-extraction` and
`evidence-grounded-synthesis` skills for the exact rules each layer follows.

## Important Architectural Principle

The vector database is NOT the product's knowledge model.

Embeddings are used to retrieve candidate evidence. The Decision
Reconstruction layer determines:
- what decision occurred
- what alternatives existed
- which alternatives were rejected
- why they were rejected
- which evidence supports each claim
- whether a later decision superseded it

Do not reduce Continuum to generic "RAG over GitHub." If an implementation
plan stops at "embed everything, retrieve top-k, ask the LLM to answer,"
that is missing the decision-reconstruction layer and needs to go back for
revision.

## Hackathon Scope (24 hours — see WBS.md for the hour-by-hour plan)

- Single repository, single tenant. No auth, no multi-repo support.
- No model fine-tuning — retrieval and prompting only.
- Ingestion sources: PR threads, issue threads, commit messages. Slack/
  Discord ingestion is a stretch goal only, not core scope.
- Prefer the simplest architecture that can demonstrate the core loop
  reliably, over a more complete architecture that risks not working live.

## Development Rule

Before implementing a major architectural component, inspect the PRD and
explain how the component supports decision reconstruction specifically
(not just "it's useful"). Prefer the simplest architecture that can
demonstrate the core loop reliably within the hackathon scope.

When in doubt between two implementations, choose the one that keeps the
demo's "insufficient evidence" fallback provably honest over the one that
produces a more impressive-looking but less trustworthy answer.
