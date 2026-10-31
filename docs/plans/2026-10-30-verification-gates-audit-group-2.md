---
date: 2026-10-30
feature: FEAT-028
spec: docs/features/2026-10-30-verification-gates-audit.md
status: done
scope: group 2 (S-041, S-042)
---

# Implementation Plan: Verification Capability Catalog and Doctor Gates Audit (Group 2)

## Overview

Add a fixed, host-agnostic capability catalog to the `verification-gates` skill (S-041), then a read-only `/virtual-team:doctor gates` audit that compares the catalog against each repo's `## Verification` declaration and reports ✓/⚠/○ (S-042). The catalog comes first because the audit reads it. Doctor never executes, installs, or edits anything; it evaluates and reports.

**Checkpoint skipped:** the spec places a go/no-go checkpoint (hand-declare GlamGo-api and the Flutter app) between S-041 and S-042. The founder chose to skip it on 2026-10-30. The declarations become manual verification items of this plan instead.

## Reference Implementation

The closest existing pattern is doctor's skill-coverage audit:
- `commands/doctor.md:13-17` — invocation list with the reserved `skills` namespace
- `commands/doctor.md:27-47` — locate `stack.md` and stop on hub repos
- `commands/doctor.md:95-139` — ✓/⚠ buckets and options-only recommendations
- `commands/doctor.md:153-165` — guidelines (read-only, never blocks, concise, add new checks as separate Steps)

Reference-file pattern for the catalog: `skills/policy-risk/references/known-pitfalls.md:1-5` (frontmatter with `disable-model-invocation: true`).

Adaptations: a third bucket (○ set aside), a mechanism-existence check, a hook-registration check on Claude Code, and a three-signal contradiction check.

## Pre-conditions

- [x] Group 1 (S-039, S-040) implemented on this branch
- [ ] Feature spec approved: `docs/features/2026-10-30-verification-gates-audit.md`
- [x] `npm install` done (`npm test` runs)

---

## Phase 1: Capability catalog and declaration format (S-041) ✅

### Overview

Maintainers get a list of what a repo's verification should protect, when each capability fires, and when it applies, plus the exact line format for declaring each one.

**After this phase:** A maintainer can write a full `## Verification` section for GlamGo-api using only `skills/verification-gates/SKILL.md` and its catalog.

### Step 1.1: Create the catalog reference file

**File:** `skills/verification-gates/references/catalog.md` (create)
**Pattern:** Follow `skills/policy-risk/references/known-pitfalls.md:1-5` for frontmatter.

**What to do:**
- Frontmatter: `name: verification-gates-catalog`, `description: Fixed catalog of verification capabilities with firing moments and applicability rules — read by /doctor gates and when declaring ## Verification`, `disable-model-invocation: true`.
- One table with columns `id | Protects | Fires | Applicable when`, with the 13 entries from the spec (`docs/features/2026-10-30-verification-gates-audit.md` "Catalog" table). Add a short "Protects" phrase per entry, stating *what* is protected, never *how* (no tool names).
- An "Applicability rules" section:
  - `always` applies to every service repo.
  - A field condition (`Lint:`, `Test framework:`, `Structure:`, `API style:`, `Database:` + `Migrations:`, `Mode:`) reads that field from `stack.md`.
  - Set to a concrete value → applicable. Missing, empty, `none`, or `N/A` → not applicable (detected). `TBD` → applicable, reported ⚠ "field is TBD".
  - `Structure:` applies when it names two or more layers (e.g., `handler → service → repo`). `API style:` applies when it names OpenAPI/REST-with-spec, protobuf/gRPC, or GraphQL. When unsure, treat the capability as applicable (a false ⚠ is visible, a false "n/a" hides a gap).
- A "Firing moments" note: moments are host-agnostic (`on edit`, `agent turn end`, `before push`, `full gate`, `PR`). Hosts map them to their own hook events; only Claude Code registration is checked in MVP.

