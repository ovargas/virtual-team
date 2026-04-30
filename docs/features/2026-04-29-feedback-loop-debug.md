---
id: FEAT-018
date: 2026-04-29
status: implemented
type: feature
triage: full
epic: EPIC-001
hub_decisions: []
plan: docs/plans/2026-04-29-feedback-loop-debug.md
research_level: light
yagni_verdict: build
tags: command, debugging, feedback-loop, ai-discipline, scripts
---

# Feedback-Loop-First Phase 1 in vt-debug

> **Value:** Replace `vt-debug`'s thin reproduction step with a structured discipline that builds a fast, deterministic, repeatable signal *before* any tracing or hypothesizing — turning debugging from "stare at code and guess" into "build a probe, then investigate."

## Problem

`vt-debug` Phase 1 (Reproduce) is currently 35 lines (`commands/vt-debug.md:63-97`). It says "follow reproduction steps" or "try to trigger the symptom." That's it. There's no menu of strategies for *how* to build a reproduction, no iteration on the quality of the signal, and no guardrail for the case when no loop is possible.

The founder has observed sessions where the AI skips reproduction and slides directly into reading code and hypothesizing. Without a probe, every hypothesis is unfalsifiable in practice — there's nothing to run against. FEAT-017 (Hypothesize) just landed to prevent anchoring on the first explanation, but ranked hypotheses are hollow if there's no loop to test them against.

