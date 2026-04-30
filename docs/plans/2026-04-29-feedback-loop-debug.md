---
date: 2026-04-29
feature: FEAT-018
spec: docs/features/2026-04-29-feedback-loop-debug.md
status: approved
---

# Implementation Plan: Feedback-Loop-First Phase 1 in vt-debug

## Overview

Replace `vt-debug` Phase 1 (Reproduce) entirely with a structured "Build a feedback loop" phase that includes a ranked 10-strategy menu, an iterate-on-the-loop sub-step, and a "stop if you can't build a loop" guardrail. Also create a HITL bash template at `scripts/hitl-loop.template.sh`. The change is atomic — one command file rewritten, one new script file, one coherent commit.

## Reference Implementation

The closest existing pattern is FEAT-017's Phase 2 insertion (commit `b5aa9ff`):
- `commands/vt-debug.md:108-116` — ranked markdown table within a phase (4-column table with header row)
- `commands/vt-debug.md:118-128` — pause gate with founder options before proceeding
- `commands/vt-plan.md:219` — pause gate phrasing: "Wait for acknowledgment before proceeding"

This plan follows the same markdown table + pause gate style from FEAT-017, with a 10-row strategy menu replacing the 3-row hypothesis table.

## Pre-conditions

Before starting implementation:
- [ ] Feature spec is approved: `docs/features/2026-04-29-feedback-loop-debug.md`
- [ ] FEAT-017 (Hypothesize) is committed on main — confirmed (commit `b5aa9ff`)

---

## Phase 1: Rewrite Phase 1 and Create HITL Template (end-to-end)

### Overview
Replace the entire Phase 1 body in `commands/vt-debug.md`, update the checkpoint phase list and guidelines, and create the HITL bash template. After this phase, `/vt-debug` has the full feedback-loop-first discipline across all five phases.

**After this phase:** Running `/vt-debug` on any bug produces a Phase 1 output with the ranked 10-strategy menu, a justified strategy choice, a built loop with observable signal, an iteration sub-step evaluating fast/deterministic/sharp, and a guardrail when no loop is possible — all before any hypothesizing or tracing.

### Step 1.1: Update checkpoint phase list
**File:** `commands/vt-debug.md` (modify)
**Pattern:** Follow existing format at line 36

**What to do:**
At line 36, change the parenthetical from `(Reproduce, Hypothesize, Trace, Root Cause, Document)` to `(Build feedback loop, Hypothesize, Trace, Root Cause, Document)`.

### Step 1.2: Replace Phase 1 body
**File:** `commands/vt-debug.md` (modify)
**Pattern:** Follow `commands/vt-debug.md:108-116` for markdown table style; `commands/vt-debug.md:118-128` for pause gate.

**What to do:**
Replace lines 63-97 (the entire `### Phase 1: Reproduce` section) with `### Phase 1: Build a feedback loop`. The new section has three sub-steps:

**1a. Choose a strategy from the ranked menu.** Present the 10-strategy table:

| Rank | Strategy | When it fits | Signal type |
|---|---|---|---|
| 1 | Failing test | Reproducible logic bug, regression | Test framework output |
| 2 | Curl / HTTP script | API/server bug | HTTP response, status code |
| 3 | CLI invocation | Command/tool bug | Exit code, stderr |
| 4 | Headless browser | UI/integration bug | DOM state, console errors |
| 5 | Replay trace | Production crash, deferred bug | Recorded execution |
| 6 | Throwaway harness | No clean entry point | Custom script output |
| 7 | Fuzz loop | Edge case, intermittent | Crash on input class |
| 8 | Bisection | Recently introduced regression | Last-good commit |
| 9 | Differential loop | "Was working, now broken" | Output diff vs known-good |
| 10 | HITL bash script | No automation possible | Manual checklist gating |

Include instruction: pick one strategy, justify the choice given the bug context, and explain why higher-ranked strategies don't fit (if skipping to a lower rank). Reference `scripts/hitl-loop.template.sh` only when strategy #10 is chosen.

**1b. Build the loop.** Write the chosen probe inline (test, curl command, CLI invocation, throwaway harness, etc.). Run it. Capture the output. Confirm a non-zero signal — failing test, error response, exit code, or divergent output.

Include output template (markdown code fence):
```
**Feedback loop:** [strategy name]
**Probe:** [what was written/executed]
**Signal:** [captured output — error, diff, exit code, etc.]
**Verdict:** [signal confirms the bug exists | signal is ambiguous — refine]
```

