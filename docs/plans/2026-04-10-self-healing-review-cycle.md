---
date: 2026-04-10
feature: FEAT-012
spec: docs/features/2026-04-10-self-healing-review-cycle.md
status: approved
---

# Implementation Plan: Self-Healing Review Cycle

## Overview

We're adding two capabilities to the review pipeline: (1) specialized parallel review dispatch — `/review` always runs 3 focused passes (code quality, security, domain) instead of one monolithic pass, and (2) an auto-fix cycle in `/flow`'s quality gate that classifies Must Fix findings as mechanical or architectural, auto-fixes the mechanical ones, and re-reviews up to 3 iterations. Phase 1 (S-011) modifies `review.md`, Phase 2 (S-012) modifies `flow.md`.

## Reference Implementation

The closest existing patterns are:
- `.claude/commands/review.md:44-49` — existing `--deep` agent dispatch pattern (security-reviewer + pattern-finder)
- `.claude/commands/flow.md:210-260` — existing quality gate logic with halt conditions
- `.claude/commands/flow.md:333-351` — parallel review+validate dispatch pattern

This plan extends the dispatch pattern to be default (not `--deep`-only) and adds an auto-fix loop around the gate halt.

## Pre-conditions

Before starting implementation:
- [x] Feature spec is approved: `docs/features/2026-04-10-self-healing-review-cycle.md`
- [x] Existing agents verified: `.claude/agents/security-reviewer.md`, `.claude/agents/pattern-finder.md`
- [x] Quality gate logic exists in `flow.md` (FEAT-006 already implemented)

---

## Phase 1: Specialized Parallel Review Dispatch (S-011)

### Overview
After this phase, `/review` dispatches 3 parallel review passes and merges their findings into a unified report. The `--deep` flag is removed — specialized dispatch is now the default behavior.

**After this phase:** Running `/review` produces a unified report from code quality + security + domain passes instead of one general-purpose pass.

### Step 1.1: Restructure review.md Step 2 — always dispatch 3 parallel passes
**File:** `.claude/commands/review.md` (modify, lines 41-49)
**Pattern:** Follow existing `--deep` dispatch at `review.md:44-49`

**What to do:**
Replace the current Step 2 (Pattern and Security Analysis) which has two modes (default=inline, `--deep`=agents) with a single Step 2 that ALWAYS dispatches 3 parallel review passes:

1. **Code quality pass** — patterns, naming, structure, DRY. Spawn `pattern-finder` agent (`.claude/agents/pattern-finder.md`). Model: sonnet.
2. **Security pass** — vulnerabilities, auth, input validation. Spawn `security-reviewer` agent (`.claude/agents/security-reviewer.md`). Model: sonnet.
3. **Domain pass** — loads the relevant domain skill (api-design, data-layer, ui-design, service-layer) based on changed file paths. Runs inline (not a separate agent).

Domain detection rules:
- routes/handlers/endpoints → api-design
- models/migrations/schemas → data-layer
- components/pages/styles → ui-design
- services/business logic → service-layer
- If multiple domains: load the primary (most files changed), note secondary domains

Remove the `--deep` flag from the Invocation section since specialized dispatch is now default.

### Step 1.2: Add findings merge logic (new Step 3)
**File:** `.claude/commands/review.md` (modify, insert between new Step 2 and current Step 3)

**What to do:**
Add a new Step 3 "Merge Findings" that combines results from all 3 passes:

1. Collect findings from all 3 passes
2. Map agent output formats to the review categories:
   - `security-reviewer`: Critical → Must Fix, Warning → Should Fix, Note → Nit
   - `pattern-finder`: Pattern violations → Should Fix, adaptation notes → Nit
   - Domain pass: findings already in Must Fix / Should Fix / Nit format
3. Deduplicate: if two passes flag the same `file:line`, keep the higher-severity finding and merge descriptions
4. Organize merged findings for the next step

### Step 1.3: Renumber and update remaining steps
**File:** `.claude/commands/review.md` (modify)

**What to do:**
- Renumber: old Step 3 (Review Against Criteria) → Step 4, old Step 4 (Present the Review) → Step 5, old Step 5 (After Review) → Step 6
- Update Step 4 (Review Against Criteria): now validates and supplements the merged results from Step 3 rather than generating all findings from scratch. The criteria checks (Correctness, Pattern Consistency, Security, Spec Alignment) still apply but work from the merged findings as a starting point.
- Update Step 5 (Present the Review): add a review passes status line to the output:
  ```
  **Review passes:** code-quality ✅ | security ✅ | domain (api-design) ✅
  ```
- Remove `--deep` flag documentation from the Invocation section (lines 20-23)

### Phase 1 Verification

**Automated:**
- [ ] `review.md` parses as valid markdown
- [ ] No `--deep` references remain in review.md
- [ ] All 3 pass types documented with agent references
- [ ] Output format mapping is correct (Critical→Must Fix, etc.)
- [ ] Step numbering is sequential (1-6)

**Manual:**
- [ ] Read through full review.md — flow is: gather changes → dispatch 3 passes → merge findings → validate against criteria → present → after review

---

## Phase 2: Auto-Fix Cycle in Quality Gate (S-012)

### Overview
After this phase, when the quality gate halts due to Must Fix issues, it classifies them as mechanical vs architectural, auto-fixes mechanical issues, and re-reviews — up to 3 iterations. Architectural concerns always halt for human judgment.

