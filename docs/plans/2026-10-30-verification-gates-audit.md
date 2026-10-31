---
date: 2026-10-30
feature: FEAT-028
spec: docs/features/2026-10-30-verification-gates-audit.md
status: approved
scope: group 1 (S-039, S-040)
---

# Implementation Plan: Verification-Gates Declaration (Group 1)

## Overview

Introduce a `## Verification` section in service-repo `stack.md` that declares a `Fast gate` and a `Full gate`, defined once in a new `verification-gates` skill. `/implement`, `/flow`, and `/flow-fix-pipeline` run the declared gates (S-039), and `/plan` writes them into every plan's verification blocks (S-040). Group 2 (catalog + `doctor gates`, S-041/S-042) is out of this plan: it sits behind the spec's go/no-go checkpoint and gets its own plan.

## Reference Implementation

The closest existing pattern is the policy-risk gate (`902e3be`), which added a `stack.md` section read by several commands:
- `commands/start.md:347-364` — dedicated interview round gathering the section's fields
- `commands/start.md:477-485` — the section in the service `stack.md` template, with an HTML comment naming the skill that reads it
- `skills/policy-risk/SKILL.md:1-5` — skill frontmatter with `loaded_when` listing the consuming commands
- `commands/plan.md` Phase 0 "Policy Risk Gate" — a command loading the skill and acting on the section

This plan follows the same structure, with two adaptations: the fields are gathered inside the existing Round 7 (Testing and Quality) instead of a new round, and only the service template changes (hubs do not run implementation, `commands/doctor.md:39-47`).

## Pre-conditions

- [ ] Feature spec approved: `docs/features/2026-10-30-verification-gates-audit.md`
- [ ] `npm install` run so `npm test` works (`vitest` is currently missing)
- [ ] Work on branch `docs/feat-028-verification-gates` or a branch cut from it

---

## Phase 1: Declared gates run in `/implement` and `/flow` (S-039)

### Overview

A service repo can declare its fast and full gate commands, and the implementation commands run them instead of guessing. Undeclared repos keep today's inference but see which command was chosen.

**After this phase:** In a repo whose `stack.md` declares `- **Fast gate:** \`make check-fast\`` and `- **Full gate:** \`make check\``, `/implement` runs `make check-fast` at phase boundaries and `make check` at final verification. In a repo without the section, `/implement` prints `Inferred gate: <cmd> — declare it under ## Verification in stack.md` once and proceeds.

### Step 1.1: Create the `verification-gates` skill

**File:** `skills/verification-gates/SKILL.md` (create)
**Pattern:** Follow `skills/policy-risk/SKILL.md:1-5` for frontmatter (`name`, `description`, `loaded_when`) and `skills/skill-authoring/SKILL.md:8-81` for structure and the review checklist.

**What to do:**
- Frontmatter: `name: verification-gates`; third-person description with "Use when running or writing verification steps in a service repo — resolves the project's declared fast and full gate commands from stack.md's ## Verification section, with a visible inferred fallback"; `loaded_when: /implement verification, /flow gate after /implement and fix cycles, /flow-fix-pipeline, /plan verification blocks`.
- Sections, in this order, under 100 lines total:
  1. **Ownership rule** — the project owns its gates; the plugin runs only the commands the project declared and never edits `stack.md`, hook scripts, or gate files.
  2. **Declaration format** — the two lines `- **Fast gate:** \`<cmd>\`` and `- **Full gate:** \`<cmd>\`` under `## Verification`; one command each, run from the repo root. Note that per-capability lines are added by the catalog (FEAT-028 group 2) and are ignored by this skill.
  3. **Which gate when** — `fast`: phase boundaries and quick re-checks during fix cycles; `full`: final verification, the `/flow` gate after `/implement`, and before declaring completion.
  4. **Resolution rule** — read `stack.md` → `## Verification`. Declared → use the command verbatim. Missing section or missing line → infer from the project (Makefile targets, package scripts, stack tooling) exactly as commands do today, print `Inferred gate: <cmd> — declare it under ## Verification in stack.md` once per command run, and proceed. If only `Full gate` is declared, use it for `fast` too; if only `Fast gate` is declared, infer `full`.
  5. **Failure handling** — a failing declared gate is a failing verification; never substitute a different command to get a pass.
- Cross-references use root-relative paths only.

### Step 1.2: Add `## Verification` to the service `stack.md` template and Round 7

**File:** `commands/start.md` (modify)
**Pattern:** Follow `commands/start.md:477-485` (section with an HTML comment naming the reading skill) and `commands/start.md:302-313` (Round 7 "Gather" list).