### Step 1.2: Document capability lines in the skill

**File:** `skills/verification-gates/SKILL.md` (modify)
**Pattern:** Keep the existing section style; stay under 100 lines.

**What to do:**
- Replace the last bullet of section 2 ("Other lines in the section … Ignore them here.") with a pointer to a new section 6.
- Add `## 6. Capability Lines`:
  - Format: `- **<catalog-id>:** <mechanism>` where the mechanism is a command, hook script path, or file path.
  - `- **<id>:** n/a — <reason>` (reason mandatory).
  - `- **<id>:** deferred — <reason> (<backlog ref>)` (ref optional).
  - `- **extra / <id>:** <mechanism>` for project-local capabilities; checked for existence only, never promoted to the catalog.
  - The catalog lives in `skills/verification-gates/references/catalog.md`; `/virtual-team:doctor gates` audits these lines.
  - Pipeline commands still run only `Fast gate` and `Full gate`; capability lines never trigger execution.
- Add `/doctor gates audit` to `loaded_when` and the Integration list.

### Step 1.3: Point the `/start` template at the catalog

**File:** `commands/start.md` (modify)
**Pattern:** HTML comment style already used in the `## Verification` section added in group 1.

**What to do:**
- Under the `Full gate` line in the service template's `## Verification`, add:
  `<!-- Per-capability lines (mechanism | n/a — reason | deferred — reason): see skills/verification-gates/references/catalog.md. Run /virtual-team:doctor gates to see what is missing. -->`
- No new Round 7 questions; onboarding stays light.

### Phase 1 Verification

**Automated:**
- [x] Fast gate passes: `npm test`
- [x] `wc -l skills/verification-gates/SKILL.md` — under 100
- [x] `grep -c "^| " skills/verification-gates/references/catalog.md` — 14 (header + 13 entries; the separator row does not match)
- [x] `grep -rn "references/catalog.md" skills/verification-gates/SKILL.md commands/start.md` — one match per file

**Manual:**
- [ ] Hand-write a full `## Verification` for GlamGo-api from the catalog alone; note any entry whose wording does not fit

**Stop here.** Verify Phase 1 before proceeding.

---

## Phase 2: `/virtual-team:doctor gates` audit (S-042) ✅

### Overview

Maintainers run one command and see each applicable capability as declared and present (✓), needing a decision (⚠), or set aside with its reason (○).

**After this phase:** `/virtual-team:doctor gates` in GlamGo-api prints the report from the spec's Visual concept; bare `/virtual-team:doctor` prints the skill-coverage audit followed by the gates audit.

### Step 2.1: Invocation and routing

**File:** `commands/doctor.md` (modify)
**Pattern:** `commands/doctor.md:13-17`.

**What to do:**
- Frontmatter `description`: "Health check — audit stack.md against available skills and the verification capability catalog. Read-only, advisory, never gates."
- Intro paragraph (`:9`): mention both audits.
- Invocation list:
  - `/virtual-team:doctor` — skill-coverage audit, then gates audit
  - `/virtual-team:doctor skills` — Steps 1-9 only
  - `/virtual-team:doctor gates` — Steps 1-2, then Steps 10-14
- "When this runs": `/start` runs `doctor skills` (Step 2.4); the hook nudge mentions both audits.
- Step 2 hub message: "This is a hub repository. Doctor audits are for service repos only." (behavior unchanged: stop).

### Step 2.2: Gates audit steps

**File:** `commands/doctor.md` (modify) — insert after Step 9, before `## Important Guidelines`.
**Pattern:** Step format of `commands/doctor.md:49-147`; buckets of `:95-117`; options block of `:119-139`.

