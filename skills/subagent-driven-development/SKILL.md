---
name: subagent-driven-development
description: Use when /implement --sdd is active — defines orchestration protocol for fresh subagent per task with two-stage review
---

# Subagent-Driven Development

## Overview

The orchestrator dispatches, never implements. Fresh subagent per task. Two-stage review, every task.

When `/virtual-team:implement --sdd` is active, the main session becomes an **orchestrator** that never writes code itself. It dispatches implementer subagents, manages review cycles, and tracks progress.

**Use SDD when:** Plans with 5+ tasks, multi-file implementations, complex features.
**Don't use SDD when:** Small plans (< 3 tasks), quick fixes, single-file changes. Use inline `/virtual-team:implement` instead.

## Wave Analysis

Run wave analysis BEFORE entering the task dispatch loop. This groups tasks into parallel waves based on file dependencies. The analysis is always run when SDD is active — the fallback (all tasks in one wave = sequential) is identical to current behavior.

### 1. File Reference Extraction

For each task/step in the plan, identify:

- **Creates:** Files listed with `(create)` or `[create]` in the step's "File:" line
- **Modifies:** Files listed with `(modify)` or `[modify]` in the step's "File:" line
- **Reads/references:** Files mentioned in "Pattern:" lines or "Follow `file:line`" references

If a step has no explicit "File:" line, treat it as modifying unknown files — it becomes a **dependency barrier** (must run after everything before it, and everything after it depends on it).

### 2. Dependency Edge Rules

- Task B **depends on** Task A if: B reads or modifies a file that A creates or modifies
- **Read-read is NOT a dependency** — two tasks reading the same file can run in parallel
- **Create-create on the same file is a CONFLICT** — same file created twice, move one to the next wave
- **Modify-modify on the same file is a CONFLICT** — same file modified by two parallel tasks, move one to the next wave

### 3. Wave Grouping Algorithm

1. Build dependency edges from the file references
2. Topologically sort into waves:
   - **Wave 1:** tasks with no incoming dependency edges
   - **Wave 2:** tasks whose dependencies are ALL in Wave 1
   - **Wave N:** tasks whose dependencies are ALL in Waves 1 through N-1
3. **File conflict resolution:** If two tasks in the same wave both create or modify the same file, move the task with fewer other dependents to the next wave. Log: "T3 and T5 both modify `file.ext` — T5 moved to Wave N+1"
4. **Fallback:** If all tasks are sequentially dependent (each depends on the previous), produce N waves of 1 task each — behavior is identical to current sequential SDD

### 4. Presentation

Present the wave grouping to the user before dispatching:

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

## Orchestration Protocol

### For each wave (from wave analysis):

**Within a wave — dispatch all tasks in parallel:**

For each task in the current wave, simultaneously execute steps 1-4 using multiple Agent tool calls in a single message:

#### 1. Extract Task

Pull full task text from the plan. Include the step description, file references, pattern references, and what-to-do instructions. **Never tell the subagent to "read the plan file"** — provide everything it needs in the prompt.

#### 2. Build Scene-Setting Context

Every subagent starts fresh. It has no memory of previous tasks. Provide:
- Tasks completed so far and their outcomes (all previous waves)
- Files created or modified by previous waves
- Verification results from previous waves
- Where this task fits in the overall plan

For tasks in Wave 2+, the `{scene_setting}` in the implementer prompt should include:
```
**Previously completed (Waves 1-N):**
- Wave 1: [task names] — files created/modified: [list]
- Wave 2: [task names] — files created/modified: [list]
- All previous wave tasks passed spec and quality reviews.
- [Any issues found and resolved during reviews]
```

#### 3. Select Model

Use the model selection table below. When in doubt, use Sonnet.

#### 4. Dispatch Implementer Subagent

Use the implementer prompt template from `implementer-prompt.md`. Fill in:
- `{scene_setting}` — context from step 2
- `{task_text}` — full task text from step 1
- `{domain_skill_instruction}` — the relevant Layer 1 domain skill for this task

