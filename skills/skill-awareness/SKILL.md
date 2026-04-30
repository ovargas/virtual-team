---
name: skill-awareness
description: Use when starting any session — maps contexts to behavioral skills that should be active
---

# Skill Awareness

Behavioral skills must be active when relevant, even in ad-hoc sessions without slash commands. This mapping tells you which skills to load based on what you're doing.

## Context-to-Skill Mapping

| Context | Skill to load | Trigger |
|---------|--------------|---------|
| Starting a pipeline | `virtual-team:triage` | Before `/vt-flow` executes any step, or when `/vt-feature`/`/vt-implement` need to determine ceremony level |
| Writing production code | `virtual-team:test-driven-development` | Before any Edit/Write to non-test files (reads `stack.md` `tdd:` field for mode: strict, recommended, off) |
| Writing production code | `virtual-team:design-principles` | Before writing function signatures, constructors, or service boundaries (reads `stack.md` `design:` field for mode: strict, recommended, off) |
| Claiming completion | `virtual-team:verification-before-completion` | Before saying "done", "complete", "passes" |
| Receiving review feedback | `virtual-team:receiving-code-review` | When processing review comments |
| Executing multi-task plan with `--sdd` | `virtual-team:subagent-driven-development` | When `/virtual-team:vt-implement --sdd` is active |
| User requests compressed output | `virtual-team:token-efficient` | User says "caveman mode", "terse", "compress", or similar activation phrase |

Project-provided domain and stack skills are NOT auto-triggered. They are discovered and loaded by `/virtual-team:vt-implement` Layer 1 based on `domain` and `stack` frontmatter fields matching the current work.

## Integration

- **Loaded by:** `SessionStart` hook in `hooks/hooks.json`
- **Reinforced by:** `PreToolUse` hook on `Edit|Write` calls (TDD + verification check)
- **Does NOT replace:** command-level skill loading in `/virtual-team:vt-implement` (Layer 0, 1, 2)
