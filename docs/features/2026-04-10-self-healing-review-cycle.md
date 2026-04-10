---
id: FEAT-012
date: 2026-04-10
status: done
plan: docs/plans/2026-04-10-self-healing-review-cycle.md
type: feature
research_level: light
yagni_verdict: build
tags: [review, auto-fix, quality-gate, evaluators, flow, autonomy]
---

# Self-Healing Review Cycle

> **Value:** Makes the quality gate truly autonomous by auto-generating fix tasks from review findings and re-running the review cycle — the `/flow --auto` pipeline can complete without human intervention for fixable issues, while still halting on architectural concerns that need human judgment.

## Problem

When `/review` finds "Must Fix" issues during the quality gate, the pipeline halts and waits for human intervention. The user must read the findings, mentally map them to code changes, implement fixes, and re-trigger the review. This creates two problems:

1. **`--auto` mode isn't truly autonomous:** The whole point of `--auto` is "only stop on hard failures." But every Must Fix finding stops the pipeline, even when the fix is mechanical (missing error handling, incorrect status code, unhandled edge case).
2. **Monolithic review misses domain-specific issues:** A single `/review` command context-switches between UI patterns, security, business logic, and code quality. Specialized evaluators (like SupaConductor's 4 evaluators) catch more issues by focusing on one dimension each.

SupaConductor's evaluate-loop automatically generates fix tasks from evaluation findings and re-executes them (up to 5 fix cycles, up to 3 plan revisions). This makes their quality gate self-healing for mechanical issues while still escalating architectural concerns.

**Trigger:** Tech review (2026-04-10), Finding #6 (Nice to Have) + Finding #7 (Nice to Have)
**Current workaround:** User manually reads review findings, implements fixes, and re-runs `/review`. This works but breaks the autonomous flow and requires the user to be present for the entire quality gate.

## YAGNI Assessment

**Verdict:** BUILD IT

This is the missing piece for `--auto` mode autonomy. Without it, `/flow --auto` promises hands-off execution but delivers "hands-off until the review step, then hands-on again." The fix generation is straightforward — Must Fix findings already contain the issue description, location, and suggested action. Converting those into actionable fix tasks is a natural extension of the existing review output format. The specialized evaluator aspect leverages existing agents (`security-reviewer`, `pattern-finder`) that are already defined but only activated with `--deep`.

## Solution

### What we're building

1. **Auto-fix cycle in the quality gate:** When `/review` returns Must Fix issues, auto-generate a mini fix plan (one task per Must Fix), execute the fixes, and re-run `/review`. Max 3 iterations, then escalate to human.
2. **Specialized review dispatch:** `/review` dispatches domain-appropriate review agents in parallel instead of doing everything in one pass. The existing `security-reviewer` and `pattern-finder` agents are already defined — they just need to be wired into the default review flow.
3. **Escalation logic:** Distinguish between mechanical fixes (auto-fixable) and architectural concerns (require human judgment). Auto-fix only applies to mechanical issues.

### How it works

**Auto-fix cycle:**

```
/implement completes
        │
        ▼
┌───────────────────────┐
│ /review (specialized) │ ◄──────────────────┐
│ + /validate (parallel)│                     │
└───────────┬───────────┘                     │
            │                                 │
    ┌───────▼───────┐                         │
    │ Gate decision  │                         │
    └───┬───────┬───┘                         │
        │       │                             │
   All pass  Must Fix found                   │
        │       │                             │
        ▼       ▼                             │
    /pr    ┌────────────────┐                 │
           │ Classify issues │                 │
           └──┬──────────┬──┘                 │
              │          │                    │
         Mechanical  Architectural            │
              │          │                    │
              ▼          ▼                    │
        ┌──────────┐  HALT for               │
        │ Generate  │  human input            │
        │ fix tasks │                         │
        └─────┬────┘                          │
              │                               │
              ▼                               │
        ┌──────────┐                          │
        │ Execute   │  (iteration N of 3)     │
        │ fixes     │                         │
        └─────┬────┘                          │
              │                               │
              └───────────────────────────────┘
                    re-review (max 3 iterations)
```

**Issue classification:**

| Category | Auto-fixable? | Examples |
|----------|:------------:|---------|
| Missing error handling | Yes | Unhandled error case, missing validation |
| Incorrect status codes | Yes | Returns 200 instead of 201 on creation |
| Missing test coverage | Yes | Acceptance criteria not tested |
| Naming/pattern inconsistency | Yes | Doesn't follow established convention |
| Security vulnerability | Depends | SQL injection: yes. Auth architecture: no. |
| Architectural concern | No | Wrong abstraction, coupling issue |
| Performance concern | No | Algorithm choice, caching strategy |
| Scope deviation | No | Feature does more/less than spec says |

**Mechanical fixes** are auto-generated as mini tasks and executed. **Architectural concerns** halt the pipeline with a clear explanation of why human input is needed.

**Specialized review dispatch:**

Instead of one monolithic review, dispatch parallel review passes:

```
/review ──┬── Code quality pass (patterns, naming, structure)
           ├── Security pass (existing security-reviewer agent)
           └── Domain pass (loads relevant domain skill — api-design, data-layer, etc.)

/validate ── Spec compliance pass (already separate)
```

Each pass focuses on one dimension and produces findings in the standard Must Fix / Should Fix / Nit format. Findings are merged and deduplicated before the gate decision.

The security-reviewer and pattern-finder agents already exist in `.claude/agents/`. This feature wires them into the default review flow instead of requiring `--deep`.

### Iteration limits

- **Fix cycle:** Max 3 iterations. If Must Fix issues remain after 3 fix attempts, escalate to human with: "Auto-fix attempted 3 times but these issues persist: [list]. These likely need a design change, not a mechanical fix."
- **This prevents infinite loops** where the fix introduces new issues that get fixed and introduce more issues.

## Boundaries

### Explicitly NOT building
- Automatic architectural fixes — only mechanical issues are auto-fixed
- Changes to how `/validate` works — it continues to check spec alignment independently
- New review methodology — the review criteria (Must Fix / Should Fix / Nit) don't change
- Auto-fix for Should Fix or Nit issues — only Must Fix triggers the auto-fix cycle

### Rabbit holes to avoid
- Trying to auto-fix architectural concerns — these require understanding trade-offs that need human judgment
- Complex issue classification ML — a simple rule-based classifier (based on finding category) is sufficient
- Attempting to fix issues the review can't precisely locate — if the finding doesn't have a file:line reference, it's not auto-fixable

## Definition of Done

**The feature is complete when:**

1. `/review` dispatches specialized review agents (code quality + security + domain) in parallel
2. Must Fix findings are classified as mechanical or architectural
3. Mechanical Must Fix issues auto-generate fix tasks and execute them
4. The review re-runs after fixes (max 3 iterations, then escalate)
5. Architectural concerns halt the pipeline with clear explanation
6. `/flow --auto` can complete the quality gate without human intervention for features with only mechanical issues
7. Review findings from all specialized passes are merged and deduplicated

**Verification:**

Automated:
- [ ] Specialized review agents dispatch in parallel (security-reviewer + pattern-finder + domain)
- [ ] Auto-fix generates correct fix tasks from Must Fix findings with file:line references
- [ ] Iteration counter stops at 3 and escalates

Manual:
- [ ] Run `/flow --auto` on a feature that produces mechanical Must Fix issues — verify auto-fix resolves them
- [ ] Run `/flow --auto` on a feature with an architectural concern — verify it halts and explains why
- [ ] Verify no infinite loops when a fix introduces a new issue

## Success Metrics

**Leading (immediate):**
- `/flow --auto` completes the quality gate without human intervention for 70%+ of features with Must Fix issues
- Specialized review dispatch catches issues that the monolithic review missed (compare finding counts)

**Lagging (2-4 weeks):**
- Reduction in PR review comments (issues caught before PR creation)
- Team confidence in `--auto` mode increases (fewer "auto mode stopped at review" interruptions)

**Failure signal:**
- Auto-fix introduces more issues than it resolves (fix quality too low)
- Iteration limit hit frequently (>30% of features) — suggests review findings aren't actionable enough

## Implementation Hints

### Existing patterns to follow
- `.claude/agents/security-reviewer.md` — existing agent, needs wiring into default review
- `.claude/agents/pattern-finder.md` — existing agent, needs wiring into default review
- `.claude/commands/review.md` — current monolithic review, add parallel dispatch
- `.claude/commands/flow.md:100+` — existing gate logic (patch-and-continue vs. pause-for-decision) maps to mechanical vs. architectural

### Integration points
- `review.md` — add specialized dispatch + findings merge
- `flow.md` — add auto-fix cycle in quality gate
- `implement.md` — auto-fix tasks execute using existing implementation logic
- Existing agents (`security-reviewer`, `pattern-finder`) — wired into default flow

### API Contracts

No API contracts — this feature is internal workflow quality automation.

### Technical risks
- Auto-fix may introduce regressions — mitigation: run full test suite after each fix iteration, not just targeted tests
- Specialized reviewers may produce duplicate findings — mitigation: merge step deduplicates by file:line + issue description
- Issue classification may misclassify architectural issues as mechanical — mitigation: conservative default (if uncertain, classify as architectural and halt)

## Research Summary

Research: Light. SupaConductor's evaluate-loop (up to 5 fix cycles, up to 3 plan revisions) validates the auto-fix pattern. Their 4 specialized evaluators (UI/UX, code quality, integration, business logic) validate the parallel review approach. See `docs/reviews/2026-04-10-claude-workflow-system.md`, Findings #6, #7.

## Stories

**Group 1: Self-healing review** (sequential, single branch)

1. **S-011: Add specialized parallel review dispatch** — After this, `/review` dispatches security-reviewer + pattern-finder + domain-specific agents in parallel, merging their findings into a unified report.
   Layers: review.md command logic + agent dispatch + findings merge
   Acceptance: Three review passes run in parallel; findings are merged and deduplicated; the unified report maintains Must Fix / Should Fix / Nit categories
   Demo: Run `/review` and show parallel dispatch + merged findings from multiple reviewers

2. **S-012: Add auto-fix cycle to quality gate** — After this, mechanical Must Fix issues auto-generate fix tasks, execute them, and re-run the review (max 3 iterations). Architectural concerns halt for human input.
   Layers: flow.md gate logic + issue classification + fix task generation + iteration control
   Acceptance: Mechanical issues auto-fix and re-review succeeds; architectural issues halt pipeline; iteration limit of 3 is enforced
   Demo: Run `/flow --auto` on a feature with mechanical Must Fix issues, observe auto-fix cycle completing without human intervention

## References

- Tech review: `docs/reviews/2026-04-10-claude-workflow-system.md` (Findings #6, #7)
- Comparison: SupaConductor evaluate-loop (5 fix cycles), SupaConductor 4 specialized evaluators
- Existing agents: `.claude/agents/security-reviewer.md`, `.claude/agents/pattern-finder.md`
- Existing feature: `docs/features/2026-04-09-flow-quality-gates.md` (FEAT-006)

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Tech review findings #6 (Nice to Have): Review findings don't auto-generate fix tasks + #7 (Nice to Have): No evaluator specialization"