**What to do:**
- In Round 7 (`:302-313`), add to the Gather list: **Fast gate** — the quickest command that catches most breakage (e.g., a lint + unit-test target); **Full gate** — the command CI or pre-push runs. Mark `TBD` if none exists yet.
- In the service template, insert after `## Testing & Quality` (`:459-463`):
  ```
  ## Verification
  <!-- Read by skills/verification-gates/SKILL.md. Commands run these verbatim. -->
  - **Fast gate:** `[command or TBD]`
  - **Full gate:** `[command or TBD]`
  ```
- Do not change the hub template.
- No change needed for `TBD` gates: the service template's `## TBD Items` already says "List every item marked TBD above" (`commands/start.md:493-495`).

### Step 1.3: Run declared gates in `/implement`

**File:** `commands/implement.md` (modify)
**Pattern:** Follow how `commands/implement.md:520-530` points to `stack.md` and a skill for resolution rather than inlining rules.

**What to do:**
- `:249` (Level 3 step 5) and `:257` (Level 2): replace "run tests, lint, typecheck" with "run the full gate (resolve via `skills/verification-gates/SKILL.md`)".
- `:291-305` (phase verification): after "Execute every automated verification command listed in the plan", add: "If the plan lists none, run the fast gate resolved via `skills/verification-gates/SKILL.md`." Keep the example report block unchanged.
- `:352-361` (final verification): add a line before the example: "If the plan's Final Verification lists no commands, run the full gate resolved via `skills/verification-gates/SKILL.md`."
- `:559` (guideline): replace "at minimum run the project's type checker and linter" with "run the gate resolved via `skills/verification-gates/SKILL.md` (fast at phase boundaries, full at the end)".
- The plan stays the source of truth: declared gates fill gaps in a plan, they do not override commands a plan lists.

### Step 1.4: Run declared gates in `/flow` and `/flow-fix-pipeline`

**Files:** `commands/flow.md` (modify), `commands/flow-fix-pipeline.md` (modify)
**Pattern:** Same pointer style as Step 1.3.

**What to do:**
- `commands/flow.md:359`: replace "Tests pass (run the test command from `stack.md`)" and the next line "Linting passes" with "Full gate passes (resolved via `skills/verification-gates/SKILL.md`)".
- `commands/flow.md:447` and `:534`: replace "(tests, lint, typecheck)" with "(the full gate, resolved via `skills/verification-gates/SKILL.md`)".
- `commands/flow-fix-pipeline.md:104`: same replacement. `:107`: replace "all tests pass, lint clean, typecheck clean" with "the full gate passes".

### Step 1.5: Register the skill in the command reference

**File:** `docs/command-reference.md` (modify)
**Pattern:** Follow the rows in the "Operational Skills" table (`docs/command-reference.md:353-361`).

**What to do:**
- Add `| \`virtual-team:verification-gates\` | Verification steps in /implement, /flow, /flow-fix-pipeline, /plan |`.

### Phase 1 Verification

**Automated:**
- [ ] `npm test` — frontmatter, file references, and command references pass
- [ ] `wc -l skills/verification-gates/SKILL.md` — under 100
- [ ] `grep -n "test command from \`stack.md\`" commands/flow.md` — no matches
- [ ] `grep -n "type checker and linter" commands/implement.md` — no matches
- [ ] `grep -rn "verification-gates/SKILL.md" commands/implement.md commands/flow.md commands/flow-fix-pipeline.md commands/start.md` — at least one match per file

**Manual:**
- [ ] In GlamGo-api, add `## Verification` with `make check-fast` / `make check`, run `/virtual-team:implement` on a small story with the local plugin build, and confirm the declared commands run (note: installed plugin caches need a release or a local plugin dir to pick up changes)
- [ ] In a repo without the section, confirm the single `Inferred gate:` line
- [ ] Run `/virtual-team:start` in a scratch directory and confirm the service `stack.md` contains the section and the hub template does not

**Stop here.** Verify Phase 1 before proceeding.

---

## Phase 2: Plans list the declared gates (S-040)

### Overview

Plans written by `/plan` carry the project's real gate commands, so plan and execution agree.

**After this phase:** A new plan in a declared repo shows `make check-fast` in each Phase Verification block and `make check` in Final Verification — no `[command]` placeholders for gates.

### Step 2.1: Fill plan verification blocks from declared gates

