---
date: 2026-04-11
feature: FEAT-015
spec: docs/features/2026-04-11-token-consumption-optimization.md
status: approved
---

# Implementation Plan: Token Consumption Optimization

## Overview

This plan reduces the token overhead of the plugin's most-used commands by extracting the bug-fix pipeline from `flow.md` into a conditionally-loaded file, reinforcing lazy domain skill loading in `/implement` and its subagent dispatch, and adding cost transparency to SDD wave analysis and command documentation. All changes are markdown edits — no application code.

## Reference Implementation

The closest existing pattern is how `flow.md` already conditionally loads content based on flags:
- `flow.md:42-46` — Required Reading section loads skills and checkpoints based on context
- `flow.md:48-154` — Auto-Detection section is skipped when flags/arguments are provided
- `implement.md:425` — Existing lazy loading instruction for domain skills

This plan follows the same "If condition, read file / skip section" pattern.

## Pre-conditions

Before starting implementation:
- [ ] Feature spec is approved: `docs/features/2026-04-11-token-consumption-optimization.md`
- [ ] All 151 validation tests pass: `npm test`

---

## Phase 1: Extract Bug-Fix Pipeline (S-017)

### Overview
Extract the `--fix` pipeline from `flow.md` into a separate file that's loaded conditionally. After this phase, feature flows are ~2,600 tokens leaner.

**After this phase:** Running `/flow Add feature` loads a 710-line `flow.md` instead of 908 lines. Bug-fix flows still work identically.

### Step 1.1: Create the extracted bug-fix pipeline file
**File:** `commands/flow-fix-pipeline.md` (create)
**Pattern:** Follow `flow.md:711-891` — move this content verbatim

**What to do:**
Create `commands/flow-fix-pipeline.md` with proper YAML frontmatter (`name: flow-fix-pipeline`, `description: Bug fix pipeline for /flow --fix mode`). Copy lines 711-891 from `flow.md` into this file verbatim. This includes:
- "Bug Fix Pipeline (`--fix` mode)" heading and intro
- Mode Detection
- Input Handling
- Gate: After /bug
- Gate: After /debug (Complexity Gate)
- Inline Fix Implementation
- Quality Gate (fix mode)
- Executing /pr (fix mode)
- Bug Fix Checkpoint Format
- Bug Fix Completion Report
- Bug Fix Step Execution (all sub-sections)

Preserve all internal cross-references. The one cross-reference back to the feature pipeline ("see 'Gate: After /review + /validate' above") needs to become: "see the quality gate section in `commands/flow.md`".

### Step 1.2: Replace bug-fix pipeline in flow.md with conditional load instruction
**File:** `commands/flow.md` (modify)

**What to do:**
Replace lines 711-891 (the entire bug-fix pipeline section) with a conditional loading instruction:

```markdown
## Bug Fix Pipeline (`--fix` mode)

**If `--fix` was passed:** Read `commands/flow-fix-pipeline.md` for the complete bug fix pipeline — gates, checkpoint format, completion report, and step execution. Then return here for Error Recovery and Important Constraints below.

**If `--fix` was NOT passed:** Skip this section entirely. The bug fix pipeline is not relevant to feature flows.
```

This reduces the section from ~181 lines to ~5 lines for feature flows.

### Step 1.3: Verify cross-references are intact
**File:** `commands/flow.md` (verify)

**What to do:**
Check that the flags section (lines 29-30) and usage examples (lines 23-26) still correctly describe `--fix` behavior. These reference the bug-fix pipeline conceptually but don't need path changes — they describe what `--fix` does, not where the instructions live.

Verify that `commands/flow-fix-pipeline.md` has no broken internal references (e.g., references to sections that remained in `flow.md`).

### Phase 1 Verification

**Automated:**
- [ ] `npm test` — all structural validation tests pass

**Manual:**
- [ ] Read `flow.md` — confirm bug-fix content is replaced by conditional load instruction
- [ ] Read `flow-fix-pipeline.md` — confirm it contains the complete bug-fix pipeline
- [ ] Verify cross-reference from `flow-fix-pipeline.md` back to `flow.md` quality gate is correct

**Stop here.** Verify phase before moving on.

---

