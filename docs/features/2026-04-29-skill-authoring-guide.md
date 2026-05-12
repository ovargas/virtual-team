---
id: FEAT-019
date: 2026-04-29
status: implemented
type: feature
triage: full
epic: EPIC-001
hub_decisions: [ADR-001]
plan: docs/plans/2026-04-29-skill-authoring-guide.md
research_level: light
yagni_verdict: build
tags: skill, authoring, meta, convention, infrastructure
---

# Skill Authoring Guide

> **Value:** Codify the rules for writing skills so that every skill in the plugin — existing and future — meets a consistent quality bar for size, structure, description, and discoverability.

## Problem

The plugin has 14 skills, and EPIC-001 will add several more. ADR-001 established a 100-line budget for SKILL.md files, but only 3 of 14 skills currently comply. The conventions for descriptions, reference files, scripts, and progressive disclosure exist in CLAUDE.md as 5 bullet points — not enough to ensure consistency. Without a codified authoring guide, each new skill reinvents structure decisions: where to split, what goes in frontmatter, how to write a description, when to add reference files vs inline content.

**Trigger:** EPIC-001 ship order #4. The PO flagged this as P3 for users but recommended shipping early because it gates the quality of all remaining EPIC-001 features (domain glossary, grilling, ADR convention, token mode, out-of-scope, arch vocabulary, design-twice — each creates or expands a skill).

**Current workaround:** Contributors read existing skills and pattern-match. Works for experienced contributors who know which skills to imitate, but produces inconsistent results — the humanizer skill is 559 lines, the skill-awareness skill is 27 lines, and there's no guidance on which pattern is appropriate when.

## YAGNI Assessment

**Verdict:** BUILD IT (as scoped, ~80-100 lines for the SKILL.md + review checklist)