**File:** `commands/plan.md` (modify)
**Pattern:** Follow the Policy Risk Gate's "load the skill and act on the section" style in `commands/plan.md` Phase 0.

**What to do:**
- In Phase 1 "Read the full context" (Initial Response step 2), add: "`stack.md` `## Verification` — resolve the fast and full gates via `skills/verification-gates/SKILL.md`."
- In the template's Phase Verification block (`:395-399`), make the first automated item `- [ ] Fast gate passes: \`[declared fast gate]\``, keeping the existing illustrative lines for capability-specific checks.
- In Final Verification (`:440-446`), replace the four placeholder lines with `- [ ] Full gate passes: \`[declared full gate]\`` followed by `- [ ] [Any additional check the feature needs, e.g. a migration dry-run]`.
- Add one sentence under the template: "When the gates are inferred, write the inferred command and print the skill's `Inferred gate:` line, so the founder can correct it during plan review."

### Phase 2 Verification

**Automated:**
- [ ] `npm test` passes
- [ ] `grep -n "Full gate passes" commands/plan.md` — present in Final Verification

**Manual:**
- [ ] Run `/virtual-team:plan` on a small spec in GlamGo-api with the section declared; confirm the plan's verification blocks list `make check-fast` and `make check`

**Stop here.** Verify Phase 2 before proceeding.

---

## Final Verification

**All automated checks:**
- [ ] Full test suite passes: `npm test`
- [ ] Skill size budget: `wc -l skills/verification-gates/SKILL.md` under 100

**Manual testing:**
- [ ] GlamGo-api end-to-end: `/virtual-team:plan` lists declared gates; `/virtual-team:implement` runs them
- [ ] Undeclared repo: one `Inferred gate:` line per run, behavior otherwise unchanged
- [ ] Regression: `/virtual-team:start` hub flow unchanged; `/virtual-team:doctor` skill-coverage audit unchanged

**Definition of done alignment (spec items covered by this group):**
- [ ] DoD 1 (`/start` produces `## Verification` with fast/full) — Phase 1, Step 1.2
- [ ] DoD 2 (plans list declared commands; `/implement` and `/flow` run them) — Phase 1, Steps 1.3-1.4; Phase 2, Step 2.1
- [ ] DoD 3 (undeclared repos print the inferred-gate line) — Phase 1, Step 1.1 (rule) and Steps 1.3-1.4 (consumers)
- DoD 4-5 (`doctor gates`) — out of scope for this plan (group 2)

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `skills/verification-gates/SKILL.md` | create | 1 | Format, gate semantics, resolution and fallback rule |
| `commands/start.md` | modify | 1 | Round 7 gathers gates; service template gains `## Verification` |
| `commands/implement.md` | modify | 1 | Phase/final verification and guideline point to the skill |
| `commands/flow.md` | modify | 1 | Post-implement gate and fix cycles use the full gate |
| `commands/flow-fix-pipeline.md` | modify | 1 | Fix-cycle verification uses the full gate |
| `docs/command-reference.md` | modify | 1 | Operational Skills row |
| `commands/plan.md` | modify | 2 | Template verification blocks use declared gates |

## Risks and Fallbacks

- **Declared gate is slow or flaky, making every phase boundary painful:** Fallback: the project re-declares a narrower `Fast gate`; the plugin never second-guesses the declaration.
- **Plans list commands and also a declared gate exists — conflict:** Fallback: the plan wins (Step 1.3 rule), consistent with "the plan is the source of truth" (`commands/implement.md:552-555`).
- **Changes don't reach real repos until a release** (installed plugin is a versioned cache): Fallback: test manual items with a local plugin directory, and bump the version as part of the PR.
- **Codex adapters drift:** `skills/workflow-*` reference canonical commands and need no body change; `npm test` (`tests/validate-codex-plugin.test.ts`) confirms adapters still resolve.

## Not Changed (deliberate)

- `skills/verification-before-completion/SKILL.md` — already 109 lines (over ADR-001); touching it would require a refactor outside this scope. Its IDENTIFY step stays generic; commands resolve the gate before it runs.
- `commands/check.md`, `commands/pr.md` — they do not run gates (spec Boundaries).

## References

- Feature spec: `docs/features/2026-10-30-verification-gates-audit.md`
- Pattern reference: `902e3be` (policy-risk), `commands/start.md:347-364`, `:477-485`, `skills/policy-risk/SKILL.md:1-5`
- Skill rules: `skills/skill-authoring/SKILL.md`, `docs/decisions/2026-04-29-skill-size-budget.md`
