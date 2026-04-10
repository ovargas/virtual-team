---
id: FEAT-009
date: 2026-04-10
status: implemented
type: feature
research_level: light
yagni_verdict: build
tags: [flow, orchestration, context, subagent, pipeline, performance]
plan: docs/plans/2026-04-10-fresh-context-pipeline-orchestration.md
---

# Fresh-Context Pipeline Orchestration

> **Value:** Prevents context degradation in long pipelines by dispatching implementation and review steps as fresh-context subagents — the later steps that need the most precision get the cleanest context, and teams running complex features no longer hit quality cliffs at task 5+.

## Problem

The `/flow` pipeline runs all 7 steps (feature → contracts → plan → next → implement → review + validate → pr) in a single session context. By the time `/implement` starts, the context window has already consumed the feature spec discussion, contract extraction, and planning artifacts. For complex features, this means:

1. **Context degradation** — Implementation and review steps get the worst context quality, yet they need the most precision
2. **Quality cliff on large plans** — Teams working on features with 5+ plan tasks observe measurably lower quality in later tasks
3. **No isolation between pipeline phases** — A verbose feature discussion pollutes the implementation context with irrelevant conversation history

All three comparison tools (Superpowers, GSD, SupaConductor) converge on the same architectural solution: fresh context per execution step. GSD sizes each plan to fit a fresh 200k window. Superpowers dispatches fresh subagents per task. SupaConductor runs each evaluate-loop step as a separate agent conversation.

**Trigger:** Tech review (2026-04-10), Finding #1 (Important) + Finding #10 (Informational)
**Current workaround:** Users can manually run `/flow --to=plan` then start a new session for `/flow --from=next`. This works but requires manual session management and knowledge of the `--from` flag.

## YAGNI Assessment

**Verdict:** BUILD IT

Context degradation is observable and measurable — not theoretical. The pattern of dispatching execution steps as subagents is validated by all three comparison tools independently converging on it. The implementation builds on existing infrastructure: `/flow` already has checkpoint files, `--sdd` already dispatches subagents, and the Agent tool already supports parallel invocation. This is wiring existing capabilities into a better architecture.

## Solution

### What we're building

1. **Fresh-context dispatch for `/implement`:** When `/flow` reaches the implementation step, it dispatches `/implement` as a subagent with only the plan, contracts, relevant decisions, and domain skills — not the full conversation history from feature/contracts/plan phases.
2. **Fresh-context dispatch for `/review` + `/validate`:** Both quality gate commands run as parallel subagents with fresh context, receiving only the git diff, feature spec, and plan as input.
3. **Context budget estimation:** Before each phase, estimate context needed (plan phase size + skill size + code files). If it exceeds a threshold, auto-dispatch as subagent instead of inline execution.
4. **Seamless checkpoint integration:** Subagent results feed back into the flow checkpoint, so `--resume` works regardless of whether a step ran inline or as a subagent.

### How it works

The `/flow` command splits into two execution modes based on pipeline phase:

**Interactive phases (run inline in main session):**
- `/feature` — benefits from conversation with the user
- `/contracts` — needs user input for payload decisions
- `/plan` — needs user approval

**Execution phases (dispatched as fresh-context subagents):**
- `/implement` — receives: plan file, contracts dir, stack.md, domain skills, backlog state
- `/review` — receives: git diff, feature spec, plan, established patterns
- `/validate` — receives: feature spec, git diff, plan

```
Main session (interactive)          Subagents (fresh context)
┌─────────────────────────┐
│ /feature (discussion)   │
│ /contracts (decisions)  │
│ /plan (approval)        │
│ /next (lock + branch)   │
└───────────┬─────────────┘
            │ dispatch with plan + contracts + decisions only
            ▼
        ┌───────────────────┐
        │ /implement        │  ← fresh 200k context
        │ (full plan exec)  │
        └───────┬───────────┘
                │ results back to main session
                ▼
        ┌───────────────────┐  ┌───────────────────┐
        │ /review           │  │ /validate          │  ← parallel, fresh
        └───────┬───────────┘  └───────┬───────────┘
                │ combined results     │
                ▼                      ▼
┌─────────────────────────┐
│ Gate decision + /pr     │  ← back in main session
└─────────────────────────┘
```

### Context budget heuristic

Before dispatching inline vs. subagent, estimate context consumption:
- Plan phase text: ~500-2000 tokens per phase
- Each skill loaded: ~1000-3000 tokens
- Each code file read: ~200-1000 tokens
- Accumulated conversation: tracked by checkpoint

**Threshold:** If estimated context for remaining work exceeds 60% of window, dispatch as subagent. Below that, inline is fine (simpler, faster for small features).

This means small features (2-3 tasks, 1 plan phase) may run entirely inline — no subagent overhead. Complex features (5+ tasks, multiple phases) automatically get fresh context where it matters.

## Boundaries

