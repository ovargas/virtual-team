---
id: FEAT-025
date: 2026-04-30
status: draft
type: feature
triage: full
epic: EPIC-001
hub_decisions: [ADR-001, ADR-002, ADR-003]
research_level: light
yagni_verdict: slimmed
tags: [vt-plan, agents, architecture, design-alternatives]
---

# Design It Twice via Parallel Sub-Agents

> **Value:** Force planning sessions to explore at least three architecturally distinct alternatives before committing — preventing the AI's habit of anchoring on the first plausible design and giving the founder a real trade-off to evaluate.

## Problem

Planning sessions anchor on the first design that seems plausible. AI agents in particular generate one solution and commit to it — Phase 1 of `vt-plan` produces a single recommended approach, Phase 2 turns it into the plan, and any unconsidered alternatives are lost. The founder has no structured opportunity to compare designs framed in precise architectural terms.

**Trigger:** EPIC-001 (Skill Quality Deepening) flagged this as P3 finding from the comparative review against mattpocock/skills. The plugin has the agent dispatch infrastructure (Phase 0 `software-architect`, Phase 1 `codebase-analyzer` + `docs-locator`) but does not exercise it for design exploration. With FEAT-024 (architecture vocabulary) shipped, alternatives can now be framed precisely (Depth, Seam, Leverage, Locality) instead of vaguely.

**Current workaround:** The founder can manually re-prompt or run `/vt-plan` multiple times with different framing — but this is ad hoc, breaks pipeline flow, and rarely happens. The default behavior produces one design, and the founder reviews the resulting plan rather than the underlying design choice.

## YAGNI Assessment

**Verdict:** SLIMMED DOWN

The core is epic-validated (PO recommendation: yes-with-conditions). Scope was trimmed during intake to:
- Fixed at 3 alternatives (not configurable)
- Hard-coded constraint archetypes (no plugin system)
- Tied to `--deep` flag (no separate `--design-twice` flag)
- Simple comparison table (no diff renderer or scoring rubric)
- Convergence detection to skip ceremony when archetypes produce essentially the same design

What was cut: configurable alternative count, configurable constraint archetypes, side-by-side diff renderer, automated scoring, integration with `vt-feature` (plan-level only).

## Solution

### What we're building

1. **Design Alternatives Phase in `vt-plan`** — a new phase that runs between Phase 1 (Codebase Analysis) and Phase 2 (Write the Plan), activated only when `--deep` is passed.

2. **Parallel architect dispatch** — spawn 3 `software-architect` agents simultaneously, each given a different constraint archetype:
   - **Archetype A: Minimize indirection** — favor Locality, avoid Pass-throughs, keep related changes co-located
   - **Archetype B: Maximize seams** — introduce Adapters at boundaries that may need swapping later
   - **Archetype C: Minimize new surface area** — extend existing modules, keep modules Deep, avoid new abstractions

3. **Comparison table presentation** — synthesize the 3 returned designs into a compact table with trade-offs framed in architecture-vocabulary terms; founder picks one before plan writing proceeds.

4. **Convergence detection** — when alternatives are essentially the same, skip the choice prompt and report "alternatives explored — no meaningful divergence." Planning proceeds with the single design.

5. **ADR pre-fill on divergence** — when alternatives diverge meaningfully and the founder picks one, the existing Phase 3 ADR Capture step pre-fills "Alternatives Considered" with the rejected design proposals. The "real trade-off" gate is automatically met when divergence occurred.

### How it works

The founder runs `/vt-plan --deep FEAT-NNN`. The command proceeds through Phase 0 (architectural gate) and Phase 1 (codebase analysis) as today. Then a new step kicks in:

