---
date: 2026-04-29
feature: FEAT-019
spec: docs/features/2026-04-29-skill-authoring-guide.md
status: approved
---

# Implementation Plan: Skill Authoring Guide

## Overview

Create `skills/skill-authoring/SKILL.md` — a meta-skill that codifies the rules for writing skills: the 100-line SKILL.md budget (ADR-001), description format, frontmatter requirements, file structure, reference file pattern, script guidance, and a review checklist. Also update `CLAUDE.md` to reference this skill as the authoritative guide for skill conventions. The change is atomic — one new skill file, one small CLAUDE.md edit, one commit.

## Reference Implementation

The closest existing pattern is the TDD skill:
- `skills/test-driven-development/SKILL.md` (98 lines) — a skill that complies with ADR-001 and demonstrates the reference file pattern
- `skills/test-driven-development/references/rationalizations.md:1-5` — frontmatter for a reference file with `disable-model-invocation: true`
- `skills/test-driven-development/references/test-quality.md:1-5` — same pattern, data-only reference file

This plan follows the same structure: a SKILL.md under 100 lines with frontmatter (`name`, `description`), clear sections, and a verification checklist at the end.

## Pre-conditions

Before starting implementation:
- [ ] Feature spec is approved: `docs/features/2026-04-29-skill-authoring-guide.md`
- [ ] ADR-001 is accepted: `docs/decisions/2026-04-29-skill-size-budget.md` — confirmed (status: accepted)

---

## Phase 1: Create Skill-Authoring Skill and Update CLAUDE.md (end-to-end)

### Overview
Create the skill-authoring meta-skill and update CLAUDE.md to reference it. After this phase, the plugin has a codified guide for writing skills that all subsequent EPIC-001 features must follow.

**After this phase:** Reading `skills/skill-authoring/SKILL.md` gives a contributor everything they need to write a compliant skill. The review checklist provides a mechanical gate for skill PRs.

### Step 1.1: Create skill-authoring SKILL.md
**File:** `skills/skill-authoring/SKILL.md` (create)
**Pattern:** Follow `skills/test-driven-development/SKILL.md` for overall structure (frontmatter, sections, verification checklist at the end).

**What to do:**
Create directory `skills/skill-authoring/` and file `SKILL.md`. The skill must cover these topics in this order:

1. **Frontmatter:** `name: skill-authoring`, `description:` following the "Use when [trigger]" format. Something like: "Use when creating or modifying a skill — defines structure, size budget, description format, and review checklist for all skills in the plugin."

2. **SKILL.md Budget (ADR-001):** State the rule — SKILL.md files must stay under 100 lines. When content exceeds this, split into reference files in a `references/` subdirectory. Reference files use `disable-model-invocation: true` in frontmatter so they're data-only, not behavioral prompts.

3. **Frontmatter Requirements:** Define required fields (`name`, `description`) and optional fields (`model`, `loaded_when`, `disable-model-invocation`). Note that `tests/validate-frontmatter.test.ts` enforces required fields.

4. **Description Format:** Max 1024 characters. Third person. Must include "Use when [trigger condition]" to guide the auto-triggering system. Must describe what the skill enforces or enables, not just what it is. Reference existing good examples from the codebase.

5. **File Structure:** `skills/<name>/SKILL.md` is the main file. Optional `references/` subdirectory for lazy-loaded content. Cross-references use root-relative paths (e.g., `skills/git-practices/SKILL.md`).

6. **Progressive Disclosure:** SKILL.md is always loaded when the skill is active — keep it focused on behavioral rules. Reference files are loaded on demand for sub-topics (test quality tables, rationalization lists, detailed examples). This is how you stay under 100 lines without losing depth.

7. **Scripts:** Only for deterministic operations (file manipulation, formatting, validation). Never for AI judgment calls. Scripts go in the skill directory or in `scripts/` if shared.

