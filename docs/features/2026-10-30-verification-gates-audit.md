---
id: FEAT-028
date: 2026-10-30
status: draft
type: feature
triage: full
research_level: skip
appetite: 3-4 weeks
yagni_verdict: slimmed
plan: docs/plans/2026-10-30-verification-gates-audit.md
tags: [doctor, stack-md, verification, gates, implement, flow, plan]
---

# Verification-Gates Declaration and Audit

> **Value:** Pipeline commands run the gates each project actually declared, and maintainers see their gate coverage — and every deliberate skip — in one scannable report, without the plugin ever touching a project's guards.

## Problem

Each project owns its physical guards (hooks, lint-suppression bans, coverage floors, architecture rules, secret scans), but nothing records which commands are the project's gates or which protections were consciously skipped. Pipeline commands therefore guess: `commands/flow.md:359` says "run the test command from `stack.md`", yet the `stack.md` template has no such field — only `Build:` and `Run locally:` (`commands/start.md:466-468`); `/plan` emits `[command]` placeholders (`commands/plan.md:442-444`); `/implement` falls back to "at minimum run the project's type checker and linter" (`commands/implement.md:559`).

**Trigger:** Founder insight across GlamGo-api (Go/Gin/GORM, extensive guards) and a Flutter app with a different stack.
**Current workaround:** Commands infer gate commands silently; maintainers keep gate coverage in their heads and re-read `settings.json`, Makefiles, and CI by hand per repo.

## YAGNI Assessment

**Verdict:** SLIMMED DOWN

Slice 1 (declared `fast`/`full` gates consumed by pipeline commands) fixes a live gap and stands on its own. Slice 2 (catalog + audit) depends on an unvalidated assumption — that maintainers will declare the full catalog — so it carries a go/no-go checkpoint: write the catalog, hand-declare it in GlamGo-api and the Flutter app, and build the `doctor gates` logic only once both declarations exist. The contradiction check is limited to three file signals; heuristic declaration suggestions move to v1.1.

## Division of Responsibility (design constraint)

- **Plugin owns the reasoning side:** the capability vocabulary, the declaration format, how commands consume declared gates, and how doctor evaluates the declaration.
- **Each project owns its physical guards:** implemented in the project's repo, reviewed through the project's own PRs.
- **The plugin never installs, wires, or runs guards on its own initiative.** Pipeline commands run only the `fast`/`full` commands the project declared. Doctor only reads and reports. A plugin release never changes a project's gates.

## Solution

### What we're building

1. **`verification-gates` skill** (`skills/verification-gates/SKILL.md` + `catalog.md`): defines the `## Verification` section format, the meaning of `fast` and `full` gates, the inferred-gate fallback, and the fixed, host-agnostic capability catalog.
2. **Declaration in `stack.md`:** `/start` adds `## Verification` to the template and gathers `fast`/`full` commands in Round 7. Existing repos add the section by hand.
3. **Gate consumption:** `/implement`, `/flow`, and `/flow-fix-pipeline` run the declared gates; `/plan` fills Final Verification from them. When no declaration exists, the command infers as today and prints the inferred command plus a one-line suggestion to declare it.
4. **`/virtual-team:doctor gates` audit:** reports each applicable capability as ✓/⚠/○, confirms mechanisms exist (and, on Claude Code, that hooks are registered), flags contradicted `n/a` entries, and always shows `n/a`/`deferred` reasons. Bare `/virtual-team:doctor` runs skill coverage first, then gates.
5. **Hook nudge:** `hooks/stack-md-changed` mentions both audits.

### How it works

**Declaration format** (bullets, matching every other `stack.md` section):

```markdown
## Verification
- **Fast gate:** `make check-fast`
- **Full gate:** `make check`
- **gate-file-protection:** `scripts/claude-hooks/guard-config.sh`
- **coverage-floor:** `make test` (floor in Makefile)
- **contract-drift:** `make swagger-check`
- **migration-safety:** deferred — no expand/contract check yet (S-0xx)
- **path-review-escalation:** n/a — single maintainer, no sensitive paths
- **extra / gist-overlap-test:** `internal/booking/overlap_test.go`
```

