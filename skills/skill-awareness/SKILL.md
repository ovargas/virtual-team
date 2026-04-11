---
name: skill-awareness
description: Use when starting any session — maps contexts to behavioral skills that should be active
---

# Skill Awareness

Behavioral skills must be active when relevant, even in ad-hoc sessions without slash commands. This mapping tells you which skills to load based on what you're doing.

## Context-to-Skill Mapping

| Context | Skill to load | Trigger |
|---------|--------------|---------|
| Starting a pipeline | `virtual-team:triage` | Before `/flow` executes any step, or when `/feature`/`/implement` need to determine ceremony level |
| Writing production code | `virtual-team:test-driven-development` | Before any Edit/Write to non-test files (reads `stack.md` `tdd:` field for mode: strict, recommended, off) |
| Claiming completion | `virtual-team:verification-before-completion` | Before saying "done", "complete", "passes" |
| Receiving review feedback | `virtual-team:receiving-code-review` | When processing review comments |
| Executing multi-task plan with `--sdd` | `virtual-team:subagent-driven-development` | When `/virtual-team:implement --sdd` is active |

Domain skills (`virtual-team:api-design`, `virtual-team:data-layer`, `virtual-team:ui-design`, `virtual-team:service-layer`) are NOT auto-triggered. They remain command-driven via `/virtual-team:implement` Layer 1.

## Integration

- **Loaded by:** `SessionStart` hook in `hooks/hooks.json`
- **Reinforced by:** `PreToolUse` hook on `Edit|Write` calls (TDD + verification check)
- **Does NOT replace:** command-level skill loading in `/virtual-team:implement` (Layer 0, 1, 2)