8. **Review Checklist:** A yes/no gate for new or modified skills:
   - [ ] SKILL.md is under 100 lines
   - [ ] Frontmatter has `name` and `description`
   - [ ] Description is under 1024 chars, third person, includes "Use when [trigger]"
   - [ ] Cross-references use root-relative paths
   - [ ] Reference files (if any) have `disable-model-invocation: true`
   - [ ] Content split: behavioral rules in SKILL.md, data/examples in reference files
   - [ ] `npm test` passes (frontmatter validation, file reference validation)

**Target size:** 80-100 lines. The skill must comply with its own rule.

### Step 1.2: Update CLAUDE.md conventions section
**File:** `CLAUDE.md` (modify)
**Pattern:** Existing format at lines 20-26

**What to do:**
In the Conventions section, keep the existing bullet points (they're still accurate as quick-reference) but add a line referencing the skill-authoring skill as the authoritative guide. After the last convention bullet (line 26), add:

```
- For detailed skill authoring rules (size budget, descriptions, reference files, review checklist), see `skills/skill-authoring/SKILL.md`
```

This keeps CLAUDE.md concise while pointing to the full guide. Do NOT delete the existing convention bullets — they serve as a quick reference and are validated by tests.

### Phase 1 Verification

**Automated:**
- [ ] `npm test` — passes (frontmatter, file refs, command refs all clean)
- [ ] `wc -l < skills/skill-authoring/SKILL.md` — under 100 lines
- [ ] `grep "name: skill-authoring" skills/skill-authoring/SKILL.md` — match
- [ ] `grep "skill-authoring" CLAUDE.md` — match (reference exists)

**Manual:**
- [ ] Read `skills/skill-authoring/SKILL.md` end-to-end: covers size budget, description format, frontmatter, file structure, reference files, scripts, review checklist
- [ ] The review checklist has yes/no items (not vague guidance)
- [ ] Apply the review checklist to `skills/test-driven-development/SKILL.md` — it should pass (98 lines, proper frontmatter, reference files with correct frontmatter)
- [ ] Apply the review checklist to `skills/humanizer/SKILL.md` — the line-count check should fail (559 lines)

**Stop here.** Single phase — this IS the entire implementation.

---

## Final Verification

**All automated checks:**
- [ ] `npm test` — passes
- [ ] Manual read-through confirms the skill is self-consistent and under budget

**Definition of done alignment:**
- [ ] DoD 1 (`skills/skill-authoring/SKILL.md` exists with all required content) — Step 1.1
- [ ] DoD 2 (skill is under 100 lines — ADR-001 compliance) — Step 1.1 + Phase 1 Verification
- [ ] DoD 3 (`CLAUDE.md` references the skill) — Step 1.2
- [ ] DoD 4 (review checklist covers: line count, description format, frontmatter, cross-refs, reference files) — Step 1.1
- [ ] DoD 5 (`npm test` passes) — Phase 1 Verification

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `skills/skill-authoring/SKILL.md` | create | 1 | Meta-skill, ~80-100 lines, covers all authoring rules + review checklist |
| `CLAUDE.md` | modify | 1 | Add reference to skill-authoring skill in Conventions section |

## Risks and Fallbacks

- **Risk: Skill exceeds 100 lines while trying to cover all topics.** Mitigation: keep each section to 3-5 lines of rules, not explanations. If the skill hits the budget, extract the review checklist into `references/review-checklist.md` — modeling the very pattern it teaches.
- **Risk: Existing non-compliant skills create confusion.** Mitigation: ADR-001 already addresses this — "existing skills exceeding the limit should be refactored when touched." The skill-authoring guide should restate this principle explicitly.
- **Risk: CLAUDE.md update breaks an existing test.** Mitigation: the addition is a new bullet point, not a replacement. `tests/validate-file-refs.test.ts` will validate the new cross-reference to `skills/skill-authoring/SKILL.md`.

## References

- Feature spec: `docs/features/2026-04-29-skill-authoring-guide.md`
- ADR-001: `docs/decisions/2026-04-29-skill-size-budget.md`
- Pattern reference: `skills/test-driven-development/SKILL.md` (compliant model), `skills/test-driven-development/references/rationalizations.md` (reference file pattern)
- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001, ship order #4)
