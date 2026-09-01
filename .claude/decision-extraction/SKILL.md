---
name: decision-extraction
description: Use this skill when processing a single GitHub artifact (a closed PR thread, an issue thread, or a commit message) into a structured decision record for Continuum's ingestion pipeline. Extracts what was decided, what alternatives existed, why alternatives were rejected, and what evidence supports each claim - tagging every claim as confirmed, inferred, or unknown. Trigger this any time raw GitHub content needs to become a decision-unit chunk before embedding.
---

# Decision Extraction

## Purpose

Turn one raw GitHub artifact (a PR thread, issue thread, or commit) into a
structured **decision record** — the atomic unit Continuum embeds, retrieves,
and cites. This is the ingestion-time counterpart to the evidence rules in
`CLAUDE.md`. Do not skip straight to embedding raw text; extraction happens
first.

## Chunk boundary

One decision record per **decision unit** — a full PR conversation thread,
a full issue thread, or a single commit message. Never chunk by diff line
or by arbitrary character count. If a single thread clearly contains more
than one unrelated decision, split it into separate records; if multiple
threads clearly discuss the same decision, note the relationship (see
Relationship fields below) rather than merging them into one record.

## Output schema

Produce one record per decision unit with these fields:

```
decision_id: <stable id, e.g. repo-slug + PR/issue number>
title: <short, one-line description of the decision>
status: [confirmed | inferred | unknown]   # overall confidence in "a decision occurred here"
decision:
  summary: <what was decided, in plain language>
  status: [confirmed | inferred | unknown]
alternatives_considered:
  - option: <alternative approach>
    status: [confirmed | inferred | unknown]
    rejected: <true | false>
    rejection_reason: <why it was rejected, or null if not rejected>
    rejection_reason_status: [confirmed | inferred | unknown]
evidence:
  - quote_or_paraphrase: <short paraphrase, not verbatim quoting beyond a few words>
    source: <PR/issue/commit URL or ID>
    status: [confirmed | inferred | unknown]
relationships:
  supersedes: [<decision_id>, ...]     # earlier decisions this one replaces
  superseded_by: [<decision_id>, ...]  # later decisions that replaced this one, if known
  related_to: [<decision_id>, ...]
source_artifacts:
  - type: [pr | issue | commit]
    id: <number or SHA>
    url: <link>
```

## Confidence rules (mandatory)

- **confirmed** — the artifact explicitly states this (a person wrote it
  in words, not code shape alone).
- **inferred** — reasonably deduced from context (e.g., a rejected PR was
  closed with "won't fix" and a linked issue explains why, but the PR
  itself doesn't restate the reason) — mark it `inferred` and say what it
  was inferred from.
- **unknown** — do not fabricate a plausible-sounding reason. If the
  artifact shows *that* something was decided but not *why*, leave the
  reason field `unknown` rather than guessing from typical engineering
  practice.

Never collapse `inferred` or `unknown` into `confirmed` to make an answer
look more complete. A sparse but honest record is correct behavior, not a
failure — this is what lets the synthesis layer produce the "insufficient
evidence" fallback correctly downstream.

## What NOT to do

- Do not summarize the whole thread narratively — extract into the schema.
- Do not invent alternatives that were never mentioned, even if they seem
  like the "obvious" options a team would have considered.
- Do not quote more than a short phrase verbatim from any source comment —
  paraphrase in `quote_or_paraphrase`.
- Do not merge two different repos' history into one decision record.

## Worked example (abbreviated)

Input: a closed PR titled "Move rate limiting to gateway", with review
comments: "per-service rate limiting caused inconsistent limits across
replicas — moving it to the gateway centralizes this," and a reviewer
comment "did we consider a shared Redis counter instead? — yes, tried in
PR #201, added too much latency for our traffic pattern."

Output (abbreviated):
```
title: Centralize rate limiting at the API gateway
decision:
  summary: Rate limiting moved from per-service to the API gateway
  status: confirmed
alternatives_considered:
  - option: Per-service rate limiting (previous approach)
    status: confirmed
    rejected: true
    rejection_reason: Inconsistent limits across replicas
    rejection_reason_status: confirmed
  - option: Shared Redis counter
    status: confirmed
    rejected: true
    rejection_reason: Added too much latency for the traffic pattern
    rejection_reason_status: confirmed
relationships:
  related_to: [pr-201]
```
