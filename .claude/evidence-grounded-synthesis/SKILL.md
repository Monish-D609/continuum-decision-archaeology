---
name: evidence-grounded-synthesis
description: Use this skill when generating a user-facing answer to a why question in Continuum from retrieved decision records. Enforces citation-grounded responses, explicit confidence labeling, and an honest insufficient-evidence fallback instead of a fabricated or overconfident answer. Trigger this at the final synthesis step, after retrieval has returned candidate decision records and before returning a response to the user.
---

# Evidence-Grounded Synthesis

## Purpose

Turn retrieved decision records (produced by the `decision-extraction`
skill) into a final answer for the user. This is the last step before a
response leaves the system — it is the layer directly responsible for
Continuum never presenting a guess as a fact.

## Inputs

- The user's natural-language question.
- A set of candidate decision records returned by hybrid retrieval, each
  with its own per-field confidence (`confirmed` / `inferred` / `unknown`)
  and source links.

## Answer rules (mandatory)

1. **Every factual claim in the answer must trace to a specific retrieved
   record's field.** Do not add reasoning that isn't present in the
   retrieved records, even if it seems like a reasonable inference — that
   inference belongs in the extraction layer with an `inferred` tag, not
   invented fresh at answer time.
2. **Every claim must carry its citation** — the PR/issue/commit link from
   the source record, rendered so the user can click through and verify it
   themselves.
3. **Preserve confidence labels in the answer's tone**, not just the
   citation. A `confirmed` claim can be stated plainly ("X was chosen
   because Y"). An `inferred` claim must be flagged as such in the
   sentence itself ("it appears that X was chosen because Y, based on
   [source], though this isn't stated explicitly"). Never phrase an
   `inferred` claim as if it were `confirmed`.
4. **If retrieval returns nothing relevant, or only `unknown`-confidence
   records, say so directly** — e.g., "I don't have strong evidence for
   why this decision was made — the closest related discussion is
   [link], but it doesn't state a reason." Do not pad this with a
   plausible-sounding guess to seem more helpful.
5. **If multiple records conflict or one supersedes another**, surface
   that explicitly rather than picking one silently — e.g., "This was
   originally decided in [PR #x] for reason A, then changed in [PR #y]
   because B."

## What NOT to do

- Do not synthesize a "best guess" answer when evidence is thin — the
  honest gap is a feature of this system, not a failure state to hide.
- Do not merge two different decisions into one narrative if the records
  don't establish a relationship between them.
- Do not drop citations "for readability" — every claim needs one.
- Do not let a well-written, fluent-sounding paragraph substitute for
  actual evidence; fluency is not evidence.

## Response shape

A good answer has three parts:
1. Direct answer to the question (or an explicit statement that the
   evidence is insufficient).
2. Supporting detail, each claim citation-linked.
3. Any relevant caveats — conflicting records, superseded decisions,
   or `inferred`/`unknown` fields the user should know about.

## Worked example

**Question:** "Why is rate limiting handled at the gateway instead of
per-service?"

**Good answer:**
> Rate limiting was centralized at the API gateway because per-service
> limiting caused inconsistent limits across replicas ([PR #214]). A
> shared Redis counter was considered as an alternative but rejected for
> adding too much latency for this traffic pattern ([PR #201]).

**Bad answer (do not produce this):**
> Rate limiting is typically centralized at the gateway in microservice
> architectures for better consistency and easier management. This is
> likely why your team made this choice.

The bad answer is generic best-practice reasoning with no citation and no
connection to what the team's own history actually shows — exactly the
failure mode this skill exists to prevent.
