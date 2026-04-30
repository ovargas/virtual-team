---
id: FEAT-015
date: 2026-04-11
status: done
plan: docs/plans/2026-04-11-token-consumption-optimization.md
type: feature
research_level: light
yagni_verdict: slimmed
tags: token-optimization, performance, skill-loading
---

# Token Consumption Optimization

> **Value:** Reduce the baseline token overhead of the plugin's most-used commands so teams spend context budget on code, not instructions.

## Problem

The plugin loads ~25,000-30,000 tokens of instructions before the first line of implementation code is written. The two largest contributors are:

1. `/flow` loads its full 908-line prompt including the 198-line bug-fix pipeline on every run, even feature flows.
2. `/implement` instructs lazy domain skill loading (line 425) but doesn't reinforce it in the subagent dispatch prompt, and there's no guidance on stack skill size — a single stack skill can be 785+ lines.

Teams adopting the plugin pay this token tax on every `/flow` run. For a team running 5-10 flows per day, the overhead compounds.

**Trigger:** Independent workflow review (T1, T2, T4, T5) identified token consumption as the lowest-rated dimension (5/10).
**Current workaround:** None — the overhead is invisible to users.

## YAGNI Assessment

**Verdict:** SLIMMED DOWN

The core optimizations (T1, T2) are worth building — they reduce real, recurring overhead. Checkpoint compaction (T3) was deferred because features should complete in one session. Skill compact mode was cut because behavioral skills are already right-sized after the TDD mode refactor.

## Solution

### What we're building

1. **Conditional bug-fix pipeline loading:** Extract the `--fix` pipeline section from `flow.md` into a separate file loaded only when `--fix` is passed. Saves ~2,600 tokens per feature flow.

2. **Lazy skill loading reinforcement:** Make per-phase domain skill loading explicit and harder to ignore in both `/implement` and the `/flow` subagent dispatch prompt.

3. **Stack skill size guidance:** Document a recommended maximum (~200 lines) for stack-specific skills in the customization section of the command reference.

4. **Cost transparency notes:** Add expected token/cost guidance to `/flow` output and SDD wave analysis so teams understand the cost model.

### How it works

**T1 — Conditional loading:** `flow.md` gets a conditional instruction: "If `--fix` was passed, read `commands/flow-fix-pipeline.md` for the bug fix pipeline. Otherwise, skip it." The extracted file contains the bug fix pipeline (gates, checkpoint format, completion report, step execution). Feature flows never load it.

**T2 — Lazy loading reinforcement:** Two changes:
- The `/flow` subagent dispatch prompt for `/implement` (lines 543-563 of `flow.md`) adds an explicit instruction: "Load domain skills (Layer 1/2) per-phase as you reach each phase, not all upfront."
- The `/implement` command's skill loading section gets a stronger callout: a brief note calculating the token cost of loading all domain skills at once vs. per-phase, making the cost visible.

**T4/T5 — Cost transparency:** Add brief cost guidance notes in two places:
- `/flow` — after the pipeline overview, a note about expected context consumption for feature vs. bug-fix pipelines
- SDD wave analysis output — include estimated subagent count so teams can make an informed choice

**Stack skill guidance:** Add a recommended max (~200 lines) to the "Customizing Skills" section of `docs/command-reference.md`, with the reasoning that larger skills should link to external docs.

## Boundaries

### Explicitly NOT building
- Checkpoint compaction — deferred; features should complete in one session
- Skill compact mode — behavioral skills already right-sized after TDD mode refactor
- Automated token counting — too complex; manual guidance is sufficient
- Dynamic skill loader that tracks active skills — per-phase instruction is sufficient

### Rabbit holes to avoid
- Don't split `implement.md` itself — the command prompt is the right size, the problem is what gets loaded alongside it
- Don't build infrastructure for conditional skill loading — a simple "read this file if condition" instruction is enough

## Definition of Done

**The feature is complete when:**

1. Running `/flow Add feature` does NOT load the bug-fix pipeline content
2. Running `/flow --fix` DOES load the bug-fix pipeline from the extracted file
3. The `/implement` subagent dispatch prompt explicitly instructs per-phase skill loading
4. The `/implement` skill loading section includes a token-cost callout for loading all vs. per-phase
5. `docs/command-reference.md` includes stack skill size guidance (~200 lines max)
6. `/flow` includes a brief cost transparency note
7. SDD wave analysis output mentions estimated subagent count

**Verification:**

