---
date: 2026-04-10
feature: FEAT-010
spec: docs/features/2026-04-10-wave-based-parallel-sdd.md
status: approved
---

# Implementation Plan: Wave-Based Parallel SDD

## Overview

We're modifying the SDD orchestration protocol to analyze task dependencies and execute independent tasks in parallel waves. Phase 1 adds the dependency graph analysis (extracting file references from plan tasks and grouping them into waves). Phase 2 modifies the dispatch loop to execute waves in parallel and extends scene-setting for multi-task context. Both phases modify the SDD skill and the `/implement` command.

## Reference Implementation

The closest existing pattern is the SDD orchestration protocol itself:
- `.claude/skills/subagent-driven-development/SKILL.md:17-78` — the 10-step orchestration protocol (sequential task loop)
- `.claude/commands/implement.md:286-323` — the SDD Execution Mode section in `/implement`
- `.claude/skills/subagent-driven-development/implementer-prompt.md` — scene-setting template with `{scene_setting}` placeholder

This plan extends the existing sequential loop with an analysis pass (dependency graph) before execution, and replaces the one-at-a-time dispatch with per-wave parallel dispatch.

## Pre-conditions

Before starting implementation:
- [ ] Feature spec is approved: `docs/features/2026-04-10-wave-based-parallel-sdd.md`
- [ ] FEAT-009 is complete (fresh-context dispatch is available for flow-level orchestration — no direct dependency, but concepts overlap)

---

## Phase 1: Dependency Graph from Plan Task File References (S-007)

### Overview
After this phase, the SDD orchestrator can analyze a plan and produce a directed acyclic graph (DAG) of task dependencies based on file references. The orchestrator then groups tasks into waves. No change to execution behavior — this phase is purely analytical.

**After this phase:** Before dispatching any task, the SDD orchestrator presents a wave grouping to the user showing which tasks are independent and will run in parallel (Phase 2).

### Step 1.1: Add dependency analysis section to the SDD skill
**File:** `.claude/skills/subagent-driven-development/SKILL.md` (modify)
**Pattern:** Follow the existing "## Orchestration Protocol" structure at SKILL.md:17-78.

**What to do:**

Add a new section **"## Wave Analysis"** between "## Overview" (line 15) and "## Orchestration Protocol" (line 17). This section defines how to analyze a plan's tasks before dispatching them.

The section should contain:

1. **When to run wave analysis:**
   - Always run when SDD is active — the analysis is cheap and the fallback (all tasks in one wave = sequential) is identical to current behavior
   - The orchestrator runs this BEFORE entering the task dispatch loop

2. **File reference extraction:**
   - For each task/step in the plan, identify:
     - **Creates:** Files listed with `(create)` or `[create]` in the step's "File:" line
     - **Modifies:** Files listed with `(modify)` or `[modify]` in the step's "File:" line
     - **Reads/references:** Files mentioned in "Pattern:" lines or "Follow `file:line`" references
   - If a step has no explicit "File:" line, treat it as modifying unknown files → it becomes a dependency barrier (must run after everything before it, and everything after it depends on it)

3. **Dependency edge rules:**
   - Task B depends on Task A if: B reads or modifies a file that A creates or modifies
   - Read-read is NOT a dependency (two tasks reading the same file can run in parallel)
   - Create-create on the same file is a CONFLICT (same file created twice — move one to the next wave)
   - Modify-modify on the same file is a CONFLICT (same file modified by two parallel tasks — move one to the next wave)

4. **Wave grouping algorithm:**
   - Build dependency edges from the file references
   - Topologically sort into waves:
     - Wave 1: tasks with no incoming dependency edges
     - Wave 2: tasks whose dependencies are ALL in Wave 1
     - Wave N: tasks whose dependencies are ALL in Waves 1 through N-1
   - **File conflict resolution:** If two tasks in the same wave both create or modify the same file, move the task with fewer other dependents to the next wave. Log: "T3 and T5 both modify `file.ext` — T5 moved to Wave N+1"
   - **Fallback:** If all tasks are sequentially dependent (each depends on the previous), produce N waves of 1 task each — behavior is identical to current sequential SDD

5. **Presentation format:**
   ```
   ## Wave Analysis

   **Tasks:** [N] total
   **Waves:** [N] (speedup: [N]x vs sequential)

   | Wave | Tasks | Dependencies |
   |------|-------|-------------|
   | 1 | T1, T2 | none (independent) |
   | 2 | T3, T4, T5 | T3→T1, T4→T2, T5→T1+T2 |
   | 3 | T6 | T3, T4, T5 |

   **File conflicts resolved:** [none | list]
   ```

### Step 1.2: Update the SDD Execution Mode section in implement.md
**File:** `.claude/commands/implement.md` (modify)
**Pattern:** Follow the existing "### Setup" subsection at implement.md:289-293.

