---
name: skill-authoring
description: Use when creating or modifying a skill — defines structure, size budget, description format, and review checklist for all skills in the plugin
---

# Skill Authoring Guide

## Size Budget (ADR-001)

SKILL.md files must stay **under 100 lines**. If content exceeds this, split into reference files in a `references/` subdirectory.

- Reference files use `disable-model-invocation: true` in frontmatter — they are data, not behavioral prompts
- SKILL.md is always loaded when the skill is active; reference files are loaded on demand
- Existing skills exceeding the limit should be refactored when touched, not proactively

## Frontmatter

**Required fields** (enforced by `tests/validate-frontmatter.test.ts`):

| Field | Rule |
|-------|------|
| `name` | Matches directory name, kebab-case |
| `description` | See Description Format below |

**Optional fields:**

| Field | When to use |
|-------|-------------|
| `model` | Override the default model (e.g., `model: sonnet` for mechanical tasks) |
| `loaded_when` | Document which commands load this skill |
| `disable-model-invocation` | Set `true` on reference files — marks them as data-only |

## Description Format

- **Max 1024 characters**
- **Third person**, not imperative (the description talks about the skill, not to the user)
- **Must include** "Use when [trigger condition]" — this guides the auto-triggering system
- Describe what the skill **enforces or enables**, not just what it is

Good: `Use when implementing any feature or bugfix, before writing implementation code — enforces red-green-refactor cycle with configurable strictness`

Bad: `TDD skill for testing` (no trigger, no enforcement description)

## File Structure

```
skills/<name>/
  SKILL.md              — Main file (always loaded, under 100 lines)
  references/           — Optional, lazy-loaded sub-topic files
    example.md          — Data tables, examples, checklists
```

- Cross-references use **root-relative paths**: `skills/git-practices/SKILL.md`
- Never use `.claude/skills/...` or relative `../` paths

## Progressive Disclosure

SKILL.md contains **behavioral rules** — the instructions the AI must follow when the skill is active. Keep it focused: conditions, rules, verification steps.

Reference files contain **supporting data** — comparison tables, example lists, rationalization catalogs, detailed checklists. They are read only when the specific sub-topic is relevant.

This split is how you stay under 100 lines without losing depth. See `skills/test-driven-development/` for the model: SKILL.md at 98 lines, with `references/test-quality.md` and `references/rationalizations.md` loaded on demand.

## Scripts

Scripts are for **deterministic operations only**: file manipulation, formatting, validation, template generation. Never use scripts for AI judgment calls.

- Skill-specific scripts go in the skill directory
- Shared scripts go in `scripts/` at the repo root

## Review Checklist

Before merging a new or modified skill, verify:

- [ ] SKILL.md is under 100 lines
- [ ] Frontmatter has `name` and `description`
- [ ] Description is under 1024 chars, third person, includes "Use when [trigger]"
- [ ] Cross-references use root-relative paths
- [ ] Reference files (if any) have `disable-model-invocation: true` in frontmatter
- [ ] Content split: behavioral rules in SKILL.md, data/examples in reference files
- [ ] `npm test` passes (frontmatter validation, file reference validation)