Automated:
- [ ] `npm test` — all structural validation tests pass (frontmatter, references, cross-links)
- [ ] `flow-fix-pipeline.md` exists and is referenced from `flow.md`
- [ ] `flow.md` no longer contains the bug-fix pipeline inline

Manual:
- [ ] Read `flow.md` without `--fix` context — confirm bug-fix content is absent
- [ ] Read `flow.md` with `--fix` context — confirm bug-fix content loads correctly
- [ ] Read `/implement` subagent dispatch — confirm lazy loading instruction is present
- [ ] Read `command-reference.md` — confirm stack skill size guidance exists

## Success Metrics

**Leading (immediate):**
- Feature flow token overhead reduced by ~2,600 tokens (T1)
- `/implement` subagent loads only relevant domain skill per phase instead of all (T2)

**Lagging (2-4 weeks):**
- Teams report understanding the cost model before running `--sdd` (T5)

**Failure signal:**
- If lazy loading instruction is still ignored by the model in practice, a structural enforcement mechanism may be needed

## Implementation Hints

### Existing patterns to follow
- Conditional file loading: `flow.md` already conditionally loads checkpoints and skills based on flags — follow the same "If X, read Y" pattern
- Subagent dispatch prompts: `flow.md:543-563` — the implement dispatch prompt is the template for adding lazy-loading instructions

### Integration points
- `commands/flow.md` — extract bug-fix pipeline, add cost transparency note, update subagent dispatch
- `commands/flow-fix-pipeline.md` — new file containing extracted bug-fix pipeline
- `commands/implement.md` — strengthen lazy loading callout in skill loading section
- `docs/command-reference.md` — add stack skill size guidance to "Customizing Skills" section

### API Contracts

No API contracts — this feature is internal plugin restructuring.

### Technical risks
- Extracting the bug-fix pipeline must preserve all cross-references (checkpoint format, gate logic, completion report)
- The lazy loading reinforcement depends on the model following instructions — if it doesn't, no fallback exists short of structural enforcement

## Research Summary

- `implement.md:425` already instructs lazy domain skill loading: "For Layers 1 and 2, only load the skill(s) relevant to the current phase — don't load all of them at once."
- `flow.md` bug-fix pipeline spans lines 711-908 (198 lines, ~2,600 tokens)
- `/flow` subagent dispatch for `/implement` (lines 529-564) does not mention skill loading strategy
- Total `flow.md` is 908 lines; total `implement.md` is ~462 lines

## Stories

### Group 1: Token reduction (sequential, single branch)

1. **S-017: Extract bug-fix pipeline from flow.md into conditional file** — Feature flows no longer load 198 lines of irrelevant bug-fix content
   Layers: `commands/flow.md` split + `commands/flow-fix-pipeline.md` creation
   Acceptance: Feature flow prompt is ~2,600 tokens smaller; `--fix` flows still work identically
   Demo: Diff of `flow.md` showing removed section + new file

2. **S-018: Reinforce lazy domain skill loading in /implement and subagent dispatch** — Per-phase skill loading is explicit and harder to ignore
   Layers: `commands/implement.md` callout + `commands/flow.md` subagent prompt update
   Acceptance: Subagent dispatch prompt includes lazy loading instruction; implement.md has token-cost callout
   Demo: Read updated subagent prompt showing the new instruction

3. **S-019: Add cost transparency and stack skill size guidance** — Teams understand token costs before running expensive operations
   Layers: `commands/flow.md` cost note + `docs/command-reference.md` skill guidance + SDD wave estimate
   Acceptance: Cost notes present in flow and command-reference; SDD wave analysis mentions subagent count
   Demo: Read the new sections

**Milestones:**
- After S-017: Feature flows are leaner by ~2,600 tokens
- After S-018: Implementation phases load only relevant skills
- After S-019: Teams have cost visibility before committing to expensive runs

**Execution strategy:**
- Group 1 → `/virtual-team:implement FEAT-015` implements all stories sequentially, one PR

## References

- Workflow review report: `docs/workflow-review-report.md` (T1, T2, T4, T5)
- Flow command: `commands/flow.md`
- Implement command: `commands/implement.md`
- Skill loading: `commands/implement.md:402-425`
- Subagent dispatch: `commands/flow.md:529-564`
- Bug-fix pipeline: `commands/flow.md:711-908`
- Command reference: `docs/command-reference.md`

## Origin

Feature spec created on 2026-04-11 through structured intake.
Original description: "Analyze Token Consumption Concerns from workflow review report (T1-T5) and optimize"
