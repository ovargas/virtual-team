---
date: 2026-04-10
feature: FEAT-013
spec: docs/features/2026-04-10-flow-auto-resume.md
status: approved
---

# Implementation Plan: Flow Auto-Resume

## Overview

We're adding auto-detection to bare `/flow` invocations so the command automatically detects pipeline state and resumes from the correct step. The detection checks checkpoint files, backlog status, approved plans, and draft specs in priority order. This is a single-file modification to `flow.md` with a minor frontmatter update to the feature spec.

## Reference Implementation

The closest existing patterns are:
- `.claude/commands/flow.md:48` — existing `--resume` checkpoint reading
- `.claude/commands/flow.md:60-97` — checkpoint format with state tracking
- `.claude/commands/flow.md:99+` — gate logic structure (decision trees)

This plan adds a new detection decision tree that runs before the pipeline starts, reusing the same checkpoint and backlog reading that `--resume` already does.

## Pre-conditions

Before starting implementation:
- [x] Feature spec is approved: `docs/features/2026-04-10-flow-auto-resume.md`
- [x] Flow checkpoint format already defined in `flow.md`
- [x] Backlog skill interface available for `list(status=doing)` calls

---

## Phase 1: Auto-Detection Logic (S-013)

### Overview
After this phase, bare `/flow` (no args, no flags) detects pipeline state and resumes from the correct step. All existing flags and behaviors remain unchanged.

**After this phase:** Running `/flow` without arguments auto-detects where you left off and continues, or prompts for a new feature description if no active work exists.

### Step 1.1: Add auto-detection section to flow.md
**File:** `.claude/commands/flow.md` (modify, insert between "Required Reading" ~line 49 and "Pipeline Steps" ~line 50)
**Pattern:** Follow existing checkpoint reading at `flow.md:48` and gate logic at `flow.md:99+`

**What to do:**
Insert a new section **"## Auto-Detection (bare invocation)"** between "Required Reading" and "Pipeline Steps". This section defines what happens when `/flow` is invoked with NO arguments and NO flags:

**Detection priority order** (check in this exact sequence, stop at first match):

1. **Flow checkpoint exists** (`docs/checkpoints/flow-checkpoint.md`):
   - Read the checkpoint
   - Check for staleness: if the checkpoint references a branch, verify the branch still exists and no merged PR covers it. If stale, delete the checkpoint and continue to step 2.
   - Announce detection and resume (same behavior as `--resume`)

2. **Backlog has items in "doing" status** (call `list(status=doing)`):
   - If multiple doing items exist → present a selection menu
   - For the selected item: check if it has an approved plan in `docs/plans/`
     - Has approved plan → announce and resume from `/implement`
     - No plan → announce and resume from `/plan`

3. **Approved but unstarted plans exist** (scan `docs/plans/*.md` for `status: approved`, cross-reference with backlog — plan's stories are still in "ready"):
   - If multiple → present selection
   - Announce and resume from `/next`

4. **Draft feature specs without plans** (scan `docs/features/*.md` for specs with `status: draft` or `status: refined` that have no `plan:` frontmatter):
   - If the spec has contracts → resume from `/plan`
   - If no contracts → resume from `/contracts` (or `/plan` if no contracts directory exists)
   - If multiple → present selection

5. **No active work detected:**
   ```
   No active pipeline detected. Describe a feature to start a new flow,
   or use `/next` to pick up work from the backlog.
   ```

**Announcement format** (shown before resuming):
```
Detected active pipeline state:

**[Source]:** [details]
**Next step:** /[step]

Resuming from /[step]...
```

**Multi-item selection format** (when multiple candidates exist at any detection level):
```
Multiple active items detected:

1. FEAT-012: Self-Healing Review — S-015 in Doing, has approved plan
2. FEAT-013: Flow Auto-Resume — S-013 in Doing, no plan yet

Which item should I resume? (Enter number, or describe a new feature to start fresh)
```

**Important:** This detection ONLY activates when `/flow` is invoked with zero arguments AND zero flags. If ANY flag or description is provided, skip detection entirely and use existing behavior.

### Step 1.2: Add bare invocation to usage patterns
**File:** `.claude/commands/flow.md` (modify, Invocation section ~lines 15-26)

**What to do:**
Add a new usage pattern at the TOP of the list:
```
- `/flow` — auto-detect pipeline state and resume (checkpoint → backlog → plans → specs)
```

Update the `--resume` flag description to note redundancy:
```
- `--resume` — read the flow checkpoint and continue from where the previous run stopped (note: bare `/flow` does this automatically — `--resume` is now redundant but still supported)
```

### Step 1.3: Update feature spec frontmatter
**File:** `docs/features/2026-04-10-flow-auto-resume.md` (modify)
- Add `plan: docs/plans/2026-04-10-flow-auto-resume.md` to frontmatter

### Phase 1 Verification

**Automated:**
- [ ] `flow.md` parses as valid markdown
- [ ] Auto-detection section exists between Required Reading and Pipeline Steps
- [ ] All 5 detection levels documented
- [ ] Multi-item selection format defined
- [ ] Bare `/flow` usage pattern listed first in Invocation section
- [ ] `--resume` flag marked as redundant but supported

**Manual:**
- [ ] Trace the flow: bare `/flow` → check checkpoint → check backlog → check plans → check specs → no state
- [ ] Verify existing flags still work unchanged (no behavioral change to `--from`, `--resume`, `--fix`, etc.)
- [ ] Verify detection only activates with zero args AND zero flags

---

## Final Verification

**All automated checks:**
- [ ] `flow.md` parses as valid markdown
- [ ] Feature spec has `plan:` frontmatter

**Definition of done alignment:**
- [ ] DoD 1: Bare `/flow` auto-detects from checkpoint → backlog → plans → specs — Step 1.1
- [ ] DoD 2: Detection announced before resuming — Step 1.1 (announcement format)
- [ ] DoD 3: No active pipeline → helpful prompt — Step 1.1 (level 5)
- [ ] DoD 4: Multiple items → selection presented — Step 1.1 (multi-item format)
- [ ] DoD 5: Existing flags work unchanged — Step 1.2 (backward compatibility)

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `.claude/commands/flow.md` | modify | 1 | Auto-detection section + usage pattern update + --resume note |
| `docs/features/2026-04-10-flow-auto-resume.md` | modify | 1 | Add plan frontmatter |

## Risks and Fallbacks

- **Stale checkpoint from previous feature:** Checkpoint references a merged branch. Mitigation: staleness check in detection level 1 — verify branch exists, delete stale checkpoint.
- **Ambiguous state (checkpoint + doing item for different features):** Checkpoint takes priority (it's the most precise state). The doing item is a separate pipeline that can be resumed later.
- **Detection overhead on fresh starts:** Mitigation: detection is fast (file existence checks + backlog read), level 5 provides clear prompt.

## References

- Feature spec: `docs/features/2026-04-10-flow-auto-resume.md`
- Flow command: `.claude/commands/flow.md`
- Checkpoint format: `flow.md:60-97`
- Backlog interface: `.claude/skills/backlog/SKILL.md`
