---
id: FEAT-010
date: 2026-04-10
status: implemented
type: feature
research_level: light
yagni_verdict: build
tags: [sdd, parallelization, waves, dependency-graph, performance, implement]
plan: docs/plans/2026-04-10-wave-based-parallel-sdd.md
---

# Wave-Based Parallel SDD

> **Value:** Reduces implementation time by 30-50% for features with 4+ independent tasks by running non-conflicting subagents in parallel waves — turning a 45-minute sequential build into a 20-minute parallel one, which directly impacts team throughput.

## Problem

The `--sdd` mode in `/implement` dispatches one subagent per task, but tasks execute sequentially: dispatch task 1 → spec review → quality review → dispatch task 2 → ... For a plan with 8 tasks where 4 are independent (e.g., separate API endpoints with no shared dependencies), this means waiting for each task to complete before starting the next — even when they could safely run in parallel.

GSD solves this with "wave execution": plans are grouped into waves based on a dependency graph, and all tasks within a wave run simultaneously. SupaConductor uses a similar `parallel-dispatcher` + `task-worker` pattern with file-level locking to prevent conflicts.

**Trigger:** Tech review (2026-04-10), Finding #2 (Important)
**Current workaround:** None. `--sdd` is always sequential. The only parallelization in the current system is `/review` + `/validate` running simultaneously in the quality gate.

## YAGNI Assessment

**Verdict:** BUILD IT

This is a pure performance improvement with no downside. Sequential execution remains the fallback for plans where all tasks are dependent. The dependency graph analysis adds minimal complexity — it's a straightforward check of "which files does task N create/modify that task M reads." Teams working on complex features will see immediate time savings. The implementation builds on existing SDD infrastructure and the Agent tool's native parallel invocation support.

## Solution

### What we're building

1. **Dependency graph builder:** After extracting all tasks from the plan, analyze file references to build a directed acyclic graph (DAG) of task dependencies.
2. **Wave grouping:** Topologically sort the DAG into waves. Wave 1 = tasks with no dependencies. Wave 2 = tasks depending only on Wave 1 tasks. Etc.
3. **Parallel dispatch within waves:** Within each wave, dispatch all tasks simultaneously using the Agent tool's parallel invocation.
4. **File conflict detection:** If two tasks in the same wave modify the same file, move one to the next wave (prevent merge conflicts).
5. **Sequential fallback:** If the dependency graph shows all tasks are sequential (each depends on the previous), behavior is identical to current SDD.

### How it works

**Step 1: Extract tasks and analyze dependencies**

For each task in the plan, extract:
- Files it creates (new files)
- Files it modifies (existing files)
- Files it reads (imports, references)

Build dependency edges: Task B depends on Task A if B reads/modifies a file that A creates/modifies.

**Step 2: Group into waves**

```
Plan tasks: [T1, T2, T3, T4, T5, T6]

T1: Creates user model       T2: Creates product model
T3: Creates user API (needs T1)   T4: Creates product API (needs T2)
T5: Creates cart (needs T1, T2)   T6: Creates checkout (needs T3, T4, T5)

Dependency graph:
T1 → T3, T5
T2 → T4, T5
T3 → T6
T4 → T6
T5 → T6

Waves:
  Wave 1: [T1, T2]     ← parallel (independent)
  Wave 2: [T3, T4, T5] ← parallel (T3 needs T1 done, T4 needs T2 done, T5 needs both)
  Wave 3: [T6]         ← sequential (needs everything)

Sequential time: 6 tasks
Parallel time: 3 waves (2x speedup)
```

**Step 3: Execute waves**

```
Wave 1 ──┬── Subagent: T1 (user model)
          └── Subagent: T2 (product model)
          │   wait for all...
          ▼
Wave 2 ──┬── Subagent: T3 (user API)
          ├── Subagent: T4 (product API)
          └── Subagent: T5 (cart)
          │   wait for all...
          ▼
Wave 3 ──── Subagent: T6 (checkout)
```

Each subagent still gets the full SDD treatment: implementer → spec review → quality review. The two-stage review happens per-task, not per-wave.

**Step 4: Scene-setting context for later waves**

Subagents in Wave 2+ receive additional context:
- Which tasks completed in previous waves
- Files created/modified by previous waves
- Any issues found during previous wave reviews

This is the existing SDD scene-setting pattern, extended to handle parallel completions.

### File conflict resolution

If the dependency analysis shows two tasks in the same wave both modify the same file:
1. Move one task to the next wave (prefer moving the task with fewer other dependencies)
2. Log the conflict: "T3 and T5 both modify `routes/index.ts` — T5 moved to Wave 3"

This is conservative — it prevents merge conflicts at the cost of slightly less parallelism.

## Boundaries