### Explicitly NOT building
- A separate orchestrator agent definition — `/flow` remains a command, it just dispatches smarter
- Changes to how `/implement --sdd` works internally — that's FEAT-010 (wave parallelization)
- Automatic session splitting — the user still runs one `/flow` command, the dispatch is transparent

### Rabbit holes to avoid
- Over-engineering the context budget — a simple token estimate heuristic is sufficient, not a precise context analyzer
- Trying to pass "conversation summary" to subagents — just pass the artifacts (plan, contracts, spec). The artifacts ARE the summary.

## Definition of Done

**The feature is complete when:**

1. `/flow` dispatches `/implement` as a subagent when context budget suggests it (complex features), and runs inline when context is fresh (simple features)
2. `/review` and `/validate` run as parallel fresh-context subagents during the quality gate
3. Subagent results integrate seamlessly with flow checkpoints — `--resume` works correctly after subagent execution
4. A complex feature (5+ plan tasks) produces the same or better quality in later tasks compared to earlier tasks

**Verification:**

Automated:
- [ ] Flow checkpoint correctly records subagent-executed steps
- [ ] `--resume` works after a subagent-executed `/implement` step

Manual:
- [ ] Run `/flow` on a complex feature — verify later plan tasks don't show context degradation
- [ ] Run `/flow` on a simple feature — verify it runs inline without subagent overhead

## Success Metrics

**Leading (immediate):**
- Implementation quality on tasks 5+ of a plan is comparable to tasks 1-2 (no observable degradation)
- `/flow --auto` can complete a 7+ task feature without human intervention at the implementation step

**Lagging (2-4 weeks):**
- Fewer review findings in later plan tasks compared to current baseline
- Team members report consistent quality regardless of feature complexity

**Failure signal:**
- Subagent dispatch adds >30 seconds overhead per step without measurable quality improvement on features with <4 tasks

## Implementation Hints

### Existing patterns to follow
- `.claude/skills/subagent-driven-development/SKILL.md` — subagent dispatch protocol with scene-setting context
- `.claude/commands/flow.md:62-92` — existing checkpoint integration
- `.claude/commands/implement.md:21-26` — existing `--sdd` flag that already dispatches subagents

### Integration points
- `flow.md` — main orchestration logic, needs dispatch-vs-inline decision
- `checkpoints` skill — needs to handle subagent-reported completions
- Agent tool — used for dispatch with `run_in_background` for parallel review+validate

### API Contracts

No API contracts — this feature is internal workflow orchestration.

### Technical risks
- Subagent may not have enough context if artifact passing is too aggressive in trimming — mitigation: always pass full plan file, full contracts, full spec (these are the authoritative artifacts)
- Checkpoint state may get out of sync between main session and subagent — mitigation: subagent writes its own checkpoint, main session reads it on return

## Research Summary

Research: Light — follows established patterns from Superpowers SDD, GSD wave execution, and SupaConductor evaluate-loop. All three validate the "fresh context per execution step" pattern. See `docs/reviews/2026-04-10-claude-workflow-system.md` for detailed comparison.

## Stories

**Group 1: Core dispatch mechanism** (sequential, single branch)

1. **S-004: Add subagent dispatch for `/implement` in `/flow`** — After this, `/flow` dispatches implementation as a fresh-context subagent for complex features, with plan + contracts + decisions as input. Simple features still run inline.
   Layers: flow.md command logic + checkpoint integration
   Acceptance: `/flow` on a 5+ task feature dispatches `/implement` as subagent; checkpoint records the subagent step correctly
   Demo: Run `/flow` on a complex feature, observe fresh-context dispatch in logs

2. **S-005: Add parallel subagent dispatch for review + validate gate** — After this, the quality gate runs `/review` and `/validate` as parallel fresh-context subagents, with results feeding back to the flow gate decision.
   Layers: flow.md gate logic + Agent tool parallel invocation
   Acceptance: Both commands run in parallel as subagents; gate decision uses combined results; `--resume` works if interrupted between review and pr
   Demo: Run `/flow` through quality gate, observe parallel subagent execution

3. **S-006: Add context budget heuristic** — After this, `/flow` automatically decides inline vs. subagent based on estimated context consumption. Small features run inline, complex features get fresh context.
   Layers: flow.md decision logic
   Acceptance: 2-3 task features run inline; 5+ task features dispatch subagents; threshold is configurable via a simple constant in flow.md
   Demo: Run `/flow` on both a small and large feature, observe different execution modes

## References

- Tech review: `docs/reviews/2026-04-10-claude-workflow-system.md` (Findings #1, #10)
- Comparison tools: Superpowers (SDD), GSD (fresh context per plan), SupaConductor (evaluate-loop)
- Existing features: `docs/features/2026-04-09-subagent-driven-development.md` (FEAT-003)

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Tech review finding #1 (Important): Missing orchestrator agent for /flow + Finding #10 (Informational): GSD's context size management"
