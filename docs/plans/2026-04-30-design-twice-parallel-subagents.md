---
date: 2026-04-30
feature: FEAT-025
spec: docs/features/2026-04-30-design-twice-parallel-subagents.md
status: approved
---

# Implementation Plan: Design It Twice via Parallel Sub-Agents

## Overview

Insert a new "Phase 1.5: Design Alternatives" into `commands/vt-plan.md` that runs only when `--deep` is active. The phase dispatches 3 `software-architect` agents in parallel with hard-coded constraint archetypes, presents results in a comparison table framed in architecture-vocabulary terms, and lets the founder pick. Add convergence detection to skip the prompt when archetypes produce essentially the same design. Extend the existing Phase 3 ADR Capture step to pre-fill "Alternatives Considered" from rejected designs.

The plan is sliced by capability (per the spec's incremental delivery strategy): each phase delivers one user-visible behavior change to `/vt-plan --deep`. The implementation is entirely localized to a single markdown command file — no new agent files, no new skill files, no new packages.

## Reference Implementation

The closest existing pattern is the existing `--deep` agent dispatch in vt-plan, implemented in:
- `commands/vt-plan.md:95-122` — Phase 0 single-agent dispatch with HALT/pass protocol (model for `--deep` branching)
- `commands/vt-plan.md:557-563` — Phase 1 parallel dispatch of 2 agents with "Wait for agents to return" (model for parallel-dispatch-and-wait pattern)
- `commands/vt-plan.md:412-443` — Phase 3 ADR Capture three-gate check + ADR creation (extension point for Slice 3)

This plan follows the same dispatch structure with adaptations for: (a) 3 parallel agents instead of 2, (b) different prompts per agent (constraint archetypes), (c) result synthesis into a comparison table, (d) optional convergence-skip path.

## Pre-conditions

Before starting implementation:
- [x] Feature spec is approved: `docs/features/2026-04-30-design-twice-parallel-subagents.md` (status: draft → will be marked refined when this plan is approved)
- [x] FEAT-022 (ADR Convention) shipped — ADR Capture step exists at `commands/vt-plan.md:412-443`
- [x] FEAT-024 (Architecture Vocabulary) shipped — `skills/architecture-vocabulary/SKILL.md` available with terms (Depth, Seam, Adapter, Leverage, Locality, Pass-through)
- [x] No `stack.md` required — this is a plugin repo with no stack dependencies for this feature

## Phase 1: Core Dispatch and Presentation (S-032)

### Overview

Make `/vt-plan --deep` produce 3 architecturally distinct design alternatives, present them in a comparison table using architecture-vocabulary terms, and accept the founder's choice as input to Phase 2 plan writing.

**After this phase:** Running `/vt-plan --deep FEAT-XXX` on any non-trivial feature shows 3 designs (Archetype A: minimize indirection; B: maximize seams; C: minimize new surface area), waits for founder choice, and proceeds to plan writing with the chosen design.

### Step 1.1: Update `--deep` flag description

**File:** `commands/vt-plan.md` (modify, line 24)
**Pattern:** Follow the existing flag description style for `--auto` at line 23.

**What to do:**

Edit the `--deep` flag description to mention that it now also activates the design alternatives phase. Replace the current description:

```
- `--deep` — full agent mode: spawn agents for Phase 0 (architectural gate) and Phase 1 (codebase analysis). Use for complex features that touch multiple modules, introduce new stack dependencies, or require deep codebase tracing. Without this flag, the plan command does all analysis directly (Glob, Grep, Read) — faster and cheaper.
```

With:

```
- `--deep` — full agent mode: spawn agents for Phase 0 (architectural gate), Phase 1 (codebase analysis), and Phase 1.5 (design alternatives — 3 parallel architects propose distinct designs, founder picks). Use for complex features that touch multiple modules, introduce new stack dependencies, or require deep codebase tracing. Without this flag, the plan command does all analysis directly — faster and cheaper.
```

### Step 1.2: Update checkpoint phase list

**File:** `commands/vt-plan.md` (modify, line 36)
**Pattern:** Follow the existing checkpoint phase enumeration style.

**What to do:**

Edit the checkpoint phase list to include Design Alternatives:

```
- After each phase completes (Arch Gate, Codebase Analysis, Write Plan, Review/Validate, Backlog Update), write/update the checkpoint file
```

Becomes:

```
- After each phase completes (Arch Gate, Codebase Analysis, Design Alternatives, Write Plan, Review/Validate, Backlog Update), write/update the checkpoint file
```

### Step 1.3: Insert Phase 1.5 section

**File:** `commands/vt-plan.md` (modify, insert at line 220-221 — between current end of Phase 1 and start of Phase 2)
**Pattern:** Section structure follows Phase 0 (`commands/vt-plan.md:93-122`); parallel dispatch wording follows the Agent Usage section's Phase 1 description (`commands/vt-plan.md:557-563`).

**What to do:**

Insert a new top-level subsection after line 220 (after "Wait for acknowledgment before proceeding. **If `--auto` was passed, skip this wait — proceed directly to Phase 2.**") and before line 222 ("### Phase 2: Write the Plan"):

```markdown
### Phase 1.5: Design Alternatives

**Skip this phase entirely if `--deep` was NOT passed.** When `--deep` is absent, proceed directly to Phase 2.

**When `--deep` is active**, before writing the plan, dispatch 3 parallel `software-architect` agents to produce architecturally distinct design proposals. The founder picks one, which becomes the input to Phase 2.

**Why this exists:** Planning sessions anchor on the first plausible design. Forcing exploration of distinct alternatives — framed in architecture-vocabulary terms — surfaces real trade-offs the founder can evaluate.

#### Step 1: Build constraint-archetype prompts

Use the same feature spec + Phase 1 codebase analysis findings as input to all 3 agents. Differentiate them only by constraint archetype:

- **Archetype A — Minimize indirection:** "Propose a design that maximizes Locality and avoids Pass-throughs. Co-locate related changes. Prefer flat structure over layered abstractions. Frame your trade-offs using terms from `skills/architecture-vocabulary/SKILL.md`."
- **Archetype B — Maximize seams:** "Propose a design that introduces Adapters at boundaries that may need swapping later. Optimize for testability and replaceability. Frame your trade-offs using terms from `skills/architecture-vocabulary/SKILL.md`."
- **Archetype C — Minimize new surface area:** "Propose a design that extends existing modules rather than introducing new ones. Keep modules Deep. Avoid new abstractions where current ones can be stretched. Frame your trade-offs using terms from `skills/architecture-vocabulary/SKILL.md`."

Every agent receives the same scene-setting context: feature spec path, Phase 1 codebase analysis summary, and the constraint instruction.

#### Step 2: Dispatch 3 architects in parallel

Spawn 3 `virtual-team:software-architect` agents simultaneously using a single message with 3 Agent tool calls. Each runs in Recommendation Mode (see `agents/software-architect.md:108-173`) and returns its standard structured output.

**Wait for all 3 agents to return before proceeding.**

If any agent returns a HALT (this should not normally happen since Phase 0 already passed, but treat defensively), stop and present the halt — do not silently continue with 2 designs.

#### Step 3: Detect divergence

Once all 3 designs are returned, compute a divergence signal by comparing their structural fingerprints:

- Module structure (folder/file tree from each architect's "Where things live")
- File lists (which files each design creates vs modifies)
- Key responsibilities (the per-component "What it owns" lines)

**Convergence rule:** If all 3 designs have the same set of created files AND the same module structure (set equality), declare convergence. Otherwise, declare divergence.

This is a textual comparison only — do not spawn a 4th agent to "synthesize" or "judge."

#### Step 4: Present results

**If converged**, print a brief note and proceed to Phase 2 with the consensus design:

```
🔀 Design Alternatives: explored A/B/C — all converge on the same structure.
   No meaningful divergence; proceeding with consensus design.
```

The consensus design is taken from Archetype A (the first returned). It becomes the input to Phase 2.

**If diverged**, present a comparison table and wait for founder selection:

```
🔀 Design Alternatives (--deep mode)

Divergence: meaningful (modules differ; data flow differs)

| # | Constraint        | Structure                                | Trade-off                              |
|---|-------------------|------------------------------------------|----------------------------------------|
| A | Indirection ↓     | [structure summary from architect A]     | [trade-offs in vocabulary terms]       |
| B | Seams ↑           | [structure summary from architect B]     | [trade-offs in vocabulary terms]       |
| C | Surface ↓         | [structure summary from architect C]     | [trade-offs in vocabulary terms]       |

Pick design (A/B/C):
```

The orchestrator extracts each row's "Structure" from the architect's "Where things live" tree (truncate to one line if needed), and "Trade-off" from the architect's "Trade-offs" section (one line: dominant pro and dominant con, framed in vocabulary terms).

**If `--auto` was passed:** skip the prompt; auto-select Archetype A and append to the plan a note: "Design alternatives explored under --auto: A selected by default. Alternatives B/C noted for review."

#### Step 5: Carry the chosen design forward

The chosen architect's full output becomes the architectural baseline for Phase 2 plan writing. The orchestrator should reference it explicitly when constructing the plan's "Reference Implementation" and "Phase N — Step N.N — File:" annotations.

If divergence occurred and a design was chosen, **retain the rejected designs in session state** for use in Phase 3 ADR Capture (see Step 1.5 of Phase 3 — added in Slice 3).

---
```

### Step 1.4: Update Agent Usage section

**File:** `commands/vt-plan.md` (modify, append a new entry after line 563)
**Pattern:** Follow the existing per-phase entries at lines 550-563.

**What to do:**

After line 563 ("Wait for agents to return before writing the plan."), append a new entry for Phase 1.5:

```markdown

**Phase 1.5 (Design Alternatives) — only when `--deep` is passed:**
- Spawn 3 **virtual-team:software-architect** agents in parallel, each with a different constraint archetype prompt (see Phase 1.5 above for archetype A/B/C details).
- All 3 run in Recommendation Mode (`agents/software-architect.md:108-173`) — same input (feature spec + Phase 1 analysis), different constraint instruction.
- Cap is fixed at 3 (matches `skills/subagent-driven-development/SKILL.md:111` parallel dispatch ceiling).
- Wait for all 3 to return before computing divergence.
```

### Phase 1 Verification

**Automated:**
- [ ] `npm test` passes — frontmatter, file-refs, command-refs validation for `commands/vt-plan.md` is clean
- [ ] `wc -l commands/vt-plan.md` reports under 700 lines (current 563 + ~80-100 lines added; budget per spec DoD)
- [ ] Grep `commands/vt-plan.md` for "Phase 1.5" — should match the new section heading
- [ ] Grep `commands/vt-plan.md` for "Archetype A", "Archetype B", "Archetype C" — should match the constraint definitions

**Manual:**
- [ ] Read the Phase 1.5 section back end-to-end — confirm it makes sense without reading other parts of the file
- [ ] Spot-check that vocabulary terms (Locality, Adapter, Pass-through, Depth, Seam, Leverage) appear in the archetype descriptions
- [ ] Spot-check that the section starts with a "skip if not --deep" guard — no behavior change for non-`--deep` runs

**Stop here.** This phase delivers the core feature — 3 parallel architects, comparison table, founder choice. The convergence-skip and ADR-pre-fill are layered on top in Phases 2 and 3 below.

---

## Phase 2: Convergence Detection and Graceful Skip (S-033)

### Overview

When the 3 returned designs are essentially the same (same module structure, same file lists), skip the choice prompt and proceed silently with the consensus design. Avoids ceremony for mechanical features where one design is genuinely the only good shape.

**After this phase:** Running `/vt-plan --deep FEAT-XXX` on a mechanical feature (e.g., "add a new CRUD endpoint following the existing pattern") detects convergence and proceeds without prompting; running on a feature with real architectural choice still presents the comparison table.

**Note:** The convergence-detection logic is *described* in Phase 1 Step 3 above. This phase is about *exercising and refining* that logic — making sure the textual comparison rule (set equality of module structures + file lists) is robust enough to reliably detect convergence on mechanical features without false negatives, and that the convergence message is clear.

### Step 2.1: Refine the convergence rule

**File:** `commands/vt-plan.md` (modify the Phase 1.5 Step 3 paragraph added in Phase 1.3)
**Pattern:** Follow the precision style of the architecture-vocabulary skill's "Diagnostic Heuristic" column (`skills/architecture-vocabulary/SKILL.md:14-19`).

**What to do:**

Replace the convergence rule paragraph with a more explicit specification:

```markdown
**Convergence rule:** Convergence is declared when ALL of the following are true:

1. **Same created-files set** — the three designs propose creating the same files (set equality on file paths, ignoring order).
2. **Same modified-files set** — the three designs propose modifying the same files.
3. **Same top-level module structure** — the three designs put primary responsibilities in the same modules. (One-line structural fingerprint: list each architect's "Where things live" top-level entries; if the three lists are identical as sets, the structures match.)

If any of the three checks fails, declare divergence. This is a textual comparison only — no LLM judgment, no scoring rubric, no synthesis agent.
```

### Step 2.2: Add convergence-message specifics

**File:** `commands/vt-plan.md` (modify the Phase 1.5 Step 4 "If converged" subsection added in Phase 1.3)
**Pattern:** Follow the existing concise status-line style used elsewhere in vt-plan (e.g., line 193's "Architectural gate: ✅ Passed").

**What to do:**

Replace the converged-output block with:

```markdown
**If converged**, print this note and proceed to Phase 2 with the consensus design (taken from Archetype A's output):

​```
🔀 Design Alternatives: explored A/B/C — all converge.
   Same created files: [N]. Same modified files: [M]. Same top-level structure.
   No meaningful divergence; proceeding with consensus design.
​```

Do not present a comparison table when converged. The convergence message is the entire output for this phase.
```

### Phase 2 Verification

**Automated:**
- [ ] `npm test` still passes
- [ ] Grep `commands/vt-plan.md` for "Convergence rule" — should match the refined three-check specification
- [ ] Grep for "Same created-files set" — should match the explicit rule

**Manual:**
- [ ] Read the convergence rule — confirm it's concrete enough that an implementer reading the spec can implement it without further questions
- [ ] Verify the convergence message format — is the count detail (`[N]`/`[M]`) actually useful, or should the message be more terse?

**Stop here.** Verify Phase 2 before proceeding to Phase 3.

---

## Phase 3: ADR Pre-fill from Rejected Designs (S-034)

### Overview

When divergence occurred and the founder picks a design, the existing Phase 3 ADR Capture step (currently at `commands/vt-plan.md:412-443`) gets a strong signal — the "real trade-off" gate is automatically met. Pre-fill the ADR's "Alternatives Considered" section with one-line summaries of the rejected design proposals so the institutional memory of the design choice is preserved.

**After this phase:** When divergence occurs and the founder picks design B, accepting an ADR creates a record whose "Alternatives Considered" section lists A and C with their architectural framings — not "none considered" or boilerplate.

### Step 3.1: Extend ADR Capture three-gate check

**File:** `commands/vt-plan.md` (modify the Phase 3 Step 4 "ADR Capture" subsection at lines 412-443)
**Pattern:** Follow the existing three-gate logic at `commands/vt-plan.md:418-422`. The existing structure is: gates → if all pass → prompt → on accept, create ADR.

**What to do:**

After the three-gate check (after line 422) and before "**If all three gates pass for a decision:**" (line 423), insert a new paragraph that establishes the auto-pass on the third gate when divergence occurred:

```markdown
**Auto-pass on Gate 3 from Phase 1.5 divergence:** If Phase 1.5 was active (i.e., `--deep` was passed) and divergence was detected (founder picked between A/B/C), the third gate ("real trade-off") is automatically met for the design-choice decision. The session state retains the rejected design proposals — use them in Step 3.2 below to pre-fill Alternatives Considered.

If Phase 1.5 did not run, or convergence was detected, evaluate Gate 3 normally.
```

### Step 3.2: Add ADR Alternatives Considered pre-fill

**File:** `commands/vt-plan.md` (modify the Phase 3 Step 4 "If accepted: create..." line at line 434)
**Pattern:** Follow the existing ADR creation instruction style. The ADR format is defined in `skills/adr-convention/SKILL.md:35-49` with sections Context / Decision / Alternatives Considered / Consequences.

**What to do:**

Replace the existing single-line acceptance instruction at line 434:

```
If accepted: create `docs/decisions/YYYY-MM-DD-<slug>.md` using the format from `skills/adr-convention/SKILL.md`. Pre-fill Context and Decision from the planning conversation. Draft Alternatives Considered and Consequences.
```

With:

```
If accepted: create `docs/decisions/YYYY-MM-DD-<slug>.md` using the format from `skills/adr-convention/SKILL.md`. Pre-fill Context and Decision from the planning conversation.

**For the Alternatives Considered section:**
- **If Phase 1.5 ran AND divergence was detected:** populate from the rejected design proposals retained in session state. Use one bullet per rejected archetype, each one line: the constraint name, a one-phrase structure summary, and the dominant trade-off (in architecture-vocabulary terms). Example:
  ​```
  ## Alternatives Considered
  - **Archetype A (Minimize indirection):** Single co-located module under [path]. Rejected: lacked a Seam for swapping the [boundary] later.
  - **Archetype C (Minimize new surface area):** Extended `[existing module]`. Rejected: pushed the existing module past its Depth threshold; would have hurt Locality.
  ​```
- **If Phase 1.5 did not run, or convergence was detected:** draft Alternatives Considered and Consequences from the planning conversation as before.

Draft Consequences in both cases.
```

### Phase 3 Verification

**Automated:**
- [ ] `npm test` still passes
- [ ] Grep `commands/vt-plan.md` for "Auto-pass on Gate 3" — should match the new paragraph
- [ ] Grep for "If Phase 1.5 ran AND divergence was detected" — should match the pre-fill instruction

**Manual:**
- [ ] Read the modified ADR Capture section end-to-end — confirm the divergence path and the non-divergence path are both clear and the instructions don't contradict each other
- [ ] Verify the example bullets in Step 3.2 use real vocabulary terms (Seam, Depth, Locality) — these come from `skills/architecture-vocabulary/SKILL.md`

**Stop here.** Verify Phase 3 before final verification.

---

## Final Verification

**All automated checks:**
- [ ] `npm test` passes (all three test files)
- [ ] `wc -l commands/vt-plan.md` reports under 700 lines
- [ ] Grep all the markers added across phases — confirm each section is in place

**Manual testing:**
- [ ] Dry-run mental walkthrough: trace what happens when `/vt-plan FEAT-XXX` (no `--deep`) is invoked — confirm Phase 1.5 is skipped silently, no behavior change vs current.
- [ ] Dry-run mental walkthrough: trace `/vt-plan --deep FEAT-XXX` on a feature with real architectural choice — confirm 3 architects dispatch, table presents, founder picks, plan writes, ADR offered with pre-filled alternatives.
- [ ] Dry-run mental walkthrough: trace `/vt-plan --deep FEAT-XXX` on a mechanical feature — confirm convergence detected, no prompt, plan writes silently.
- [ ] Dry-run mental walkthrough: trace `/vt-plan --auto --deep FEAT-XXX` — confirm Archetype A is auto-selected, alternatives noted, no founder prompt.

**Definition of done alignment:**
- [ ] DoD item 1 (3 alternatives produced before plan) — addressed in Phase 1, Step 1.3 (Phase 1.5 Steps 1-2)
- [ ] DoD item 2 (alternatives presented in table; founder picks) — addressed in Phase 1, Step 1.3 (Phase 1.5 Step 4 diverged path)
- [ ] DoD item 3 (convergence detected and reported, no forced choice) — addressed in Phase 2, Steps 2.1-2.2
- [ ] DoD item 4 (ADR pre-fill from rejected proposals) — addressed in Phase 3, Steps 3.1-3.2

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `commands/vt-plan.md` | modify | 1 | Update `--deep` flag desc; update checkpoint phase list; insert Phase 1.5 section (~80 lines); append Phase 1.5 entry to Agent Usage |
| `commands/vt-plan.md` | modify | 2 | Refine convergence rule; refine convergence-message format inside Phase 1.5 |
| `commands/vt-plan.md` | modify | 3 | Add auto-pass-on-Gate-3 paragraph in ADR Capture; replace ADR-acceptance instruction with branching pre-fill logic |

**Total:** 1 file modified across 3 phases. All edits are textual additions or in-place rewrites within `commands/vt-plan.md`.

## Risks and Fallbacks

- **Risk: vt-plan.md exceeds the 700-line budget** after additions. **Fallback:** If the additions push past 700 lines, extract Phase 1.5's "constraint archetypes" sub-block (~30 lines) into a reference file `commands/vt-plan-design-archetypes.md` and have Phase 1.5 say "Load `commands/vt-plan-design-archetypes.md` for the three archetype prompts." This honors ADR-001's reference-file pattern.
- **Risk: ADR Capture section becomes hard to read** after the divergence-aware branching is added. **Fallback:** If the inline branching grows too long, extract the "Alternatives Considered pre-fill rules" into a small block under Phase 1.5 ("Output for ADR Capture") and have ADR Capture reference it. Keeps Phase 3 terse.
- **Risk: Convergence rule is too strict** — every minor variation in module structure causes "divergence" and the founder is prompted on every `--deep` run. **Fallback:** Loosen the rule by ignoring file ordering and case differences, then re-evaluate after dogfooding. The success-metric "convergence detection fires on >80% of runs" is the trigger to revisit.
- **Risk: Convergence rule is too loose** — the founder is rarely prompted because everything looks "convergent." **Fallback:** Tighten the rule by adding a 4th check (same number of new modules, e.g.). Also revisit after dogfooding.
- **Risk: The 3 archetypes consistently produce similar designs** for plugin-repo work specifically (since most features modify markdown files, not code modules). **Fallback:** Document this as a known limitation in the failure-signal section of the spec; consider whether plugin work needs different archetypes (e.g., "minimize prompt length" / "maximize modularity in skill loading" / "inline vs reference files").

## References

- Feature spec: `docs/features/2026-04-30-design-twice-parallel-subagents.md`
- Pattern reference:
  - `commands/vt-plan.md:95-122` (Phase 0 dispatch + HALT pattern)
  - `commands/vt-plan.md:557-563` (Phase 1 parallel dispatch + wait pattern)
  - `commands/vt-plan.md:412-443` (Phase 3 ADR Capture three-gate)
- Reused agent: `agents/software-architect.md:108-173` (Recommendation Mode output format)
- Vocabulary skill: `skills/architecture-vocabulary/SKILL.md`
- ADR convention skill: `skills/adr-convention/SKILL.md`
- Hub decisions: ADR-001 (skill size budget), ADR-002 (domain glossary), ADR-003 (token mode scope)
- Parent epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001)
