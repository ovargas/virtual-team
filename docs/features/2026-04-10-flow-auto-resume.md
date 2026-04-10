---
id: FEAT-013
date: 2026-04-10
status: done
plan: docs/plans/2026-04-10-flow-auto-resume.md
type: feature
research_level: skip
yagni_verdict: build
tags: [flow, resume, ux, pipeline, checkpoint]
---

# Flow Auto-Resume

> **Value:** Removes the friction of remembering pipeline state between sessions — `/flow` without arguments auto-detects where you left off and continues, turning a "where was I?" moment into an instant resume for every team member.

## Problem

To resume a partially completed `/flow` pipeline, users must either:
- Remember which step they were on and use `--from=step`
- Know about the `--resume` flag and that it reads from `flow-checkpoint.md`
- Manually check the checkpoint file, backlog state, and plan status to determine the next step

GSD solves this with `/gsd-next`, which auto-detects pipeline position and runs the appropriate next step. Users just type one command and the system figures out where they are.

For teams, this is more important than for solo developers — a team member picking up work doesn't have the session history to know which step the pipeline was on.

**Trigger:** Tech review (2026-04-10), Finding #5 (Nice to Have)
**Current workaround:** Use `--resume` flag (requires knowing it exists) or `--from=step` (requires knowing which step).

## YAGNI Assessment

**Verdict:** BUILD IT

Tiny scope, clear value. This is a decision tree in `/flow` that reads existing state files — checkpoint, backlog, plans. No new infrastructure, no new files, no new concepts. The checkpoint files and backlog state already contain all the information needed. This just connects the dots so users don't have to.

## Solution

### What we're building

A single change to `/flow`: when invoked without a feature description or `--from`/`--resume` flags, auto-detect pipeline position and continue.

### How it works

When `/flow` is invoked bare (no arguments, no flags):

```
/flow (bare invocation)
  │
  ├─ 1. Check flow-checkpoint.md exists?
  │     YES → Resume from checkpoint (same as --resume)
  │     NO  ↓
  │
  ├─ 2. Check backlog for items in "doing" status?
  │     YES → Item has approved plan?
  │       YES → Resume from /implement
  │       NO  → Resume from /plan
  │     NO  ↓
  │
  ├─ 3. Check for approved but unstarted plans?
  │     YES → Resume from /next
  │     NO  ↓
  │
  ├─ 4. Check for draft feature specs without plans?
  │     YES → Resume from /contracts (or /plan if contracts exist)
  │     NO  ↓
  │
  └─ 5. No active work detected
        → Prompt: "No active pipeline detected. Describe a feature to start a new flow,
           or use /next to pick up work from the backlog."
```

**Announce the detection:**

```
Detected active pipeline state:

**Checkpoint:** flow-checkpoint.md found
**Last completed:** /plan (FEAT-012)
**Next step:** /next

Resuming from /next. Press Ctrl+C to cancel.
```

Or:

```
Detected active pipeline state:

**Backlog:** S-015 is in Doing status (FEAT-012)
**Plan:** docs/plans/2026-04-10-self-healing-review.md (approved)
**Branch:** feat/FEAT-012-self-healing-review

Resuming from /implement. Press Ctrl+C to cancel.
```

### Priority order matters

The detection order is intentional:
1. **Checkpoint first** — most precise state (knows exact step + gate history)
2. **Backlog doing** — work in progress, resume implementation
3. **Approved plans** — work ready to start, needs branching
4. **Draft specs** — work in early stages, needs planning
5. **Nothing** — clean slate

### Backward compatibility

- `/flow <description>` — still starts a new pipeline (unchanged)
- `/flow --from=step` — still overrides to a specific step (unchanged)
- `/flow --resume` — still reads checkpoint explicitly (unchanged, but now redundant)
- `/flow --fresh` — still deletes checkpoint and starts fresh (unchanged)

The new behavior ONLY activates when `/flow` is invoked with zero arguments and zero flags.

## Boundaries

### Explicitly NOT building
- A separate `/continue` or `/resume` command — `/flow` handles this natively
- Automatic detection across repositories — only detects state in the current project
- Multi-pipeline detection — if multiple checkpoints/doing items exist, present a choice rather than guessing

### Rabbit holes to avoid
- Trying to detect partial states within a command (e.g., "/implement was at phase 3") — that's what the implement checkpoint handles internally
- Auto-starting without user confirmation — always announce what was detected and give a moment to cancel

## Definition of Done

**The feature is complete when:**

1. `/flow` (bare, no args) auto-detects pipeline state from checkpoint → backlog → plans → specs
2. The detected state is announced before resuming
3. If no active pipeline is detected, a helpful prompt is shown
4. If multiple active items exist, a selection is presented
5. Existing flags (`--from`, `--resume`, `--fresh`, `<description>`) work unchanged

**Verification:**

Automated:
- [ ] `/flow` with existing checkpoint resumes correctly (same as `--resume`)
- [ ] `/flow` with doing backlog item resumes from `/implement`

Manual:
- [ ] Interrupt a flow mid-pipeline, start new session, run bare `/flow` — verify it resumes correctly
- [ ] Run bare `/flow` with clean state — verify it prompts for a new feature description

## Success Metrics

**Leading (immediate):**
- Users don't need to use `--resume` or `--from` flags (bare `/flow` handles it)
- New team members can pick up interrupted work without reading checkpoint files

**Lagging (2-4 weeks):**
- Reduction in "where was I?" questions in team contexts
- `--resume` flag usage drops to near zero (auto-detection handles it)

**Failure signal:**
- Auto-detection picks the wrong state (resumes wrong item or wrong step) more than 5% of the time

## Implementation Hints

### Existing patterns to follow
- `.claude/commands/flow.md:62-92` — existing checkpoint reading logic
- `.claude/skills/backlog/SKILL.md` — `list(status=doing)` for active items
- `.claude/commands/next.md` — backlog state detection

### Integration points
- `flow.md` — add detection logic at invocation parsing (Phase 0, before the pipeline starts)

### API Contracts

No API contracts — this feature is internal UX improvement.

### Technical risks
- Ambiguous state detection when multiple items are in flight — mitigation: present a choice menu instead of guessing
- Checkpoint file from a previous feature still present after PR merge — mitigation: `/pr` already deletes checkpoints; add a staleness check (if checkpoint references a merged branch, ignore it)

## Research Summary

Research skipped — follows established pattern from GSD's `/gsd-next` auto-detection. No technical unknowns.

## Stories

**Group 1: Auto-resume** (standalone, single branch)

1. **S-013: Add auto-detection to bare `/flow` invocation** — After this, `/flow` without arguments detects pipeline state from checkpoint, backlog, and plans, announces the detection, and resumes from the correct step.
   Layers: flow.md invocation parsing + state detection logic
   Acceptance: Checkpoint detected → resumes from checkpoint step; Doing item detected → resumes from /implement; No state → prompts for new feature; multiple items → presents selection
   Demo: Interrupt a flow, start new session, type `/flow`, observe auto-resume

## References

- Tech review: `docs/reviews/2026-04-10-claude-workflow-system.md` (Finding #5)
- Comparison: GSD `/gsd-next` auto-detection
- Existing: `.claude/commands/flow.md` (checkpoint reading logic)

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Tech review finding #5 (Nice to Have): No auto-detection of next step"