## Phase 2: Reinforce Lazy Skill Loading (S-018)

### Overview
Make per-phase domain skill loading explicit in both the `/implement` command and the `/flow` subagent dispatch prompt. After this phase, the lazy loading instruction is reinforced at every entry point to implementation.

**After this phase:** The subagent dispatch prompt explicitly instructs per-phase loading, and `implement.md` includes a token-cost callout that makes the overhead visible.

### Step 2.1: Add lazy loading instruction to subagent dispatch prompt
**File:** `commands/flow.md` (modify)
**Pattern:** Follow `flow.md:543-563` — the existing subagent prompt template

**What to do:**
In the subagent prompt template (the code block at lines 543-563), add a skill loading instruction after the "Execute" line:

```
**Skill loading:** Load Layer 0 (behavioral) skills upfront. Load Layer 1/2 (domain + stack) skills
only when you reach a phase that needs them — not all at once. Each domain skill is ~150-800 tokens;
loading all four upfront wastes ~2,000+ tokens of context on skills irrelevant to the current phase.
```

This goes between the existing "Execute" line and the "Write checkpoints" line.

### Step 2.2: Add token-cost callout to implement.md skill loading section
**File:** `commands/implement.md` (modify)
**Pattern:** Follow `implement.md:425` — the existing lazy loading instruction

**What to do:**
After line 425 ("Layer 0 is always loaded. For Layers 1 and 2, only load the skill(s) relevant to the current phase — don't load all of them at once."), add a brief callout:

```markdown
> **Why this matters:** Each domain skill is ~150 lines (~2,000 tokens). Each stack skill can be 200+ lines (~2,600+ tokens). Loading all four domain skills upfront adds ~8,000 tokens of instructions irrelevant to the current phase. Load the one you need when you need it — your context budget is better spent on code.
```

This makes the cost visible without changing the instruction.

### Phase 2 Verification

**Automated:**
- [ ] `npm test` — all structural validation tests pass

**Manual:**
- [ ] Read the subagent dispatch prompt in `flow.md` — confirm lazy loading instruction is present
- [ ] Read the skill loading section in `implement.md` — confirm token-cost callout is present
- [ ] Verify the callout is accurate (check actual line counts of domain skills)

**Stop here.** Verify phase before moving on.

---

## Phase 3: Cost Transparency and Stack Skill Guidance (S-019)

### Overview
Add cost transparency notes and stack skill size guidance so teams understand the token cost model before committing to expensive operations.

**After this phase:** Teams see estimated subagent counts in SDD wave analysis, understand cost differences between pipeline modes, and know the recommended stack skill size.

### Step 3.1: Add cost transparency note to flow.md
**File:** `commands/flow.md` (modify)

**What to do:**
After the "Pipeline Steps" section (after line 165, before the "Flow Checkpoint" section), add a brief note:

```markdown
### Context Consumption

The pipeline's token overhead varies by mode:

| Mode | Approximate overhead | Notes |
|------|---------------------|-------|
| Feature flow (inline) | ~15,000 tokens | Flow prompt + behavioral skills + one domain skill |
| Feature flow (subagent) | ~20,000 tokens per subagent | Each subagent gets a fresh 200k window |
| Bug fix flow (`--fix`) | ~18,000 tokens | Flow prompt + fix pipeline + behavioral skills |
| SDD mode (`--sdd`) | ~20,000 tokens × N subagents | See wave analysis for estimated count |

These are baseline instruction costs before any code context is loaded. Keeping features focused (3-5 stories) minimizes the number of subagent dispatches.
```

### Step 3.2: Add estimated subagent count to SDD wave analysis presentation
**File:** `skills/subagent-driven-development/SKILL.md` (modify)
**Pattern:** Follow the wave analysis presentation template at lines 48-65

**What to do:**
In the wave analysis presentation template (the code block starting at line 52), add an estimated subagent count after the wave table:

```
**Estimated subagent sessions:** [N tasks] implementers + [N tasks × 2] reviewers + 1 holistic review = [total] sessions
```

This gives teams visibility into the cost before they proceed.

### Step 3.3: Add stack skill size guidance to command-reference.md
**File:** `docs/command-reference.md` (modify)
**Pattern:** Follow the existing "Customizing Skills" section at lines 365-381

