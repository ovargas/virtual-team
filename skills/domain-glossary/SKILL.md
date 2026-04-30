---
name: domain-glossary
description: Use when a consumer project has a CONTEXT.md file — defines the domain glossary convention for consistent terminology across specs, plans, and code. Pipeline commands read CONTEXT.md during context loading and use its vocabulary in generated artifacts.
---

# Domain Glossary Convention

## What It Is

`CONTEXT.md` is an optional file at the repository root that defines the project's domain language. It gives the pipeline a shared vocabulary so specs, plans, and code use consistent terminology.

**CONTEXT.md is optional.** Commands work without it. When present, commands read it during context loading and prefer its defined terms over synonyms.

## When to Create One

Create `CONTEXT.md` when:
- The same concept has multiple names in specs or code ("order" vs "transaction" vs "purchase")
- New team members (or AI) use wrong terms because the domain isn't documented
- `vt-start` offers to scaffold it during repo initialization

## Format

```markdown
# Domain Context

## Language

| Term | Definition | Avoid |
|------|-----------|-------|
| [Term] | [What it means in this project] | [Synonyms to avoid] |

## Relationships

- A **[Term A]** contains one or more **[Term B]**
- A **[Term B]** references exactly one **[Term C]**

## Example Dialogue

> "When a customer places an **order**, the system creates **line items**..."

## Flagged Ambiguities

- "[Term]" — currently means both X and Y. Needs splitting when [condition].
```

## Pipeline Behavior

Commands that read `CONTEXT.md`:
- **vt-feature** — uses vocabulary when writing the feature spec
- **vt-plan** — references terms when naming phases, steps, and components
- **vt-implement** — uses terms in variable names, function names, comments, and commit messages; avoids synonyms listed in the "Avoid" column
- **vt-tech-review** — checks that code uses defined vocabulary consistently; flags terminology drift

## Graceful Degradation

- No `CONTEXT.md` → commands proceed normally, no warning
- Empty sections → skip those sections, use what's populated
- Ambiguities listed → flag them in generated artifacts when the ambiguous term appears

## Related

- ADR-002 defines this convention: `docs/decisions/2026-04-29-domain-glossary-convention.md`
- `vt-start` scaffolds CONTEXT.md when the user opts in during repo initialization
- The grilling skill (future) will maintain CONTEXT.md inline during interviews