1. Orchestrator builds 3 prompts using the same feature spec + codebase analysis findings, but with different constraint instructions.
2. Orchestrator dispatches 3 `software-architect` agents in parallel. Each returns a structured architectural recommendation (using the agent's existing output format).
3. Orchestrator computes a divergence signal — comparing module structure, file lists, and key decisions across the 3 designs.
4. **If converged:** print a brief note ("alternatives explored: A, B, C all converge on [shared structure]") and proceed to Phase 2 with the consensus design.
5. **If diverged:** present a comparison table with one row per design (constraint archetype, module structure summary, key trade-offs in vocabulary terms). Wait for founder to pick A, B, or C.
6. The chosen design becomes the input to Phase 2 plan writing.
7. In Phase 3 ADR Capture, if divergence occurred, the orchestrator already has structured alternative content — it pre-fills the ADR's "Alternatives Considered" section with one line per rejected design.

### Visual concept

```
$ /vt-plan --deep FEAT-XXX
✅ Phase 0: Architectural gate passed
✅ Phase 1: Codebase analysis complete

🔀 Phase 1.5: Design Alternatives (--deep mode)
   Dispatching 3 architects in parallel...
   [A: minimize indirection] [B: maximize seams] [C: minimize surface area]
   ✅ All 3 returned

   Divergence: meaningful (modules differ; data flow differs)

   | # | Constraint | Structure                               | Trade-off                              |
   |---|-----------|------------------------------------------|----------------------------------------|
   | A | Indirection ↓ | Single module: [path] (Deep, high Locality) | Hard to swap later (no Seam yet)      |
   | B | Seams ↑   | Module + Adapter at [boundary]           | Extra Adapter cost; gains real Seam   |
   | C | Surface ↓ | Extend [existing module]                 | High Leverage on existing code        |

   Pick design (A/B/C):
```

## Boundaries

### Explicitly NOT building
- Configurable alternative count — fixed at 3
- Plugin system for constraint archetypes — hard-coded set of 3
- Standalone `--design-twice` flag — tied to `--deep`
- Side-by-side code/diff renderer — table is enough
- Automated scoring or weighted ranking — founder picks
- Integration with `vt-feature` for spec-level design alternatives — plan-level only

### Rabbit holes to avoid
- **Forcing artificial divergence** — if 3 archetypes produce similar designs, that's a real signal (the feature is mechanical). Don't bias prompts to manufacture differences.
- **Constraint archetype bikeshedding** — the 3 archetypes are good defaults; resist expanding the set during implementation. Capture as open question for a follow-up if founders want different sets.
- **Synthesis agent** — do not spawn a 4th agent to "merge" the chosen design into the plan. The orchestrator integrates the chosen design directly into Phase 2.
- **Re-running on every `vt-plan`** — convergence detection must be cheap (textual comparison of structure summaries), not another agent dispatch.

## Definition of Done

**The feature is complete when:**

1. Running `/virtual-team:vt-plan --deep FEAT-NNN` produces 3 alternative designs framed in architecture-vocabulary terms before the plan is written.
2. The 3 alternatives are presented in a comparison table; the founder picks one before plan writing proceeds.
3. When alternatives converge (essentially the same), the convergence is detected and reported, and planning proceeds without forcing a choice.
4. When alternatives diverge meaningfully and the founder picks one, the existing ADR Capture step in Phase 3 pre-fills "Alternatives Considered" from the rejected proposals.

**Verification:**

Automated:
- [ ] `npm test` passes (frontmatter, file-refs, command-refs validation for the modified `commands/vt-plan.md`)
- [ ] `commands/vt-plan.md` stays under 700 lines (current 563 + ~80-100 lines added)

Manual:
- [ ] Run `/virtual-team:vt-plan --deep FEAT-XXX` on a non-trivial feature; verify 3 alternatives are generated and presented with vocabulary terms (Depth, Seam, Leverage, Locality, Adapter, Pass-through)
- [ ] Run `/virtual-team:vt-plan --deep FEAT-XXX` on a mechanical feature (e.g., a new CRUD endpoint following an existing pattern); verify convergence is detected and the choice prompt is skipped
- [ ] Run `/virtual-team:vt-plan FEAT-XXX` WITHOUT `--deep`; verify the design-alternatives phase is NOT triggered (preserves current behavior)
- [ ] Verify ADR Capture step in Phase 3 picks up alternatives from this phase when divergence occurred — check the resulting ADR's "Alternatives Considered" section is substantive

## Success Metrics

**Leading (immediate):**
- Plans produced via `--deep` reference architecture-vocabulary terms in their "Key decisions" section ≥80% of the time.
- ADRs created during `--deep` planning sessions populate "Alternatives Considered" with substantive content (not "none considered" or empty).

**Lagging (2-4 weeks of dogfooding):**
- Founder reports at least one case where the chosen design was NOT the first agent's proposal — evidence the phase changed the outcome.
- No reports of `--deep` planning becoming "unusably slow" due to the added phase.

**Failure signal:**
- Founder consistently picks design A (the first presented) without engaging with B and C → the phase is theatre. Reconsider whether constraint archetypes produce meaningful divergence.
- Convergence detection fires on >80% of runs → archetypes are not differentiated enough; revisit archetype set.

## Implementation Hints

### Existing patterns to follow
- **Phase 0 single-agent dispatch:** `commands/vt-plan.md:97-122` — `software-architect` HALT/pass protocol.
- **Phase 1 parallel dispatch (2 agents, "wait for return"):** `commands/vt-plan.md:557-563` — pattern for waiting on multiple parallel agents before proceeding.
- **Wave-based parallel cap of 3:** `skills/subagent-driven-development/SKILL.md:111` — "Maximum 3 simultaneous implementer subagents." Aligns with our 3-alternative cap.
- **ADR Capture three-gate logic:** `commands/vt-plan.md:412-443` — extension point for pre-filling Alternatives Considered.

### Integration points
- **`commands/vt-plan.md`** — insert a new "Phase 1.5: Design Alternatives" section between current Phase 1 (line ~218) and Phase 2 (line ~222). Add `--deep` branching that triggers it.
- **`agents/software-architect.md`** — no file changes. The agent is reused with new orchestrator prompts that include constraint archetype instructions.
- **`skills/architecture-vocabulary/SKILL.md`** — no file changes. The orchestrator instructs the architects to frame trade-offs using these terms; the skill is already loaded by `vt-tech-review` and conceptually by anyone evaluating architecture.
- **`skills/adr-convention/SKILL.md`** — no file changes. The Phase 3 ADR Capture extension reads the alternatives from session state, not from the skill.

### API Contracts

No API contracts — this feature is a behavioral change to `commands/vt-plan.md`. The only "interface" is the prompt template passed to the `software-architect` agent, defined inline in the modified command. No HTTP endpoints, no events, no inter-service messages.

### Data model considerations

None — no persisted state. Alternative designs are session-scoped: generated, presented, chosen, then either discarded (if not picked) or carried forward into Phase 2 plan + Phase 3 ADR.

### Technical risks
- **Risk: Architects converge by default** because they share the same feature spec and codebase analysis as input. **Mitigation:** Constraint archetypes must be strong enough to drive divergence. The 3 chosen archetypes (indirection ↓ / seams ↑ / surface ↓) are deliberately oppositional.
- **Risk: Three parallel `opus`-model agent calls add cost and latency.** **Mitigation:** Already gated behind `--deep` (founder explicitly opts into agent overhead). Document the cost in vt-plan.md's `--deep` description.
- **Risk: Comparison table cannot fit complex designs in a readable format.** **Mitigation:** Each row stays one-line-per-cell; if the architect's design summary is too long, the orchestrator truncates with "see full proposal in [scratch reference]."

## Research Summary

Research conducted directly (no `--deep` agents on `/vt-feature`). Findings summarized in Phase 3 of the intake:
- Existing dispatch patterns in `vt-plan` Phases 0 and 1 are sufficient — no new agent file needed.
- `software-architect` agent (`agents/software-architect.md`) already produces structured architectural recommendations with trade-offs in its Recommendation Mode output (lines 108-173).
- Architecture vocabulary skill is shipped (FEAT-024) — terms are ready to use in orchestrator prompts.
- ADR Capture step already exists in vt-plan Phase 3 (lines 412-443) — extension point for pre-fill is the three-gate check + ADR creation.
- vt-plan is at 563 lines; ADR-001 sets a 500-line review threshold for commands. Implementation must be terse to stay near the threshold.

## Stories

### Group 1: Core dispatch and presentation (sequential, single branch)

1. **S-032: Add Phase 1.5 Design Alternatives to vt-plan with parallel architect dispatch** — `--deep` triggers 3 parallel `software-architect` agents with hard-coded constraint archetypes (indirection ↓, seams ↑, surface ↓). Orchestrator presents results in a comparison table; founder picks one. Plan writing proceeds with the chosen design.
   - Layers: command file (`commands/vt-plan.md`)
   - Acceptance: `/vt-plan --deep FEAT-XXX` shows 3 designs in a table using vocabulary terms; founder choice flows into Phase 2.
   - Demo: Run on a current EPIC-001 feature (e.g., FEAT-OUT-OF-SCOPE if specced, or any non-trivial feature), see 3 alternatives, pick one, plan written.

2. **S-033: Add convergence detection and graceful skip** — When the 3 returned designs are essentially the same (textual comparison of module structure / file lists), skip the choice prompt; print a brief convergence note and proceed.
   - Layers: command file (`commands/vt-plan.md`)
   - Acceptance: Mechanical features (e.g., new CRUD endpoint) trigger convergence detection; founder is not prompted to choose.
   - Demo: Run `/vt-plan --deep` on a trivially-patterned feature, see "alternatives converged" message, no choice prompted.

3. **S-034: Pre-fill ADR Alternatives Considered from rejected designs** — When divergence occurred and ADR Capture three-gate check passes, populate the new ADR's "Alternatives Considered" section with one-line summaries of the rejected design proposals.
   - Layers: command file (`commands/vt-plan.md`) — modify the ADR Capture step in Phase 3
   - Acceptance: Resulting ADR has substantive "Alternatives Considered" content drawn from rejected designs A/B/C.
   - Demo: Run `/vt-plan --deep`, pick design B, accept ADR creation, verify the ADR's Alternatives Considered lists A and C with their architectural framings.

**Milestones:**
- After S-032: design-twice phase is functional end-to-end. The feature delivers 80% of its value.
- After S-033: ceremony-skip when archetypes converge. Friction reduced for mechanical features.
- After S-034: institutional memory of design choices is preserved in ADRs.

**Execution strategy:**
- Group 1 → `/virtual-team:vt-implement FEAT-025` implements all 3 stories sequentially on a single branch, one PR.

## References

- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001)
- Hub decisions: `docs/decisions/2026-04-29-skill-size-budget.md` (ADR-001), `docs/decisions/2026-04-29-domain-glossary-convention.md` (ADR-002), `docs/decisions/2026-04-29-token-mode-scope.md` (ADR-003)
- Source review: `docs/reviews/2026-04-29-comparative-mattpocock-skills.md`
- Codebase: `commands/vt-plan.md` (lines 97-122, 412-443, 557-563), `agents/software-architect.md`, `skills/architecture-vocabulary/SKILL.md`, `skills/adr-convention/SKILL.md`, `skills/subagent-driven-development/SKILL.md:111`
- Related shipped features: FEAT-022 (ADR Convention), FEAT-024 (Architecture Vocabulary)

## Origin

Feature spec created on 2026-04-30 through structured intake.
Original description: "design it twice via parallel sub-agents"
Driven by EPIC-001 — Skill Quality Deepening, Wave 4 (P3 — Precision and Exploration).