**What to do:**
After the "Where to Put What" table (after line 381), add a size guidance subsection:

```markdown
### Stack Skill Size

Keep stack-specific skills under **~200 lines** (~2,600 tokens). Each stack skill loads into context alongside the generic domain skill during implementation. Larger skills consume context budget that's better spent on actual code.

If your stack conventions exceed 200 lines:
- Put the core rules (most-used patterns, critical conventions) in the skill
- Link to external docs or a reference file for comprehensive examples
- Split into focused skills by domain if needed (e.g., `go-gin-api` and `go-gorm-data` instead of one giant `go` skill)
```

### Phase 3 Verification

**Automated:**
- [ ] `npm test` — all structural validation tests pass

**Manual:**
- [ ] Read the cost transparency note in `flow.md` — confirm it's clear and accurate
- [ ] Read the wave analysis template in SDD skill — confirm subagent count estimate is present
- [ ] Read the stack skill guidance in `command-reference.md` — confirm it's actionable

---

## Final Verification

**All automated checks:**
- [ ] Full test suite passes: `npm test`

**Manual testing:**
- [ ] Read `flow.md` end-to-end — confirm it's coherent without inline bug-fix pipeline
- [ ] Read `flow-fix-pipeline.md` — confirm it's self-contained with correct back-references
- [ ] Read `implement.md` skill loading section — confirm token-cost callout
- [ ] Read `flow.md` subagent dispatch — confirm lazy loading instruction
- [ ] Read `flow.md` cost transparency note — confirm accuracy
- [ ] Read SDD wave analysis — confirm subagent count estimate
- [ ] Read `command-reference.md` — confirm stack skill size guidance

**Definition of done alignment:**
- [ ] DoD 1 (feature flow doesn't load bug-fix) — addressed in Phase 1, Step 1.2
- [ ] DoD 2 (--fix loads bug-fix from extracted file) — addressed in Phase 1, Step 1.1
- [ ] DoD 3 (subagent dispatch instructs per-phase loading) — addressed in Phase 2, Step 2.1
- [ ] DoD 4 (implement.md has token-cost callout) — addressed in Phase 2, Step 2.2
- [ ] DoD 5 (command-reference has stack skill guidance) — addressed in Phase 3, Step 3.3
- [ ] DoD 6 (flow has cost transparency note) — addressed in Phase 3, Step 3.1
- [ ] DoD 7 (SDD wave analysis has subagent count) — addressed in Phase 3, Step 3.2

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `commands/flow-fix-pipeline.md` | create | 1 | Extracted bug-fix pipeline (~181 lines) |
| `commands/flow.md` | modify | 1, 2, 3 | Remove bug-fix inline, add conditional load, add subagent lazy loading, add cost note |
| `commands/implement.md` | modify | 2 | Add token-cost callout to skill loading section |
| `skills/subagent-driven-development/SKILL.md` | modify | 3 | Add subagent count to wave analysis |
| `docs/command-reference.md` | modify | 3 | Add stack skill size guidance |

## Risks and Fallbacks

- **Cross-reference breakage after extraction:** The bug-fix pipeline references the quality gate section in `flow.md`. If this reference becomes stale, the model may not find the gate logic. **Fallback:** Use a clear, stable reference ("see the quality gate section in `commands/flow.md`") rather than line numbers.
- **Model ignores lazy loading instruction:** Even with reinforcement, the model may still load all skills upfront. **Fallback:** Monitor in practice. If this fails, the next step would be structural enforcement (splitting implement.md into phase-specific files), but that's a separate feature.
- **Conditional loading instruction not followed:** The model might read `flow-fix-pipeline.md` even on feature flows. **Fallback:** The instruction is clear ("If `--fix` was NOT passed, skip this section entirely"), and the cost is only wasted tokens, not incorrect behavior.

## References

- Feature spec: `docs/features/2026-04-11-token-consumption-optimization.md`
- Flow command: `commands/flow.md`
- Implement command: `commands/implement.md`
- SDD skill: `skills/subagent-driven-development/SKILL.md`
- Command reference: `docs/command-reference.md`
- Workflow review: `docs/workflow-review-report.md` (T1, T2, T4, T5)