**What to do:**

Update the "### Setup" subsection in the SDD Execution Mode section to add wave analysis as step 4:

```
### Setup

1. Load the `subagent-driven-development` skill — it defines the full protocol
2. Read the feature spec's acceptance criteria — needed for spec review dispatching
3. Identify all tasks in the plan — each plan phase/step becomes a dispatchable task
4. **Run wave analysis** — extract file references from each task, build the dependency graph, group into waves (following the SDD skill's "Wave Analysis" section). Present the wave grouping before proceeding.
```

### Phase 1 Verification

**Automated:**
- [ ] `SKILL.md` parses as valid markdown (no broken formatting)
- [ ] `implement.md` parses as valid markdown
- [ ] Wave analysis section defines all four dependency edge types (create-create, create-modify, modify-modify, read-write)
- [ ] Fallback behavior documented (sequential = N waves of 1 task)

**Manual:**
- [ ] Review the wave analysis algorithm against the spec's example (T1-T6 dependency graph at spec lines 53-74) — verify the algorithm would produce the same waves

**Stop here.** Verify Phase 1 before proceeding.

---

## Phase 2: Wave Parallel Dispatch (S-008)

### Overview
After this phase, the SDD orchestrator dispatches all tasks within a wave simultaneously using the Agent tool's parallel invocation. Tasks in later waves wait for all previous waves to complete. Scene-setting context for later waves includes results from ALL previous wave tasks.

**After this phase:** `--sdd` on a plan with independent tasks shows measurable speedup. Sequential plans behave identically to before.

### Step 2.1: Update the orchestration protocol for wave-based dispatch
**File:** `.claude/skills/subagent-driven-development/SKILL.md` (modify)
**Pattern:** Follow the existing "## Orchestration Protocol" (SKILL.md:17-78) and the "For Each Task" loop.

**What to do:**

Replace the "For each task in the plan:" instruction (SKILL.md:19) with a wave-based execution model. The section should be restructured as:

```
## Orchestration Protocol

### For each wave (from wave analysis):

**Within a wave — dispatch all tasks in parallel:**

For each task in the current wave, simultaneously execute steps 1-4 (Extract, Build Context, Select Model, Dispatch Implementer) using multiple Agent tool calls in a single message.

**After all implementers in the wave return:**

For each task in the wave (sequentially — reviews don't parallelize across tasks):
- Steps 5-9 (Handle Status, Spec Review, Handle Spec Review, Quality Review, Handle Quality Review)
- Step 10 (Mark Task Complete)

**After all tasks in the wave are reviewed and complete:**

Build cumulative scene-setting context including ALL tasks from this wave and all previous waves. Proceed to the next wave.
```

The key changes from current protocol:

1. **Step 4 (Dispatch) becomes parallel within a wave** — multiple Agent tool calls in one message
2. **Steps 5-10 (status handling + reviews) remain sequential per task** — reviews need the specific task's diff
3. **Step 2 (Build Context) for Wave 2+ includes all previous wave results** — files created/modified, verification results, issues found

Add the following detail:

**Parallel dispatch cap:** Maximum 3 simultaneous implementer subagents per wave. If a wave has more than 3 tasks, split into sub-waves of 3. This prevents API rate limit issues.

**Wave scene-setting extension:**

For tasks in Wave 2+, the `{scene_setting}` in the implementer prompt should include:
```
**Previously completed (Waves 1-N):**
- Wave 1: [task names] — files created/modified: [list]
- Wave 2: [task names] — files created/modified: [list]
- All previous wave tasks passed spec and quality reviews.
- [Any issues found and resolved during reviews]
```

### Step 2.2: Update the SDD rules
**File:** `.claude/skills/subagent-driven-development/SKILL.md` (modify)
**Pattern:** Follow the existing "## Key Rules" section at SKILL.md:82-90.

**What to do:**

Update the rule "Never dispatch multiple implementers in parallel — They'd conflict on files" to:

```
- **Never dispatch multiple implementers for the SAME file in parallel** — Wave analysis ensures tasks in the same wave don't share files. Within a wave, parallel dispatch is safe. Across waves, sequential execution prevents conflicts.
```

Add a new rule:
```
- **Cap parallel dispatch at 3 subagents per wave** — prevents API rate limit issues. Split larger waves into sub-waves of 3.
```

### Step 2.3: Update the SDD Execution Mode in implement.md
**File:** `.claude/commands/implement.md` (modify)
**Pattern:** Follow the existing "### For Each Task" subsection at implement.md:295-308.

**What to do:**

Replace the "### For Each Task" subsection with a wave-based execution loop:

```
### For Each Wave

The wave analysis (from Setup step 4) determines the task grouping. Execute waves sequentially; within each wave, dispatch tasks in parallel.

**1. Dispatch wave tasks in parallel (steps 1-4 per task):**

For each task in the current wave, prepare simultaneously:
1. **Extract** task text from the plan
2. **Build context** with scene-setting (include all previous wave results)
3. **Select model** per the SDD skill's model selection table
4. **Dispatch implementer** — use the Agent tool with multiple calls in a single message

All implementers in the wave run simultaneously. Wait for all to return.

**2. Review each task sequentially (steps 5-10 per task):**

After all implementers return, review each task one at a time:
5-7. Spec review cycle (max 3 iterations)
8-9. Quality review cycle (max 3 iterations)
10. Mark task complete

**3. Advance to next wave:**

Build cumulative context (files modified, review results, issues resolved).
Proceed to the next wave.

**Parallel dispatch cap:** Max 3 simultaneous implementers per wave. Larger waves split into sub-waves.

**Sequential fallback:** If all tasks are in separate waves (fully dependent plan), this loop is identical to the current sequential protocol.
```

### Phase 2 Verification

**Automated:**
- [ ] `SKILL.md` parses as valid markdown
- [ ] `implement.md` parses as valid markdown
- [ ] The "never dispatch multiple implementers in parallel" rule is updated (not deleted — refined)
- [ ] Parallel dispatch cap (3) is documented in both SKILL.md and implement.md
- [ ] Scene-setting extension for Wave 2+ is documented

**Manual:**
- [ ] Trace through the spec's T1-T6 example with the new protocol — verify Wave 1 dispatches T1+T2 in parallel, Wave 2 dispatches T3+T4+T5 in parallel, Wave 3 dispatches T6 alone
- [ ] Verify sequential plan produces identical behavior to current SDD (N waves of 1 task each)
- [ ] Verify two-stage review still runs per-task, not per-wave

**Stop here.** Verify Phase 2 before proceeding.

---

## Final Verification

**All automated checks:**
- [ ] `SKILL.md` is valid markdown with no broken formatting
- [ ] `implement.md` is valid markdown with no broken formatting
- [ ] All cross-references between SKILL.md and implement.md are consistent
- [ ] No changes to any files other than `SKILL.md` and `implement.md`

**Manual testing:**
- [ ] Run `--sdd` on a plan with 4+ independent tasks — verify parallel execution in wave logs
- [ ] Run `--sdd` on a fully sequential plan — verify behavior unchanged
- [ ] Verify two-stage review still runs for every task (not just per-wave)
- [ ] Verify file conflict detection moves conflicting tasks to later waves

**Definition of done alignment:**
- [ ] DoD 1: `--sdd` mode analyzes plan tasks and groups them into waves → Phase 1 (Step 1.1)
- [ ] DoD 2: Independent tasks within a wave execute in parallel → Phase 2 (Step 2.1, 2.3)
- [ ] DoD 3: Dependent tasks execute in later waves after dependencies complete → Phase 1 (wave grouping) + Phase 2 (wave execution)
- [ ] DoD 4: File conflict detection prevents two parallel tasks from modifying the same file → Phase 1 (Step 1.1, conflict resolution)
- [ ] DoD 5: Scene-setting for later waves includes all previous wave results → Phase 2 (Step 2.1, wave scene-setting extension)
- [ ] DoD 6: Sequential plans behave identically to current SDD → Phase 1 (fallback) + Phase 2 (sequential fallback)

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `.claude/skills/subagent-driven-development/SKILL.md` | modify | 1, 2 | Add wave analysis section, update orchestration protocol for wave dispatch, update rules |
| `.claude/commands/implement.md` | modify | 1, 2 | Add wave analysis to setup, replace sequential task loop with wave-based loop |

## Risks and Fallbacks

- **Plan tasks may lack explicit file references:** If a task has no "File:" line, it becomes a dependency barrier (sequential). Fallback: the orchestrator logs "Task X has no file references — treated as sequential dependency" and places it in its own wave.
- **Parallel subagents may exceed API rate limits:** Cap at 3 simultaneous dispatches per wave. Fallback: if rate-limited, reduce to 2 and retry.
- **Git commit conflicts from parallel tasks:** Wave analysis prevents this by ensuring no two tasks in the same wave touch the same file. If it still happens (edge case — dynamic file creation), the affected task fails and gets retried in the next wave.
- **Review bottleneck after wave dispatch:** All tasks in a wave dispatch in parallel, but reviews run sequentially after. This is intentional — reviews need specific diffs and spec reviewer context. The speedup comes from parallel implementation, not parallel review.

## References

- Feature spec: `docs/features/2026-04-10-wave-based-parallel-sdd.md`
- SDD skill: `.claude/skills/subagent-driven-development/SKILL.md`
- Implementer prompt: `.claude/skills/subagent-driven-development/implementer-prompt.md`
- Implement command: `.claude/commands/implement.md`
- GSD wave execution: `docs/reviews/2026-04-10-claude-workflow-system.md` (Finding #2)