Each capability line is exactly one of: a mechanism (command, hook script, or file); `n/a — <reason>` (reason mandatory); `deferred — <reason>` with an optional backlog reference. `extra / <id>` lines are project-local capabilities checked for mechanism existence only.

**Gate consumption:** `fast` runs at phase boundaries in `/implement`; `full` runs at final verification in `/implement`, the post-implement gate in `/flow`, and the fix cycles in `/flow` and `/flow-fix-pipeline`. Without a declaration: `Inferred gate: <cmd> — declare it under ## Verification in stack.md`, printed once per run.

**Catalog** (`skills/verification-gates/catalog.md`). Each entry names *what* is protected and *when it fires*, never *how*. Applicability derives from existing `stack.md` fields; a field set to `TBD` counts as applicable and reports ⚠ "field is TBD".

| id | Fires | Applicable when |
|---|---|---|
| gate-file-protection | on edit | always |
| lint-suppression-ban | on edit | `Lint:` set |
| fast-gate-on-edit | on edit | always |
| fast-gate-on-turn-end | agent turn end | always |
| full-gate-before-push | before push | always |
| coverage-floor | full gate | `Test framework:` set |
| architecture-rules | full gate | `Structure:` names layers |
| contract-drift | full gate | `API style:` is OpenAPI, protobuf, or GraphQL |
| dependency-vuln-scan | full gate | always |
| secret-scan | full gate | always |
| commit-pr-convention | before push / PR | always |
| path-review-escalation | PR | `Mode: team` |
| migration-safety | full gate | `Database:` and `Migrations:` set |

The final list is confirmed after the two hand declarations (see Stories, group 2 checkpoint).

### Visual concept

```
**Verification-gates audit** — 13 capabilities, 11 applicable, 2 not applicable (detected)

✓ Declared and present (7):
- gate-file-protection → scripts/claude-hooks/guard-config.sh (registered: PreToolUse)
- fast-gate-on-turn-end → scripts/claude-hooks/stop.sh (registered: Stop)
- contract-drift → make swagger-check
...

⚠ Needs a decision (2):
- secret-scan — applicable, not declared
- fast-gate-on-edit — scripts/claude-hooks/post-edit.sh exists but is not registered in .claude/settings.json

○ Set aside (2):
- migration-safety — deferred: no expand/contract check yet (S-0xx)
- path-review-escalation — n/a: single maintainer, no sensitive paths

**Options for the maintainers:** declare a mechanism, record n/a with a reason,
or defer with a backlog reference. Doctor does not change any file.
```

## Boundaries

### Explicitly NOT building
- Executing gates from doctor — "exists + registered" is the ceiling.
- Non-zero exit or blocking — doctor stays advisory (`commands/doctor.md:3`, `:157`).
- Per-package declarations in monorepos — one declaration per repo; a mechanism may name a package-scoped command. Hub repos stay out of scope.
- Heuristic declaration suggestions when the section is missing — v1.1.
- `reviewed:` dates on `n/a`/`deferred` entries — v1.1.
- Hook-registration checks for Codex, Cursor, OpenCode — v1.1; those hosts get "exists" only.
- Shipping hook scripts, linters, or a gate engine; auto-fixing gaps; editing project gate files; prescribing tools.
- Promoting project `extra` capabilities into the plugin catalog.
- `/check` and `/pr` changes — `/check` is a knowledge quiz (`commands/check.md:3`) and `/pr` only describes testing (`commands/pr.md:167-179`).

### Rabbit holes to avoid
- Interpreting `settings.json` beyond "this script path appears under a hook event" — matchers, ordering, and arguments stay out.
- Wordsmithing catalog entries before the two hand declarations exist — the declarations are what validate the wording.
- Growing the contradiction check into general repo inference — exactly three signals in MVP: contract files (`openapi.*`, `*.proto`, `*.graphql`), a `migrations/` directory, linter config files.

## Definition of Done

**The feature is complete when:**

1. `/virtual-team:start` on a new service repo produces `stack.md` with a `## Verification` section containing `Fast gate` and `Full gate`.
2. In a repo with a declaration, a new `/virtual-team:plan` lists the declared commands in Final Verification (no `[command]` placeholders), and `/virtual-team:implement` and `/virtual-team:flow` run them.
3. In a repo without a declaration, `/virtual-team:implement` prints the inferred-gate line once and proceeds as today.
4. `/virtual-team:doctor gates` on GlamGo-api and the Flutter app reports correct ✓/⚠/○ buckets with every `n/a`/`deferred` reason shown; an `n/a` on `contract-drift` with an `openapi.yaml` present reports ⚠; an unregistered hook script reports ⚠.
5. Doctor writes no files, never blocks, and still stops on hub repos.