All implementers in the wave run simultaneously. Wait for all to return.

**Parallel dispatch cap:** Maximum 3 simultaneous implementer subagents per wave. If a wave has more than 3 tasks, split into sub-waves of 3.

**After all implementers in the wave return:**

For each task in the wave (sequentially — reviews don't parallelize across tasks):

#### 5. Handle Implementer Status

- **DONE** → Proceed to spec review (step 6)
- **DONE_WITH_CONCERNS** → Read concerns. If they're minor, proceed to review. If they indicate a problem, address before reviewing.
- **NEEDS_CONTEXT** → Provide the missing context and re-dispatch the implementer.
- **BLOCKED** → Assess root cause:
  - Context problem → Re-dispatch with more context
  - Reasoning problem → Upgrade model (e.g., Sonnet → Opus) and re-dispatch
  - Plan problem → Escalate to founder (stop and report)

#### 6. Dispatch Spec Reviewer

Use the spec reviewer prompt template from `spec-reviewer-prompt.md`. Fill in:
- `{acceptance_criteria}` — from the feature spec for this task
- `{git_diff_or_sha_range}` — the changes from the implementer

#### 7. Handle Spec Review Result

- **APPROVED** → Proceed to code quality review (step 8)
- **ISSUES** → Dispatch implementer to fix → Spec reviewer re-reviews → Loop (max 3 iterations). After 3 failed iterations, escalate to founder.

#### 8. Dispatch Code Quality Reviewer

Use the code quality reviewer prompt template from `code-quality-reviewer-prompt.md`. Fill in:
- `{plan_requirements}` — what this task was supposed to do
- `{git_diff_or_sha_range}` — the changes (including any fixes from spec review)

#### 9. Handle Quality Review Result

- **APPROVED** → Mark task complete (step 10)
- **ISSUES (Critical or Important)** → Dispatch implementer to fix → Quality reviewer re-reviews → Loop (max 3 iterations). Minor issues are logged but don't block.

#### 10. Mark Task Complete

Log the outcome.

**After all tasks in the wave are reviewed and complete:**

Build cumulative scene-setting context including ALL tasks from this wave and all previous waves. Proceed to the next wave.

**After all waves:** Dispatch a final holistic code review across the entire implementation (all tasks combined). Then proceed to the standard `/virtual-team:implement` completion flow (verification, DoD alignment, backlog updates).

## Key Rules

- **Never dispatch multiple implementers for the SAME file in parallel** — Wave analysis ensures tasks in the same wave don't share files. Within a wave, parallel dispatch is safe. Across waves, sequential execution prevents conflicts.
- **Cap parallel dispatch at 3 subagents per wave** — prevents API rate limit issues. Split larger waves into sub-waves of 3.
- **Never skip reviews** — Both spec compliance AND code quality, every task
- **Spec review BEFORE code quality review** — Wrong order wastes quality reviewer time on code that doesn't meet spec
- **Never let implementer read the plan file** — Provide full task text directly
- **Provide scene-setting context** — Every subagent starts fresh, needs orientation
- **Cap review loops at 3 iterations** — Escalate to founder after that
- **Implementer subagents load Layer 0 skills** — TDD, verification, review reception

## Model Selection

| Task Type | Signals | Model |
|-----------|---------|-------|
| Mechanical implementation | 1-2 files, clear spec, follows existing pattern | Haiku or Sonnet |
| Integration work | Multi-file changes, coordination between components | Sonnet |
| Architecture/design | New patterns, judgment calls, broad codebase impact | Opus |
| Spec review | Comparison task, structured checklist | Sonnet |
| Code quality review | Pattern matching, security awareness | Sonnet |

When in doubt, use Sonnet — it's the safe middle ground.

## Integration

This skill is loaded by:
- `/virtual-team:implement` — When `--sdd` flag is active, defines the execution model
- `/virtual-team:flow` — Passes `--sdd` to `/virtual-team:implement` when `--deep` is used