### Explicitly NOT building
- Automatic merge conflict resolution — if parallel tasks accidentally conflict, the wave stops and reports the error
- Changes to how individual tasks are reviewed — the two-stage review (spec + quality) remains unchanged
- Parallel execution outside SDD mode — inline `/implement` (without `--sdd`) stays sequential
- Cross-worktree parallelism — all tasks still run in the same worktree/branch

### Rabbit holes to avoid
- Overly sophisticated dependency analysis — static file reference analysis is sufficient; no need for AST-level import tracing
- Trying to merge subagent outputs automatically — each subagent commits its own changes; git handles the ordering
- Dynamic wave rebalancing — if a task in Wave 1 finishes early, don't start Wave 2 tasks early. Wait for the full wave. Simplicity over marginal speedup.

## Definition of Done

**The feature is complete when:**

1. `--sdd` mode analyzes plan tasks and groups them into waves based on file dependencies
2. Independent tasks within a wave execute in parallel using the Agent tool's parallel invocation
3. Dependent tasks execute in later waves after their dependencies complete
4. File conflict detection prevents two parallel tasks from modifying the same file
5. Scene-setting context for later waves includes results from all previous waves
6. Sequential plans (all tasks dependent) behave identically to current SDD

**Verification:**

Automated:
- [ ] Dependency graph correctly identifies independent tasks from plan file references
- [ ] Parallel dispatch sends multiple Agent tool calls in a single response
- [ ] File conflict detection moves conflicting tasks to later waves

Manual:
- [ ] Run `--sdd` on a plan with 4+ independent tasks — verify parallel execution in wave logs
- [ ] Run `--sdd` on a fully sequential plan — verify behavior unchanged
- [ ] Verify two-stage review still runs for every task (not just per-wave)

## Success Metrics

**Leading (immediate):**
- Implementation time for a 6-task plan with 3 independent pairs: ~50% reduction compared to sequential SDD
- Wave grouping is logged and visible to the user before execution starts

**Lagging (2-4 weeks):**
- Team adoption of `--sdd` increases (parallelization makes it worth the subagent overhead for more plan sizes)
- Average feature implementation time decreases for plans with 4+ tasks

**Failure signal:**
- Parallel subagents produce merge conflicts more than 10% of the time (dependency analysis too loose)
- Wave overhead (analysis + coordination) adds >15 seconds for plans where all tasks are sequential

## Implementation Hints

### Existing patterns to follow
- `.claude/skills/subagent-driven-development/SKILL.md` — existing SDD orchestration protocol
- `.claude/skills/subagent-driven-development/implementer-prompt.md` — subagent prompt template with scene-setting
- Agent tool parallel invocation — multiple Agent calls in a single response

### Integration points
- `subagent-driven-development` skill — needs wave grouping logic added to orchestration protocol
- `implement.md` — needs to call wave grouper before dispatching tasks
- Plan file format — task file references become input to dependency analysis

### API Contracts

No API contracts — this feature is internal workflow orchestration.

### Technical risks
- Plan tasks may not have explicit file references — mitigation: fall back to sequential for tasks with unclear dependencies (conservative default)
- Parallel subagents may exhaust API rate limits — mitigation: cap max parallel subagents (e.g., 3 simultaneous) as a configurable constant
- Git commit ordering from parallel tasks — mitigation: each subagent commits independently; wave completion triggers a verification that all commits are clean

## Research Summary

Research: Light. GSD's wave execution (parallel plans within dependency waves) and SupaConductor's `parallel-dispatcher` + `task-worker` pattern both validate this approach. See `docs/reviews/2026-04-10-claude-workflow-system.md`, Finding #2.

## Stories

**Group 1: Wave execution engine** (sequential, single branch)

1. **S-007: Build dependency graph from plan task file references** — After this, the SDD orchestrator can analyze a plan and produce a DAG of task dependencies based on which files each task creates, modifies, and reads.
   Layers: subagent-driven-development skill logic
   Acceptance: Given a plan with explicit file references, produces correct dependency edges; tasks with no file overlap are marked independent
   Demo: Show the dependency graph output for a sample plan

2. **S-008: Group tasks into waves and dispatch in parallel** — After this, independent tasks run simultaneously within each wave, with sequential execution between waves. Scene-setting context for later waves includes previous wave results.
   Layers: subagent-driven-development skill + implement.md orchestration
   Acceptance: Wave 1 tasks dispatch in parallel; Wave 2 waits for Wave 1; file conflicts move tasks to later waves; two-stage review runs per-task
   Demo: Run `--sdd` on a plan with independent tasks, observe parallel execution and wave boundaries

## References

- Tech review: `docs/reviews/2026-04-10-claude-workflow-system.md` (Finding #2)
- Comparison: GSD wave execution, SupaConductor parallel-dispatcher
- Existing feature: `docs/features/2026-04-09-subagent-driven-development.md` (FEAT-003)

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Tech review finding #2 (Important): No wave-based parallelization during implementation"