**Verification:**

Automated:
- [ ] `npm test` passes (frontmatter, file references, command references)
- [ ] `wc -l skills/verification-gates/SKILL.md` reports under 100 lines (ADR-001)

Manual:
- [ ] Run `/virtual-team:start` in a scratch repo; confirm the `## Verification` section
- [ ] Run `/virtual-team:plan` and `/virtual-team:implement` in GlamGo-api with `fast`/`full` declared; confirm declared commands appear and run
- [ ] Run `/virtual-team:implement` in a repo without the section; confirm the inferred-gate line
- [ ] Run `/virtual-team:doctor gates` in GlamGo-api and the Flutter app; confirm buckets, reasons, the contradiction case, and an unregistered hook
- [ ] Run `/virtual-team:doctor` in a hub repo; confirm it stops as today

## Success Metrics

**Leading (immediate):**
- Plans created in repos with a declaration contain zero `[command]` placeholders.
- Full declarations exist in GlamGo-api and the Flutter app (group 2 checkpoint).
- The `doctor gates` report stays one line per item and scannable in about 15 seconds.

**Lagging (2-4 weeks):**
- No observed run of the wrong or a partial gate in declared repos.
- At least one ⚠ item converted into a recorded decision (mechanism, `n/a`, or `deferred`).

**Failure signal:**
- The Flutter declaration stalls for more than a week → stop after group 1; Slice 1 stands alone.
- More than two false ⚠ per repo → revisit applicability rules before extending the catalog.

## Founder Context

- Decided during `/virtual-team:idea` (2026-10-30): catalog is fixed with project-local extras; applicability comes from `stack.md` fields; doctor checks "exists + registered" and never executes; stale-reason mitigation = contradiction check + reasons always shown + extended hook nudge; one declaration per repo; catalog phrased by firing moment so it stays host-agnostic, with registration checks only where the host is known (Claude Code in MVP).
- Undeclared repos keep inference, but the inferred command is printed so a wrong guess is visible.
- The Flutter app is the validation target for the "maintainers will declare the full catalog" assumption.
- GlamGo-api (`scripts/claude-hooks/{guard-config,pre-edit-nolint,post-edit,stop,pre-push}.sh`, `make check-fast`/`make check`, coverage floor with `scripts/coverage-exempt.txt`, go-arch-lint + `internal/archgate`, `make swagger-check`, govulncheck + gitleaks) is a sanity check for the catalog, not a template.

## Implementation Hints

### Existing patterns to follow
- Doctor audit structure — numbered Steps, ✓/⚠ buckets, options-not-edits recommendations, guidelines block: `commands/doctor.md:25-149`. The file already anticipates new checks as separate Steps (`commands/doctor.md:165`).
- Reserved invocation namespace for sub-audits: `commands/doctor.md:16-17` (`/virtual-team:doctor skills`).
- `stack.md` template and Round 7 interview: `commands/start.md:302-313`, `:440-500`.
- Hub detection and early stop: `commands/doctor.md:37-47`.
- Skill size budget and reference-file split: `docs/decisions/2026-04-29-skill-size-budget.md`; authoring rules in `skills/skill-authoring/SKILL.md`.
- Hook nudge output shape per host: `hooks/stack-md-changed:18-28`.

### Integration points
- `commands/start.md` — template section + Round 7 questions.
- `commands/implement.md:249`, `:359-361`, `:559` — phase and final verification.
- `commands/plan.md:440-446` — Final Verification block.
- `commands/flow.md:359`, `:447`, `:534` and `commands/flow-fix-pipeline.md:104-107` — gate runs.
- `skills/verification-before-completion/SKILL.md:30` — "Name the exact command" can point at the declared gates.
- `commands/doctor.md` — new Steps for the gates audit; invocation list.
- `hooks/stack-md-changed` — nudge text.
- `skills/skill-awareness/SKILL.md` — register the new skill if it needs auto-loading (likely not; it is loaded by commands).
- Codex adapters under `skills/workflow-*` reference canonical commands and need no body changes; host notes, if any, go in `skills/codex-host-adaptation.md`.

