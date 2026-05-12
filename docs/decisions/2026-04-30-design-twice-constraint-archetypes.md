---
id: ADR-004
date: 2026-04-30
status: accepted
type: convention
epic: EPIC-001
---

# Design-Twice Constraint Archetypes: Hard-Coded Set of Three

## Context

FEAT-025 introduces a "Design Alternatives" phase to `vt-plan --deep` that spawns parallel `software-architect` agents with different constraint instructions to produce architecturally distinct proposals. The constraint set determines what kinds of trade-offs the founder sees — too narrow a set produces convergent designs (and the phase becomes ceremony); too broad a set is bikeshedding and dilutes signal.

A choice was needed: configurable archetype set, or a fixed set; and if fixed, what the archetypes should be.

## Decision

The archetype set is fixed at three, hard-coded in `commands/vt-plan.md`:

1. **Archetype A — Minimize indirection:** favor Locality, avoid Pass-throughs, co-locate related changes.
2. **Archetype B — Maximize seams:** introduce Adapters at boundaries that may need swapping later; optimize for testability and replaceability.
3. **Archetype C — Minimize new surface area:** extend existing modules, keep modules Deep, avoid new abstractions.

The three archetypes are framed in terms from `skills/architecture-vocabulary/SKILL.md` (FEAT-024). The set is fixed — there is no configuration flag to swap or extend it.

## Alternatives Considered

- **Configurable archetype set (e.g., a frontmatter `archetypes:` field on the feature spec, or a config in `stack.md`)** — rejected as YAGNI. No founders have asked for it; configurability adds a maintenance surface (validation, documentation, defaults) that earns no value at the current scale.
- **Different archetype set** — testability / performance / extensibility was considered. Rejected because two of those three (performance, extensibility) are non-architectural concerns and don't map cleanly to the architecture-vocabulary terms; the chosen set (indirection / seams / surface) maps directly to Locality, Adapter, and Depth, which produces sharper trade-offs.
- **Two archetypes instead of three** — rejected because two designs force a binary choice that often misses a middle path; three creates breadth without bloat.
- **Five or more archetypes** — rejected as theatre. The wave-based parallel cap (`skills/subagent-driven-development/SKILL.md:111`) is 3, and presenting more designs in a comparison table degrades readability.

## Consequences

- The 3 archetypes are now load-bearing for the `--deep` planning experience. Changing them invalidates the architectural assumptions of every prior `--deep` plan and every ADR pre-filled with rejected alternatives.
- Future founders using the plugin will see exactly these 3 archetypes; the pattern is opinionated by design.
- If the success metric "convergence detection fires on >80% of runs" is hit during dogfooding, the failure-signal in the FEAT-025 spec triggers — revisit whether the archetype set is differentiated enough for the kinds of features being planned. That re-evaluation would supersede this ADR.
- Plugin-repo work (modifying markdown command files rather than code modules) may produce convergent designs more often than typical product code. If so, document as a known limitation; consider adding a plugin-specific archetype set behind a config later. For now, the same set applies everywhere.