Epic-driven (EPIC-001 ship order #4). PO validated necessity and timing. This is internal infrastructure — it doesn't add user-facing features but ensures quality of every feature that follows. Scope is intentionally small: one skill file with rules, one review checklist. No tooling, no automation, no linting.

**Not in scope (explicit no-gos):**
- Automated linting or enforcement tooling — the checklist is manual
- Retroactive refactoring of existing skills to comply — that happens when skills are touched, per ADR-001
- A `vt-skill` command for scaffolding — over-engineering for a convention doc
- Plugin manifest generation or registration automation
- Per-platform adaptation (Cursor, OpenCode, Codex differences)

## Solution

### What we're building

1. **`skills/skill-authoring/SKILL.md`** (~80-100 lines) — the meta-skill that defines how to write skills. Contains:
   - The 100-line SKILL.md budget (ADR-001) with guidance on when and how to split
   - Description format rules (max 1024 chars, third person, "Use when [triggers]")
   - Frontmatter requirements (`name`, `description`, optional `model`, `loaded_when`, `disable-model-invocation`)
   - File structure conventions (`skills/<name>/SKILL.md`, reference files in `references/` subdirectory)
   - When to add scripts (deterministic operations only — never AI judgment calls)
   - Progressive disclosure pattern: SKILL.md is the always-loaded prompt, reference files are lazy-loaded for sub-topics
   - Review checklist (the gate before merging a new or modified skill)

2. **Update `CLAUDE.md`** — add a reference to the skill-authoring skill under Conventions, replacing the existing 5 bullet points about skill structure with a pointer to the authoritative guide.

### What we're NOT building

- Automated enforcement or linting tools
- A `vt-skill` scaffolding command
- Retroactive refactoring of existing oversized skills
- Plugin manifest or registration helpers

### Rabbit holes to avoid

- **Over-specifying edge cases.** The guide is ~80-100 lines. It teaches the pattern; it doesn't cover every possible skill structure. Contributors can read existing skills for nuance.
- **Adding examples of every skill type.** One or two inline examples are enough. Don't turn the guide into a tutorial.
- **Creating reference files for this skill.** The irony of a skill-authoring guide that needs reference files because it's too long — keep it under budget.

## Definition of Done

**The feature is done when:**

1. `skills/skill-authoring/SKILL.md` exists with frontmatter (`name`, `description`) and content covering: size budget, description format, frontmatter rules, file structure, reference file pattern, script guidance, and review checklist.
2. The skill is under 100 lines (complies with its own rule — ADR-001).
3. `CLAUDE.md` references the skill-authoring skill for conventions.
4. The review checklist in the skill covers at minimum: line count, description format, frontmatter fields, cross-reference paths, and reference file structure.
5. `npm test` passes — frontmatter, file refs, and command refs all clean.

**Verification:**

Automated:
- [ ] `npm test` — passes
- [ ] `wc -l < skills/skill-authoring/SKILL.md` — under 100 lines
- [ ] `grep "name: skill-authoring" skills/skill-authoring/SKILL.md` — match
- [ ] `grep "skill-authoring" CLAUDE.md` — match (reference exists)

Manual:
- [ ] Read `skills/skill-authoring/SKILL.md` end-to-end: covers size budget, description format, frontmatter, file structure, reference files, scripts, review checklist
- [ ] The review checklist is actionable — each item is a yes/no check, not vague guidance
- [ ] Cross-check against ADR-001 — the skill correctly restates and extends the decision

## Success Metrics

**Leading indicators:**
- New skills created under EPIC-001 (domain glossary, grilling, etc.) comply with the guide on first draft
- Review feedback on new skills decreases ("fix your description format" disappears)

**Lagging indicators:**
- Average skill SKILL.md size trends downward as existing skills are refactored when touched
- Contributors (including the AI) produce structurally consistent skills without manual correction

**Failure signal:**
- The skill-authoring guide itself exceeds 100 lines (violates its own rule)
- Contributors ignore the guide and continue pattern-matching from existing skills — the guide adds no value

## Implementation Hints

### Existing patterns to follow

- **Pattern: well-structured skill.** `skills/test-driven-development/SKILL.md` (98 lines) is the best current example of a skill that complies with ADR-001 and uses reference files correctly. Two reference files in `references/` with `disable-model-invocation: true` frontmatter.
- **Pattern: frontmatter format.** All 14 existing skills use `name` and `description` fields. Some add `model`, `loaded_when`, `disable-model-invocation`. The skill-authoring guide should formalize which fields are required vs optional.
- **Pattern: description format.** All current descriptions follow third-person, "Use when [trigger]" format — e.g., `description: Use when implementing any feature or bugfix, before writing implementation code — enforces red-green-refactor cycle with configurable strictness`. This is the convention to codify.

### Integration points

- **`CLAUDE.md`** — modify the Conventions section to reference the skill-authoring skill. Current relevant lines: 22-26 (5 bullet points about skill structure). Replace with a concise pointer to the authoritative skill.
- **`skills/skill-authoring/SKILL.md`** — new file, new directory. No existing `skills/skill-authoring/` directory.
- **ADR-001** (`docs/decisions/2026-04-29-skill-size-budget.md`) — the skill references this decision. No modification needed to ADR-001 itself.

### API Contracts

No API contracts — this feature is internal documentation/convention only. No endpoints, events, or shared models.

### Data model considerations

None — no persistent state, no data model changes.

### Technical risks

| Risk | Mitigation |
|---|---|
| Skill-authoring guide exceeds 100 lines | Self-referential compliance check in DoD. The guide practices what it preaches. If it needs more than 100 lines, split into a reference file (modeling the pattern it teaches). |
| Existing non-compliant skills create confusion ("why doesn't X follow the rules?") | ADR-001 already addresses this: "Existing skills exceeding the limit should be refactored when touched (not proactively)." The guide should restate this. |
| Contributors skip the guide and continue ad-hoc pattern-matching | The review checklist makes compliance mechanical. When reviewing PRs that touch skills, the checklist is the gate. |

## Research Summary

Research level: **light** (no `--deep` flag).

Key findings:
- 14 existing skills; only 3 comply with the 100-line budget (TDD at 98, skill-awareness at 27, reference files at ~15-25)
- TDD skill (`skills/test-driven-development/`) is the model for correct structure: SKILL.md + `references/` subdirectory with lazy-loaded reference files using `disable-model-invocation: true`
- All descriptions follow "Use when [trigger]" in third person — consistent enough to formalize
- CLAUDE.md lines 22-26 cover skill conventions in 5 bullet points — these become the seed for the guide
- `tests/validate-frontmatter.test.ts` already validates `name` and `description` fields exist — the skill-authoring guide can reference this as enforcement

## Stories

**Group 1: Skill authoring guide** (single story, single branch)

1. **S-023: Create skill-authoring meta-skill and update CLAUDE.md**
   - Layers: new skill file (`skills/skill-authoring/SKILL.md`) + CLAUDE.md modification
   - Acceptance:
     - `skills/skill-authoring/SKILL.md` exists under 100 lines with: size budget, description format, frontmatter rules, file structure, reference file pattern, script guidance, and review checklist
     - `CLAUDE.md` conventions section references the skill-authoring skill
     - `npm test` passes
   - Demo: Read the skill end-to-end. Apply the review checklist to an existing skill (e.g., `skills/test-driven-development/SKILL.md`) — it should pass. Apply it to a non-compliant skill (e.g., `skills/humanizer/SKILL.md` at 559 lines) — the line-count check should fail.

**Milestones:**
- After S-023: FEAT-019 is shippable. All subsequent EPIC-001 features can reference this guide when creating or modifying skills.

**Execution strategy:**
- Group 1 -> `/vt-implement FEAT-019` runs the single story atomically (mirrors FEAT-017 and FEAT-018 pattern).

## References

- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001, ship order #4)
- ADR-001: `docs/decisions/2026-04-29-skill-size-budget.md` (100-line budget)
- Model skill: `skills/test-driven-development/SKILL.md` (98 lines, uses reference files)
- Model reference file: `skills/test-driven-development/references/rationalizations.md` (frontmatter with `disable-model-invocation: true`)
- CLAUDE.md conventions: lines 22-26 (current skill structure rules)
- Comparative review: `docs/reviews/2026-04-29-comparative-mattpocock-skills.md` (source of EPIC-001)

## Origin

Feature spec created on 2026-04-29 through structured intake driven by EPIC-001 (ship order #4).
Original epic description: "Create `skills/skill-authoring/SKILL.md` with concrete rules: SKILL.md under 100 lines (ADR-001), description format (max 1024 chars, third person, 'Use when [triggers]'), when to split files, when to add scripts (deterministic operations), progressive disclosure via reference files, review checklist."