### API Contracts

No API contracts — this feature is internal to the plugin's markdown workflow specifications.

### Data model considerations
- `stack.md` gains one section; no migration. Repos without it keep working via the inferred-gate fallback.

### Technical risks
- Hook registration lookup differs across Claude Code settings files (`.claude/settings.json`, `.claude/settings.local.json`) — check both, report "registered" if either lists the script path.
- Applicability rules read free-text `stack.md` fields — keep matching coarse (set / not set / `TBD` / named value) and report uncertain matches as ⚠ rather than omitting them.

## Policy & Compliance Risks

Policy scan: no triggers. Internal developer tooling; no payments, store distribution, login, personal data, or third-party APIs.

## Research Summary

Research skipped — the doctor audit and `stack.md` interview patterns already exist in the codebase. Prior art that infers tool presence (e.g., OpenSSF Scorecard) answers a different question than a declared-then-verified model.

## Stories

**Group 1: Declared gates (Slice 1)** — sequential, one branch
1. **S-039: Declare and run fast and full gates** — adds the `verification-gates` skill (format, `fast`/`full` semantics, fallback), the `## Verification` section in the `/start` template and Round 7, and gate consumption in `/implement`, `/flow`, `/flow-fix-pipeline`.
   Acceptance: a repo with `fast`/`full` declared runs them in `/implement` and `/flow`; a repo without prints the inferred-gate line.
   Demo: `/implement` in GlamGo-api runs `make check-fast` at a phase boundary.
2. **S-040: Fill plan verification from declared gates** — `/plan` Final Verification uses the declared commands.
   Acceptance: a new plan in a declared repo has no `[command]` placeholders.
   Demo: a fresh GlamGo-api plan lists `make check`.

**Group 2: Catalog and audit (Slice 2)** — sequential, one branch, after Group 1 merges
3. **S-041: Add the verification capability catalog** — `catalog.md` with entries, firing moments, applicability rules, and per-capability declaration lines in the template.
   Acceptance: the catalog is complete enough to hand-declare GlamGo-api and the Flutter app.
   **Checkpoint (go/no-go, outside this repo):** both repos carry a full `## Verification` declaration. If the Flutter declaration stalls for more than a week, stop here.
4. **S-042: Add the doctor gates audit** — `/virtual-team:doctor gates` report (✓/⚠/○, exists + registered on Claude Code, contradiction check on three signals, reasons always shown, options-only recommendations), bare `/doctor` runs both audits, hook nudge mentions both.
   Acceptance: DoD items 4 and 5 hold on GlamGo-api, the Flutter app, and a hub repo.
   Demo: the report in the Visual concept above, produced from GlamGo-api.

**Milestones:**
- After S-039: pipeline commands run declared gates — the core value is live.
- After Group 1: plans and runs agree on the same commands.
- After the S-041 checkpoint: evidence on whether the full catalog is worth auditing.
- After Group 2: gate coverage is reviewable in one report.

## References

- Codebase references: `commands/doctor.md`, `commands/start.md:302-313`, `:440-500`, `commands/flow.md:359`, `commands/implement.md:249`, `:559`, `commands/plan.md:440-446`, `hooks/stack-md-changed`
- Decisions: `docs/decisions/2026-04-29-skill-size-budget.md` (ADR-001)
- Related features: none directly; extends the `/doctor` skill-coverage audit

## Origin

Feature spec created on 2026-10-30 through structured intake (`/virtual-team:idea`, then `/virtual-team:feature FEAT-028`).
Original description: "Extend `/virtual-team:doctor` with a verification-gates audit: a plugin-owned, stack-agnostic capability catalog (what, not how, each with an applicability condition); a project-side declaration (`## Verification` in `stack.md`) with mechanism | n/a (mandatory reason) | deferred (reason, optional backlog ref); a ✓/⚠/○ report with suggested next actions phrased as options; and one thin interface where `/implement`, `/check`, `/pr` read the declared fast/full gate commands. The plugin never installs, wires, or runs project guards. Doctor only evaluates and reports."
