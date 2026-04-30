---
id: ADR-005
date: 2026-04-30
status: accepted
type: technical
epic: EPIC-001
---

# Design-Twice Convergence Detection: Textual Set Equality, Not LLM Synthesis

## Context

FEAT-025 spawns 3 parallel architects to produce design alternatives. When the alternatives are essentially the same (e.g., on a mechanical feature where there's only one good shape), forcing the founder to "pick" between identical designs is theatre. A convergence-detection mechanism is needed.

A choice was needed: determine convergence by textual comparison of the architects' outputs, or by spawning a fourth "synthesis" or "judge" agent that decides whether the designs differ meaningfully.

## Decision

Convergence is determined by textual set equality on three structural fingerprints:

1. **Created-files set** — set equality on file paths the design proposes to create.
2. **Modified-files set** — set equality on file paths the design proposes to modify.
3. **Top-level module structure** — set equality on the top-level entries from each architect's "Where things live" tree.

If all three match across the three designs, declare convergence and proceed silently with Archetype A as the consensus. Otherwise, declare divergence and present the comparison table.

No LLM judgment, no scoring rubric, no synthesis agent. The mechanism is implemented inline in `commands/vt-plan.md` Phase 1.5 Step 3.

## Alternatives Considered

- **Spawn a 4th `software-architect` agent as judge/synthesizer** — rejected. Adds another `opus`-model agent call to every `--deep` run, doubles the latency cost of Phase 1.5, and introduces a new failure mode (what if the judge itself misjudges?). The convergence question is mechanical — same files in, same structure out — and doesn't need LLM nuance.
- **Cosine similarity / embedding-based comparison** — rejected as YAGNI. Adds a new dependency (an embedding model or library), introduces a similarity threshold to tune, and replaces a deterministic check with a probabilistic one. Set equality is sharp and falsifiable.
- **Don't detect convergence; always present the table** — rejected because mechanical features (e.g., "add a CRUD endpoint following the existing pattern") would produce 3 nearly-identical designs and force the founder into a meaningless choice every run. The friction would erode trust in the phase.
- **Heuristic divergence-confidence score (e.g., percentage of structural overlap)** — rejected because there's no obvious threshold and it invites bikeshedding ("is 70% similar 'converged' or 'diverged'?"). Set equality is binary and therefore stable.

## Consequences

- Convergence detection is cheap (text comparison) and runs on every `--deep` invocation without extra cost.
- The mechanism is brittle in a useful way: any small structural difference triggers divergence and presents the table. False negatives (forcing a prompt when designs are nearly the same) are tolerable; false positives (skipping a prompt when designs genuinely differ) are dangerous because the founder loses the opportunity to choose.
- If dogfooding reveals the mechanism is too strict (every run prompts a choice on near-identical designs) or too loose (rarely prompts), the rule can be refined — but tuning changes here are an explicit ADR-worthy event because they shape the founder's experience.
- The set-equality rule is documented inline in `commands/vt-plan.md` (Phase 1.5 Step 3) where it's exercised. The rule lives in one place; future maintainers don't need to grep across multiple files.
- This decision establishes a precedent: prefer deterministic textual heuristics over LLM judgment for orchestration-layer decisions in the plugin. The plugin uses LLM agents heavily for *content* generation (designs, plans, reviews) but keeps *control flow* decisions (when to skip, when to prompt) deterministic.
