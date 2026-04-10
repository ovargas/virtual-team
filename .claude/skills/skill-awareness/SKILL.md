---
name: skill-awareness
description: Use when starting any session — maps contexts to behavioral skills that should be active
---

# Skill Awareness

Behavioral skills must be active when relevant, even in ad-hoc sessions without slash commands. This mapping tells you which skills to load based on what you're doing.

## Context-to-Skill Mapping

| Context | Skill to load | Trigger |
|---------|--------------|---------|
| Writing production code | `test-driven-development` | Before any Edit/Write to non-test files |
| Claiming completion | `verification-before-completion` | Before saying "done", "complete", "passes" |
| Receiving review feedback | `receiving-code-review` | When processing review comments |
| Executing multi-task plan with `--sdd` | `subagent-driven-development` | When `/implement --sdd` is active |

Domain skills (`api-design`, `data-layer`, `ui-design`, `service-layer`) are NOT auto-triggered. They remain command-driven via `/implement` Layer 1.

## Integration

- **Loaded by:** `SessionStart` hook in `.claude/settings.json`
- **Reinforced by:** `PreToolUse` hook on `Edit|Write` calls (TDD + verification check)
- **Does NOT replace:** command-level skill loading in `/implement` (Layer 0, 1, 2)