**After this phase:** `/flow --auto` can complete the quality gate without human intervention for features with only mechanical Must Fix issues.

### Step 2.1: Add issue classification and auto-fix cycle to flow.md
**File:** `.claude/commands/flow.md` (modify, quality gate section ~lines 210-260)
**Pattern:** Follow existing gate evaluation table at `flow.md:226-233`

**What to do:**
Insert a new section after the "On halt" presentation block and before the "Auto mode" paragraph. This section defines:

**Issue classification rules:**

| Category | Auto-fixable? | Examples |
|----------|:------------:|---------|
| Missing error handling | Yes | Unhandled error case, missing validation |
| Incorrect status codes | Yes | Returns 200 instead of 201 on creation |
| Missing test coverage | Yes | Acceptance criteria not tested |
| Naming/pattern inconsistency | Yes | Doesn't follow established convention |
| Fixable security vulnerability | Yes | SQL injection, missing input sanitization |
| Architectural concern | No | Wrong abstraction, coupling issue |
| Performance concern | No | Algorithm choice, caching strategy |
| Scope deviation | No | Feature does more/less than spec says |

Classification requirement: a finding must have a `file:line` reference to be auto-fixable. If uncertain, classify as architectural (conservative default).

**Auto-fix cycle logic:**
1. Classify each Must Fix finding as mechanical or architectural
2. If ALL findings are architectural → halt immediately (existing behavior, no change)
3. If ANY findings are mechanical:
   a. Generate a mini fix plan — one task per mechanical Must Fix with: the file:line, issue description, and suggested fix from the review finding
   b. Execute each fix task inline (load `test-driven-development` and `verification-before-completion` skills)
   c. Run full verification (tests, lint, typecheck) after all fixes applied
   d. Re-run the quality gate (`/review` + `/validate`) — this is iteration N+1
   e. **Iteration limit: max 3.** Track iteration count.
4. If architectural findings remain alongside mechanical ones → auto-fix the mechanical ones first, then after the cycle completes (all mechanical resolved or iteration limit), halt to present the remaining architectural findings for human judgment
5. If iteration limit reached (3 attempts) with Must Fix still remaining → escalate

### Step 2.2: Update checkpoint format and auto mode documentation
**File:** `.claude/commands/flow.md` (modify)

**What to do:**
1. Update flow checkpoint format examples to include auto-fix iteration tracking
2. Update "Auto mode" paragraph: mechanical Must Fix triggers auto-fix automatically; architectural still halts even in auto

### Step 2.3: Update feature spec frontmatter
**File:** `docs/features/2026-04-10-self-healing-review-cycle.md` (modify)
Add `plan: docs/plans/2026-04-10-self-healing-review-cycle.md` to frontmatter.

### Phase 2 Verification

**Automated:**
- [ ] `flow.md` parses as valid markdown
- [ ] Issue classification rules documented with examples
- [ ] Iteration limit (3) explicitly stated
- [ ] Escalation message defined

**Manual:**
- [ ] Trace the flow: gate halts → classify → auto-fix mechanical → verify → re-review → iterate/escalate
- [ ] Verify architectural issues always halt (never auto-fixed)

---

## Final Verification

**All automated checks:**
- [ ] Both modified files parse as valid markdown
- [ ] `review.md` references correct agent files
- [ ] `flow.md` auto-fix cycle has explicit iteration limit and escalation

**Definition of done alignment:**
- [ ] DoD 1: `/review` dispatches specialized agents in parallel — Phase 1, Step 1.1
- [ ] DoD 2: Must Fix classified as mechanical/architectural — Phase 2, Step 2.1
- [ ] DoD 3: Mechanical Must Fix auto-generates fix tasks — Phase 2, Step 2.1
- [ ] DoD 4: Re-review after fixes, max 3 iterations — Phase 2, Step 2.1
- [ ] DoD 5: Architectural concerns halt pipeline — Phase 2, Step 2.1
- [ ] DoD 6: `/flow --auto` completes quality gate for mechanical issues — Phase 2, Steps 2.1-2.2
- [ ] DoD 7: Findings from specialized passes merged and deduplicated — Phase 1, Step 1.2

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `.claude/commands/review.md` | modify | 1 | 3-pass dispatch + findings merge + renumber steps |
| `.claude/commands/flow.md` | modify | 2 | Issue classification + auto-fix cycle + checkpoint update |
| `docs/features/2026-04-10-self-healing-review-cycle.md` | modify | 2 | Add plan frontmatter |

## Risks and Fallbacks

- **Agent output format mismatch:** `security-reviewer` outputs Critical/Warning/Note, not Must Fix/Should Fix/Nit. Fallback: explicit mapping rules in the merge step handle the translation.
- **Auto-fix introduces regressions:** A mechanical fix could break something else. Mitigation: full verification (tests, lint, typecheck) runs after each fix iteration.
- **Infinite fix loops:** A fix introduces a new issue that triggers another fix. Mitigation: hard cap at 3 iterations with escalation message.
- **Domain skill detection ambiguity:** Changed files might span multiple domains. Mitigation: load the primary domain (most files changed), note secondary domains in findings.

## References

- Feature spec: `docs/features/2026-04-10-self-healing-review-cycle.md`
- Review command: `.claude/commands/review.md`
- Flow command: `.claude/commands/flow.md`
- Agent definitions: `.claude/agents/security-reviewer.md`, `.claude/agents/pattern-finder.md`
- Related feature (quality gates): `docs/features/2026-04-09-flow-quality-gates.md`
