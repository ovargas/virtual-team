---
name: adr-convention
description: Use when creating, reviewing, or referencing architectural decision records — defines the ADR format, three-gate creation threshold, and local/hub flavors
---

# ADR Convention

## Three-Gate Threshold

Only create an ADR when **ALL THREE** gates are true:

1. **Hard to reverse** — changing this decision later requires significant rework
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed with different pros/cons

If any gate fails, the decision is normal engineering — document it in the spec, plan, or code comment instead.

## Format

File: `docs/decisions/YYYY-MM-DD-<kebab-slug>.md`

```yaml
---
id: ADR-NNN        # Sequential. Scan docs/decisions/*.md for highest existing ID, increment.
date: YYYY-MM-DD
status: accepted   # accepted | superseded
type: technical    # technical | contract | convention | infrastructure | data
epic: EPIC-NNN     # Optional. Link to parent epic if applicable.
repos: [repo-a]    # Hub flavor only. Omit for local decisions.
---
```

Four required body sections:

```markdown
# [Decision Title]

## Context
[Why this decision was needed. What problem or constraint triggered it.]

## Decision
[What was decided. Concrete, actionable statements.]

## Alternatives Considered
[What else was evaluated and why it was rejected. Brief — one line per alternative is fine.]

## Consequences
[What follows from this decision. Cross-reference enforcement docs if they exist.]
```

## Hub Variant

Hub agreements (cross-repo decisions) add:
- `repos:` frontmatter field (required) — which repos are affected
- `## Affected Repos` section with per-repo details
- `### Details` sub-section under Decision for repo-specific implementation notes
- Default type is `contract` unless the agreement is a convention or infrastructure decision

## Pipeline Integration

| Command | Role | Behavior |
|---------|------|----------|
| `vt-plan` | Active | Three-gate check after plan review; prompt to create ADR or flag for review |
| `vt-feature` | Light | Prompt on YAGNI overrides and non-obvious approach decisions |
| `vt-tech-review` | Passive | Read existing ADRs; tag findings as ADR candidates; never auto-create |
| `vt-start` | Reference | Point to this skill for local ADR format |
| `vt-epic` | Reference | Point to this skill for hub ADR format |

## ID Generation

Scan all `docs/decisions/*.md` files for `id: ADR-NNN` in frontmatter. Take the highest number, increment by one. If no ADR files exist, start at ADR-001.

## Related

- ADR-001 defines the skill size budget: `docs/decisions/2026-04-29-skill-size-budget.md`
- ADR-002 defines the domain glossary: `docs/decisions/2026-04-29-domain-glossary-convention.md`
- ADR-003 defines token mode scope: `docs/decisions/2026-04-29-token-mode-scope.md`
- `skills/skill-authoring/SKILL.md` enforces the 100-line budget from ADR-001
