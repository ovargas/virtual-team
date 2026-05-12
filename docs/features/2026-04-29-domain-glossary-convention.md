---
id: FEAT-020
date: 2026-04-29
status: implemented
type: feature
triage: full
epic: EPIC-001
plan: docs/plans/2026-04-29-domain-glossary-convention.md
hub_decisions: [ADR-001, ADR-002]
research_level: light
yagni_verdict: build
tags: [domain-modeling, vocabulary, pipeline-integration]
---

# Domain Glossary Convention (CONTEXT.md)

> **Value:** Give the pipeline a shared vocabulary layer so specs, plans, and code use consistent terminology — eliminating the manual corrections users make when AI-generated artifacts drift on domain language.

## Problem

The virtual-team plugin has `stack.md` for technical configuration but no equivalent for domain language. As projects grow, AI and humans drift on terminology — "order," "account," "user" mean different things in different contexts. Users experience this as inconsistent specs, plans, and generated code that require manual correction.

**Trigger:** Comparative review against mattpocock/skills found this gap. ADR-002 already defines the convention — this feature implements it.
**Current workaround:** Users manually correct AI-generated artifacts when it uses wrong terminology. No systematic way to enforce consistent language across pipeline stages.

## YAGNI Assessment

**Verdict:** BUILD IT

This solves a real, documented problem (terminology drift in AI-generated artifacts) and is a foundation for two downstream features (FEAT-GRILLING and FEAT-ADR-CONVENTION). The convention is optional and zero-cost for projects that don't use it. ADR-002 already defines the format, so design work is settled.

## Solution

### What we're building

1. **`skills/domain-glossary/SKILL.md`:** A behavioral skill that defines the CONTEXT.md convention — format, sections, when to read it, how to apply vocabulary to generated artifacts.
2. **Pipeline integration (5 commands):** Add "read CONTEXT.md if present" to the context-loading step of `vt-feature`, `vt-plan`, `vt-implement`, `vt-tech-review`.
3. **Scaffolding option in `vt-start`:** During the service interview, ask whether the user wants domain modeling. If yes, scaffold a `CONTEXT.md` template at the repo root.

### How it works

When a consumer project has a `CONTEXT.md` at its root, every pipeline command reads it during its context-loading phase. The glossary terms become constraints on generated text — specs use the defined terms instead of synonyms, plans reference the glossary when naming things, and tech reviews check for vocabulary consistency.

For new projects, `vt-start` offers to scaffold `CONTEXT.md` with empty sections. For existing projects, users create it manually or during a `/vt-feature` session where terminology questions arise.

The skill itself is not auto-triggered — it's reference material that commands consult. Commands don't load the skill; they read the project's `CONTEXT.md` file directly. The skill exists to document the convention for contributors.

### CONTEXT.md format (from ADR-002)

```markdown
# Domain Context

## Language

| Term | Definition | Avoid |
|------|-----------|-------|
| Order | A customer's request to purchase items | "transaction", "purchase" (too vague) |
| Fulfillment | The process of picking, packing, and shipping an order | "shipping" (only one part of fulfillment) |

## Relationships

- An **Order** contains one or more **Line Items**
- A **Line Item** references exactly one **Product**

## Example Dialogue

> "When a customer places an **order**, the system creates **line items** for each product and begins **fulfillment**."

## Flagged Ambiguities

- "User" — currently means both "customer" and "admin." Needs splitting when auth is implemented.
```

## Boundaries

### Explicitly NOT building
- **CONTEXT-MAP.md for multi-context repos** — deferred until a real project needs it. ADR-002 mentions it; we'll implement when there's demand.
- **Automatic CONTEXT.md maintenance** — that's FEAT-GRILLING's responsibility. This feature only reads the glossary, doesn't update it.
- **Standalone `/vt-glossary` command** — too much ceremony. CONTEXT.md is a file, not a workflow.
- **Enforcement or validation** — no linting, no CI checks. Commands use the vocabulary when present; they don't reject artifacts that deviate.

### Rabbit holes to avoid
- **Over-engineering the skill** — this is a convention doc, not a complex behavioral prompt. The skill should explain the format and when to read it. Keep it under 100 lines (ADR-001).
- **Deep integration into commands** — each command gets 2-3 lines added to its context-loading step. Don't rewrite command sections to "deeply integrate" domain language.

## Definition of Done

**The feature is complete when:**