**1c. Iterate on the loop itself.** Evaluate the loop on three dimensions:
- **Fast** — sub-second to a few seconds? If slow, can you narrow the input or skip setup?
- **Deterministic** — same input → same output every time? If flaky, isolate the non-determinism.
- **Sharp** — signal isolates the symptom, not adjacent noise? If noisy, tighten the assertion or filter.

If any dimension is weak, refine the loop before proceeding. Document the iteration:
```
**Loop quality:**
- Fast: [yes/no — explanation]
- Deterministic: [yes/no — explanation]
- Sharp: [yes/no — explanation]

[If refined:] Refined from [original] → [improved version]. Signal is now [description].
```

**Stop guardrail.** After the strategy menu and before 1b, include an explicit instruction: "If none of the 10 strategies fits this bug and you genuinely cannot build an automated or semi-automated feedback loop, **stop and say so explicitly:**"

```
⚠️ Cannot build a feedback loop for this bug.

Tried/considered: [what was attempted or why strategies don't apply]
Reason: [why no loop is possible — e.g., requires physical hardware, production-only state, etc.]

Proceeding to Phase 2 (Hypothesize) with degraded confidence.
The founder may override this decision.
```

The AI must NOT silently skip to code-reading. The stop must be visible.

**Target size:** ~65-75 lines for the entire Phase 1 section (replacing the current 35 lines).

### Step 1.3: Update guideline #2
**File:** `commands/vt-debug.md` (modify)
**Pattern:** Existing guideline format at lines 300-303

**What to do:**
Replace guideline #2 from:
```
2. **Reproduce before you trace:**
   - Don't jump to reading code and guessing. Reproduce first.
   - A reproduction proves the bug exists and gives you a concrete test case
   - If you can't reproduce, say so — don't pretend you found the root cause by reading code alone
```
To:
```
2. **Build a feedback loop before you trace:**
   - Don't jump to reading code and guessing. Build a probe first.
   - A feedback loop proves the bug exists and gives you a runnable, repeatable signal
   - If you can't build a loop, say so explicitly — don't silently fall back to code-reading
```

### Step 1.4: Update TodoWrite todos list
**File:** `commands/vt-debug.md` (modify)
**Pattern:** Existing format at line 323

**What to do:**
At line 323, change the todos list from:
`reproduce, trace (per component), hypothesize, verify, document`
To:
`build feedback loop, hypothesize, trace (per component), verify, document`

### Step 1.5: Create HITL bash template
**File:** `scripts/hitl-loop.template.sh` (create)
**Pattern:** No existing bash scripts in the repo. Follow the spec's description: `set -euo pipefail`, `step()` function, `assert()` helper, ~40 lines.

**What to do:**
Create `scripts/` directory and `scripts/hitl-loop.template.sh`. The template should be:

1. **Header:** `#!/usr/bin/env bash`, `set -euo pipefail`, a brief comment block explaining purpose (HITL feedback loop template for `/vt-debug` Phase 1, strategy #10)
2. **`step()` function:** Takes a description string, prints it with a step number, prompts the operator to confirm (`read -rp "Press Enter to continue or Ctrl-C to abort..."`), increments counter
3. **`assert()` function:** Takes a description and a command. Runs the command. If it fails, prints `FAIL: [description]` and exits 1. If it passes, prints `PASS: [description]`.
4. **Example steps section:** 3-4 example `step` and `assert` calls (commented out) showing the pattern — the operator fills in their own
5. **Footer:** Final summary line: `echo "All steps passed."`

Target: ~40 lines. Must pass `bash -n` syntax check. Mark executable (`chmod +x`).

### Phase 1 Verification

**Automated:**
- [ ] `npm test` — passes (frontmatter, file refs, command refs all clean)
- [ ] `grep -c "### Phase" commands/vt-debug.md` — returns 5 (unchanged count from FEAT-017)
- [ ] `grep "Build a feedback loop" commands/vt-debug.md` — returns match (Phase 1 heading)
- [ ] `grep -c "| Rank | Strategy" commands/vt-debug.md` — returns ≥1 (10-strategy menu present)
- [ ] `grep "Phase 2: Hypothesize" commands/vt-debug.md` — returns match (unchanged)
- [ ] `grep "Phase 3: Trace" commands/vt-debug.md` — returns match (unchanged)
- [ ] `grep "Phase 4: Root Cause" commands/vt-debug.md` — returns match (unchanged)
- [ ] `grep "Phase 5: Document" commands/vt-debug.md` — returns match (unchanged)
- [ ] `test -f scripts/hitl-loop.template.sh && test -x scripts/hitl-loop.template.sh` — exists and executable
- [ ] `bash -n scripts/hitl-loop.template.sh` — syntax valid
- [ ] `wc -l < scripts/hitl-loop.template.sh` — approximately 40 lines (30-50 range acceptable)

**Manual:**
- [ ] Read `commands/vt-debug.md` Phase 1 end-to-end: 10-strategy menu present, iterate sub-step (fast/deterministic/sharp) present, stop guardrail present, HITL template referenced only for strategy #10
- [ ] Phases 2-5 are unchanged from FEAT-017 — no modifications, no stale references
- [ ] Read `scripts/hitl-loop.template.sh`: `set -euo pipefail`, `step()`, `assert()`, copy-paste-ready, ~40 lines
- [ ] Run `/vt-debug` on a sample bug — confirm menu appears and a strategy is chosen with justification

**Stop here.** Single phase — this IS the entire implementation.

---

## Final Verification

**All automated checks:**
- [ ] `npm test` — passes
- [ ] Manual read-through of `commands/vt-debug.md` — Phase 1 is "Build a feedback loop" with menu + iterate + guardrail; Phases 2-5 coherent and unchanged

**Definition of done alignment:**
- [ ] DoD 1 (Phase 1 output includes ranked 10-strategy menu and justified choice before hypothesizing) — Step 1.2
- [ ] DoD 2 (chosen loop produces observable signal founder can re-run) — Step 1.2, sub-step 1b output template
- [ ] DoD 3 (iterate sub-step appears: fast/deterministic/sharp evaluation) — Step 1.2, sub-step 1c
- [ ] DoD 4 (when no loop possible, AI states explicitly and stops) — Step 1.2, stop guardrail
- [ ] DoD 5 (`scripts/hitl-loop.template.sh` exists, executable, referenced from Phase 1 for strategy #10) — Step 1.5
- [ ] DoD 6 (Phases 2-5 unchanged from FEAT-017) — Step 1.2 scope boundary + Phase 1 Verification manual check
- [ ] DoD 7 (`npm test` passes) — Phase 1 Verification automated
- [ ] DoD 8 (manual smoke test surfaces menu and produces runnable loop) — Phase 1 Verification manual

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `commands/vt-debug.md` | modify | 1 | Replace Phase 1 body (~35 lines → ~70 lines), update checkpoint list (line 36), update guideline #2 (lines 300-303), update TodoWrite list (line 323) |
| `scripts/hitl-loop.template.sh` | create | 1 | HITL feedback loop template, ~40 lines, executable |

## Risks and Fallbacks

- **Risk: vt-debug.md grows from 328 → ~363 lines.** Mitigation: well under the 500-line threshold. ADR-001's 100-line skill budget does not apply to commands. The growth is proportional to the value added (10-strategy menu + iterate + guardrail replaces thin 35-line phase).
- **Risk: AI picks strategy #1 by default and menu becomes ceremony.** Mitigation: the plan includes "justify the choice given the bug context" and "explain why higher-ranked strategies don't fit" — the AI must reason, not default. Failure signal in spec metrics catches this pattern.
- **Risk: HITL template rots over time (bash idioms drift).** Mitigation: template is intentionally minimal (~40 lines, no dependencies). If it rots, drop it; the AI can generate one inline. Failure signal: if never referenced across sessions, drop the bundled template.
- **Risk: Phase 1 replacement accidentally breaks FEAT-017's Phase 2 cross-references.** Mitigation: Phase 2 Hypothesize has no back-references to Phase 1. The cross-link is between Phases 4 and 2, not 1 and 2. Phase 1 rewrite is isolated. Verified by reading lines 98-128.
- **Risk: `scripts/hitl-loop.template.sh` reference in vt-debug.md is not validated by `npm test`.** Mitigation: `tests/validate-file-refs.test.ts` only scans `.md|.json|.yaml|.yml` references. Manual verification covers the `.sh` reference. Automated check: `test -f scripts/hitl-loop.template.sh`.

## References

- Feature spec: `docs/features/2026-04-29-feedback-loop-debug.md`
- Pattern reference: `commands/vt-debug.md:108-116` (markdown table style from FEAT-017), `commands/vt-debug.md:118-128` (pause gate), `commands/vt-plan.md:219` (pause gate wording)
- Predecessor: FEAT-017 (commit `b5aa9ff`) — same single-file atomic edit pattern
- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001, ship order #3)