**Trigger:** Comparative review against mattpocock/skills (`docs/reviews/2026-04-29-comparative-mattpocock-skills.md`, finding #1 — rated Critical). Matt's `diagnose` skill makes "build a feedback loop" the *entire first phase* with 10 ranked strategies. The reviewer called this the **single highest-leverage improvement** for `vt-debug`.

**Current workaround:** The founder manually asks "did you actually verify the bug?" mid-session. Works, but defeats the automation purpose of the command.

## YAGNI Assessment

**Verdict:** BUILD IT (as scoped, ~100 lines rewritten + ~40 line bash template)

Epic-driven (EPIC-001 ship order #3). PO already validated necessity and timing. The scope test passed in Phase 2: every element earns its keep — the menu enforces choice, iteration enforces signal quality, the guardrail prevents the antipattern, and the HITL template is the escape valve when automation fails.

**Not in scope (explicit no-gos):**
- Auto-scaffolding loops via a tool — the AI proposes and writes the loop in-session
- Per-stack templates (Python harness, Node harness, etc.) — language-specific cases use existing test/curl/CLI tooling
- A standalone `vt-loop` command — feedback-loop building is debugging discipline, not a separate capability
- Persisting loops between sessions — they're throwaway artifacts; if a loop is worth keeping, it becomes a test (strategy #1)
- Modifying any phase other than Phase 1 — Phase 2 (Hypothesize) through Phase 5 (Document) stay intact

## Solution

### What we're building

1. **Phase 1: Build a feedback loop** — replace the current Phase 1 (Reproduce) entirely. The new phase has three sub-steps:
   - **1a. Choose a strategy from the ranked menu.** Present a 10-strategy table ordered best→worst signal quality. Pick one and justify the choice given the bug context.
   - **1b. Build the loop.** Write the chosen probe inline (test, curl, CLI invocation, throwaway harness, etc.). Run it. Capture the output. Confirm a non-zero signal — failing test, error response, divergent output.
   - **1c. Iterate on the loop itself.** Evaluate the loop: is it fast (sub-second to a few seconds)? Deterministic (same input → same output)? Sharp (signal isolates the symptom, not adjacent noise)? If not, refine — speed it up, eliminate flakiness, narrow the assertion.

2. **The 10-strategy menu** (markdown table, ranked by signal quality):

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

3. **"Stop if you cannot build a loop" guardrail** — explicit instruction: when none of the 10 strategies fits, the AI must say so and stop. The founder can override (proceed to Phase 2 with degraded confidence), but the AI does not silently slide into code-reading.

4. **HITL template** at `scripts/hitl-loop.template.sh` (~40 lines). Bash `set -euo pipefail`, a `step()` function that prompts the operator, an `assert()` helper, exit on deviation. Referenced from Phase 1 only when strategy #10 is chosen.

### What we're NOT building

- See "Not in scope" above.

### Rabbit holes to avoid

- **Over-prescribing strategy choice.** No flags like `--strategy=curl`. The AI picks; that's the discipline.
- **Bloating the HITL template.** ~40 lines max. It's a starter, not a framework. No argument parsing, no config files, no "modes."
- **Tutorializing each strategy.** One sentence per strategy in the menu. The AI knows how to write a curl call. The menu is a prompt, not a how-to doc.
- **Splitting into multiple stories.** "Add menu", "add iterate", "add HITL" is exactly the horizontal slicing FEAT-016 warned against. One coherent commit, one PR.

## Definition of Done

**The feature is done when:**

1. Running `/vt-debug` on any bug produces a Phase 1 output that includes the ranked 10-strategy menu and a justified strategy choice, *before* any hypothesizing or tracing.
2. The chosen feedback loop produces an observable signal (failing test, error response, exit code, divergent output) that the founder can re-run independently — not just "I read the code and think this is broken."
3. The "iterate on the loop" sub-step appears explicitly: AI evaluates fast/deterministic/sharp, refines if any dimension is weak.
4. When no loop is possible, the AI states this explicitly and stops. The founder may override, but silent fallback to code-reading is gone.
5. `scripts/hitl-loop.template.sh` exists, is executable (`chmod +x`), and is referenced from Phase 1 only when strategy #10 is chosen.
6. Phase 2 (Hypothesize), Phase 3 (Trace), Phase 4 (Root Cause), Phase 5 (Document) are unchanged — the FEAT-017 work is preserved verbatim.
7. `npm test` passes — frontmatter, file refs, and command refs all clean.
8. Manual smoke test on a sample bug surfaces the menu and produces a runnable loop.

**Verification:**

Automated:
- [ ] `npm test` — passes
- [ ] `grep -c "### Phase" commands/vt-debug.md` — returns 5 (unchanged from FEAT-017)
- [ ] `grep "Build a feedback loop" commands/vt-debug.md` — returns match
- [ ] `grep -c "| Rank | Strategy" commands/vt-debug.md` — returns ≥1 (menu present)
- [ ] `test -f scripts/hitl-loop.template.sh && test -x scripts/hitl-loop.template.sh` — exists and executable
- [ ] `bash -n scripts/hitl-loop.template.sh` — bash syntax valid

Manual:
- [ ] Read `commands/vt-debug.md` end-to-end: Phase 1 is "Build a feedback loop" with menu + iterate sub-step + stop guardrail; Phases 2-5 unchanged
- [ ] Read `scripts/hitl-loop.template.sh`: ~40 lines, `set -euo pipefail`, `step()`, `assert()`, copy-paste-ready
- [ ] Run `/vt-debug` on a sample bug; confirm menu appears and a strategy is chosen with justification

## Success Metrics

**Leading indicators:**
- ≥80% of debug sessions name a specific strategy from the menu in Phase 1 output
- 100% of sessions where a loop is built: signal is captured before Phase 2 hypotheses generate
- Founder reports "I have a probe I can re-run" after Phase 1

**Lagging indicators:**
- Manual founder pushback ("did you actually verify?") drops in retro
- Time-to-correct-fix decreases (the loop catches regressions during the fix attempt itself)

**Failure signal:**
- AI consistently picks strategy #1 regardless of context → menu unread, becomes ceremony → tighten the prompt, force justification
- Founder skips Phase 1 manually >2 times → discipline too heavy → redesign or condense
- HITL template never referenced across sessions → strategy #10 unreachable in practice → drop the bundled template, document inline

## Founder Context

The original concern from EPIC-001 invocation included finding #1 from the comparative review as one of the priority items. The founder has independently noted in earlier sessions that debugging quality hinges on having a probe. This feature codifies that intuition.

This is the third feature in EPIC-001 ship order, completing the `vt-debug` overhaul that started with FEAT-017. After this feature, `vt-debug` is structurally:
1. Build a feedback loop (this feature)
2. Hypothesize (FEAT-017)
3. Trace
4. Root Cause
5. Document

— a coherent path from "build a probe" → "commit to multiple explanations" → "test them against the probe" → "explain the survivor" → "document for the team."

## Implementation Hints

### Existing patterns to follow

- **Pattern: phase rewrite within an existing command.** No precedent for full Phase 1 replacement, but FEAT-017's atomic insertion (commit `b5aa9ff`) is the closest analog — single-file, single-commit, no story split.
- **Pattern: ranked markdown table for AI choice.** `commands/vt-debug.md:108-116` (Phase 2 Hypothesize, just landed) — reuse the same table style and the same pause-before-proceeding flow.
- **Pattern: pause gate wording.** `commands/vt-plan.md:219` — "Wait for acknowledgment before proceeding" phrasing for cross-command consistency.

### Integration points

- **`commands/vt-debug.md`** — full Phase 1 rewrite. Lines 63-97 (current Phase 1 body) are replaced. Phase 2 (line 98 onward, FEAT-017) and beyond stay intact.
- **`commands/vt-debug.md` checkpoint phase list (line 36)** — already says `(Reproduce, Hypothesize, Trace, Root Cause, Document)`. After this feature it becomes `(Build feedback loop, Hypothesize, Trace, Root Cause, Document)`. Phase 1 heading changes from `### Phase 1: Reproduce` to `### Phase 1: Build a feedback loop`.
- **`scripts/hitl-loop.template.sh`** — new file, new directory. The repo has no `scripts/` directory yet; this feature creates it. Note that `tests/validate-file-refs.test.ts:40` does NOT scan for `.sh` references, so the menu's reference to the template won't be auto-validated by tests — manual verification covers it.

### API Contracts

No API contracts — this feature is internal/prompt-engineering, command-only. No endpoints, events, or shared models.

### Data model considerations

None — no persistent state, no data model changes.

### Technical risks

| Risk | Mitigation |
|---|---|
| `commands/vt-debug.md` grows from 328 → ~430 lines | Still well under the 500-line review threshold for commands. ADR-001's 100-line skill budget does not apply to commands. Document the new size in the spec for transparency. |
| AI picks strategy #1 by default and the menu becomes ceremony | The menu's "When it fits" column gives concrete cues; `/vt-debug` instructions require justification of the choice, not just selection. Failure signal in metrics catches this. |
| HITL template rots (bash idioms drift) | Template is intentionally minimal (~40 lines, no dependencies). If it rots, drop it; the AI can generate one inline. |
| Phase 1 rewrite accidentally breaks FEAT-017's Phase 2 cross-references | The "go back to Phase 2" instruction in current Phase 4 (root cause) does NOT reference Phase 1 — the FEAT-017 cross-link is between Phases 4 and 2, not 1 and 2. Phase 1 rewrite is isolated. |
| Founder finds the menu too heavy for trivial bugs | Phase 1 is meant to be quick when reproduction is obvious — strategy #1 (failing test) or #2 (curl) takes one line each. The discipline is the *consideration*, not the verbosity. |

## Research Summary

Research level: **light** (no `--deep` flag).

Key findings:
- `commands/vt-debug.md:63-97` — current Phase 1 body to replace
- `commands/vt-debug.md:98-128` — Phase 2 (Hypothesize, FEAT-017) — preserve verbatim
- No `scripts/` directory exists; no `.sh` files in the repo
- `tests/validate-file-refs.test.ts:40` validates `.md|.json|.yaml|.yml` references but NOT `.sh` — script reference bypasses test coverage
- FEAT-017 commit `b5aa9ff` is the immediate precedent for atomic phase-level edits to this file

## Stories

**Group 1: vt-debug Phase 1 rewrite** (single story, single branch)

1. **S-022: Rewrite vt-debug Phase 1 as feedback-loop-first**
   - Layers: command prompt (`commands/vt-debug.md`) + new bash template (`scripts/hitl-loop.template.sh`)
   - Acceptance:
     - Phase 1 in `vt-debug` is renamed "Build a feedback loop" with the ranked 10-strategy menu, the iterate-on-the-loop sub-step, and the "stop if you cannot build a loop" guardrail
     - Strategy choice in Phase 1 output includes a justification (not just a name)
     - `scripts/hitl-loop.template.sh` exists, is executable, passes `bash -n` syntax check, ~40 lines
     - Phases 2 (Hypothesize), 3 (Trace), 4 (Root Cause), 5 (Document) are unchanged from FEAT-017
     - `npm test` passes
   - Demo: Run `/vt-debug` on any sample bug — founder sees the menu, the AI's chosen strategy with reasoning, and a runnable probe before any tracing or hypothesizing.

**Milestones:**
- After S-022: FEAT-018 is shippable. Combined with FEAT-017 (already merged), debugging discipline is structurally sound across all five phases.

**Execution strategy:**
- Group 1 → `/vt-implement FEAT-018` runs the single story atomically (mirrors FEAT-017's pattern, commit `b5aa9ff`).

## References

- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001, ship order #3)
- Comparative review: `docs/reviews/2026-04-29-comparative-mattpocock-skills.md` (finding #1, rated Critical)
- Pattern source: mattpocock/skills `diagnose/SKILL.md`
- Predecessor in epic: FEAT-017 (HYPOTHESIS-DEBUG) — completed 2026-04-29 (commit `b5aa9ff`)
- Pattern reference: `commands/vt-debug.md:108-116` (markdown table style from FEAT-017), `commands/vt-plan.md:219` (pause gate wording)
- Successor in epic: FEAT-SKILL-AUTHORING (ship order #4) — independent, no shared file

## Origin

Feature spec created on 2026-04-29 through structured intake driven by EPIC-001.
Original epic description: "Replace Phase 1 (Reproduce) with 'Build a feedback loop' — the 10-strategy menu ranked by preference: failing test, curl script, CLI invocation, headless browser, replay trace, throwaway harness, fuzz loop, bisection, differential loop, HITL bash script. Add 'iterate on the loop itself' sub-phase and 'when you genuinely cannot build a loop — stop and say so' guardrail. Bundle HITL bash template."