**What to do:** add a `## Gates Audit` heading, then:
- **Step 10: Load the catalog and the declaration.** Read `skills/verification-gates/references/catalog.md` and `stack.md` → `## Verification`. Missing section → every applicable capability is "not declared"; add a one-line note pointing to `skills/verification-gates/SKILL.md`.
- **Step 11: Resolve applicability** per the catalog's rules. Not-applicable entries are counted in the header line, not listed.
- **Step 12: Classify each applicable capability:**
  - ✓ **Declared and present:**
    - The mechanism is a file path that exists.
    - Or the mechanism is a command whose target exists: a `make <target>` with the target present in `Makefile`, an `npm run <script>` with the script present in `package.json`, or another named binary or script present in the repo. Otherwise, report ✓ with "(command not checked)".
    - **Claude Code registration:** when the mechanism is a script and the catalog's firing moment is a host hook moment (`on edit`, `agent turn end`, `before push` via a hook), confirm the script path appears under any hook event in `.claude/settings.json` or `.claude/settings.local.json`. Show `(registered: <Event>)`. Do not interpret matchers, order, or arguments.
  - ⚠ **Needs a decision:**
    - Applicable but not declared.
    - The mechanism path does not exist.
    - The script exists but is not registered (Claude Code only).
    - The governing field is `TBD`.
    - An `n/a` entry is contradicted (Step 13).
  - ○ **Set aside:** `n/a` and `deferred` entries, always with their reason and backlog ref.
  - `n/a` without a reason → ⚠ "n/a needs a reason".
  - `extra / <id>` lines → ✓ or ⚠ on existence only.
- **Step 13: Contradiction check.** Exactly three signals:
  - `contract-drift` is `n/a` but `openapi.*`, `*.proto`, or `*.graphql` exists.
  - `migration-safety` is `n/a` but a `migrations/` directory exists.
  - `lint-suppression-ban` is `n/a` but a linter config file exists (`.golangci.*`, `.eslintrc*`, `eslint.config.*`, `ruff.toml`, `analysis_options.yaml`, `.swiftlint.yml`).

  Each hit → ⚠ "n/a contradicted: <file> exists".
- **Step 14: Report and options.**
  - Header: `**Verification-gates audit** — N capabilities, A applicable, X not applicable (detected)`.
  - Buckets ✓ / ⚠ / ○ in that order, one line per item, empty buckets omitted.
  - When ⚠ is non-empty, print the options block: declare a mechanism, record `n/a — reason`, or defer with a backlog reference. End with "Doctor does not change any file."
  - On other hosts, append: `Note: hook registration is checked on Claude Code only; other hosts report existence.`

### Step 2.3: Guidelines

**File:** `commands/doctor.md` (modify)
**Pattern:** `commands/doctor.md:153-165`.

**What to do:**
- Guideline 1: extend to "never runs gate commands or hook scripts".
- Guideline 3: "one line per item" applies to both audits.
- Guideline 6: replace "Today this command does skill-coverage only" with the two audits; keep "add new sections as separate Steps".

### Step 2.4: `/start` runs only the skills audit

**File:** `commands/start.md` (modify)
**Pattern:** `commands/start.md:509-513`.

**What to do:**
- Change "Run `/virtual-team:doctor` once" to "Run `/virtual-team:doctor skills` once". Reason: a just-written `stack.md` has gates `TBD`, so the gates audit would be all ⚠.
- Add: "Mention that `/virtual-team:doctor gates` audits verification coverage once gates are declared."

### Step 2.5: Hook nudge and README

**Files:** `hooks/stack-md-changed` (modify), `README.md` (modify)
**Pattern:** `hooks/stack-md-changed:18`; `README.md:79`.

**What to do:**
- `hooks/stack-md-changed:18`: change the nudge to "stack.md was edited — run \`/virtual-team:doctor\` to refresh skill-coverage and verification-gates audits. (Advisory only; never blocks.)" Keep the string free of characters that break the `printf` JSON (no double quotes).
- `README.md:79`: extend the doctor row with one sentence: "`/virtual-team:doctor gates` reports which verification capabilities the repo declares, set aside, or still needs to decide."

### Phase 2 Verification