1. `skills/domain-glossary/SKILL.md` exists, under 100 lines, documenting the CONTEXT.md convention
2. `vt-feature` reads CONTEXT.md during its "Establish project context" step (step 2 of Initial Response)
3. `vt-plan` reads CONTEXT.md during its "Read the full context" step (step 2 of Initial Response)
4. `vt-implement` reads CONTEXT.md during its Layer 1 context loading
5. `vt-tech-review` reads CONTEXT.md during its "Read context" step (step 2 of Initial Response)
6. `vt-start` offers to scaffold CONTEXT.md during the service interview and includes it in the project structure

**Verification:**

Automated:
- [ ] `npm test` — frontmatter validation passes for new skill file
- [ ] `npm test` — file reference validation passes for any cross-references

Manual:
- [ ] Read `skills/domain-glossary/SKILL.md` and confirm it's under 100 lines
- [ ] Read each modified command and confirm the CONTEXT.md integration is present and minimal (2-3 lines per command)
- [ ] Confirm `vt-start` Step 2 includes CONTEXT.md in the project structure tree
- [ ] Confirm `vt-start` interview has a domain modeling question

## Success Metrics

**Leading (immediate):**
- Pipeline commands reference CONTEXT.md vocabulary when the file is present in a consumer project
- `vt-start` offers scaffolding for CONTEXT.md during repo initialization

**Lagging (2-4 weeks):**
- Users who create CONTEXT.md report fewer terminology corrections in generated artifacts
- Downstream features (FEAT-GRILLING, FEAT-ADR-CONVENTION) can reference the glossary convention without redefining it

**Failure signal:**
- Users find CONTEXT.md adds overhead without improving artifact quality — if nobody creates one after 4 weeks, the convention is too much ceremony

## Implementation Hints

### Existing patterns to follow
- `skills/skill-authoring/SKILL.md` — recently created skill, follows ADR-001 budget. Use as template for structure and frontmatter.
- `commands/vt-feature.md:45-50` — the "Establish project context" step where CONTEXT.md reading should be added
- `commands/vt-plan.md:45-50` — the "Read the full context" step
- `commands/vt-implement.md:490-510` — Layer 0/1 skill loading section
- `commands/vt-tech-review.md:36-39` — the "Read context" step
- `commands/vt-start.md:58-83` — Step 2 project structure trees

### Integration points
- **5 commands** — `vt-feature`, `vt-plan`, `vt-implement`, `vt-tech-review`, `vt-start`
- **1 new skill** — `skills/domain-glossary/SKILL.md`
- **Tests** — existing `tests/validate-frontmatter.test.ts` will auto-validate the new skill's frontmatter

### API Contracts

No API contracts — this feature is internal (markdown skill + command file modifications only).

### Data model considerations
- No schema changes. CONTEXT.md is a convention for consumer projects, not a data model in this plugin.

### Technical risks
- **Context window pressure** — mitigated by ADR-001 (100-line budget). The skill itself is small, and commands only add 2-3 lines each.
- **Command file size creep** — each command gets a small addition. Total across 5 commands: ~15-20 lines added. Negligible.

## Research Summary

Research: Light — follows established codebase patterns.

Key findings:
- All 5 target commands have a clear "read context" step where CONTEXT.md integration fits naturally
- ADR-002 fully defines the CONTEXT.md format — no design decisions needed
- `skills/skill-authoring/SKILL.md` provides a recent template for skill structure
- No existing references to CONTEXT.md in the codebase — this is a clean addition

## Stories

### Group 1: Domain glossary convention (sequential, single branch)

1. **Create domain-glossary skill and integrate into pipeline commands** — A consumer project with CONTEXT.md gets its vocabulary used by all pipeline commands; vt-start offers to scaffold it
   Layers: new skill file + 5 command file modifications
   Acceptance: (1) Skill exists and passes frontmatter validation, (2) all 5 commands reference CONTEXT.md in their context-loading steps, (3) vt-start scaffolds CONTEXT.md on request
   Demo: Read any modified command and see the CONTEXT.md integration. Run `npm test` and see it pass.

**Milestone:** After Story 1, consumer projects can create CONTEXT.md and have it read by all pipeline stages. vt-start scaffolds it for new projects.

**Execution strategy:** Single story, single branch → `/virtual-team:vt-implement FEAT-020` implements it in one PR.

## References

- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001)
- ADR-002: `docs/decisions/2026-04-29-domain-glossary-convention.md`
- ADR-001: `docs/decisions/2026-04-29-skill-size-budget.md`
- Existing skill template: `skills/skill-authoring/SKILL.md`
- Related features: FEAT-GRILLING (will maintain CONTEXT.md), FEAT-ADR-CONVENTION (references glossary)

## Origin

Feature spec created on 2026-04-29 through structured intake.
Epic-driven: EPIC-001 feature #5 (FEAT-DOMAIN-GLOSSARY).
Original description: "Add domain glossary convention (CONTEXT.md)"