**Automated:**
- [x] Fast gate passes: `npm test`
- [x] `echo '{"file_path":"/x/stack.md"}' | CLAUDE_PLUGIN_ROOT=x bash hooks/stack-md-changed | python3 -m json.tool` — valid JSON containing "verification-gates"
- [x] `grep -n "doctor skills" commands/start.md` — present
- [x] `grep -n "Step 1[0-4]" commands/doctor.md` — Steps 10-14 present

**Manual:**
- [ ] `/virtual-team:doctor gates` in GlamGo-api — buckets match the declaration, reasons shown
- [ ] `n/a` on `contract-drift` with `openapi.yaml` present → ⚠
- [ ] An unregistered hook script → ⚠
- [ ] `/virtual-team:doctor` in a hub repo → stops as today
- [ ] `git status` clean after each doctor run (no files written)

**Stop here.** Verify Phase 2 before proceeding.

---

## Final Verification

**All automated checks:**
- [x] Full gate passes: `npm test`
- [x] `wc -l skills/verification-gates/SKILL.md` — under 100

**Manual testing:**
- [ ] GlamGo-api and the Flutter app: full declarations written, `/virtual-team:doctor gates` reports correct buckets (replaces the skipped checkpoint)
- [ ] Regression: `/virtual-team:doctor skills` output unchanged; `/virtual-team:start` still runs the skills audit

**Definition of done alignment:**
- [ ] DoD 4 (correct buckets, reasons, contradiction case, unregistered hook) — Phase 2, Steps 2.2
- [ ] DoD 5 (no writes, never blocks, hub stop) — Phase 2, Steps 2.1 and 2.3
- DoD 1-3 — delivered in group 1

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `skills/verification-gates/references/catalog.md` | create | 1 | 13 capabilities, applicability rules, firing moments |
| `skills/verification-gates/SKILL.md` | modify | 1 | Section 6 capability lines, loaded_when, Integration |
| `commands/start.md` | modify | 1, 2 | Template comment; Step 4 runs `doctor skills` |
| `commands/doctor.md` | modify | 2 | Routing, Steps 10-14, guidelines |
| `hooks/stack-md-changed` | modify | 2 | Nudge mentions both audits |
| `README.md` | modify | 2 | Doctor row mentions `doctor gates` |

## Risks and Fallbacks

- **Free-text `stack.md` fields cause false ⚠:** Fallback: keep matching coarse and treat uncertainty as applicable (visible); if more than two false ⚠ per repo appear (spec failure signal), tighten the rules in `catalog.md` only.
- **Catalog wording does not fit real repos (checkpoint skipped):** Fallback: the Phase 1 manual declaration of GlamGo-api is the early check; adjust wording before starting Phase 2.
- **Doctor (sonnet) over-interprets settings.json:** Fallback: Step 12 states the exact rule ("script path appears under any hook event") and the rabbit-hole boundary from the spec.
- **Changes do not reach installed plugins until release:** Fallback: test with a local plugin directory; bump the version in the PR.

## Implementation Notes

- Manual checks for Phases 1 and 2 were skipped at the founder's request (2026-10-30). The GlamGo-api and Flutter declarations remain open.
- Phase 1 count check: `grep -c "^| "` returns 14, not 15 — the separator row starts with `|-`. Plan text corrected; the catalog has all 13 entries.
- Deviation: `skills/workflow-doctor/SKILL.md` description updated to mention the gates audit, so the Codex adapter matches `commands/doctor.md`.
- Extra in Step 12: a line whose id is neither in the catalog nor prefixed `extra /` is reported ⚠ `unknown capability id` (catches typos).

## References

- Feature spec: `docs/features/2026-10-30-verification-gates-audit.md`
- Group 1 plan: `docs/plans/2026-10-30-verification-gates-audit.md`
- Pattern reference: `commands/doctor.md:13-165`, `skills/policy-risk/references/known-pitfalls.md:1-5`, `hooks/stack-md-changed:18-28`
