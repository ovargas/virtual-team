---
name: skill-awareness
description: Use when starting any session — maps contexts to behavioral skills that should be active
---

# Skill Awareness

Behavioral skills must be active when relevant, even in ad-hoc sessions without slash commands. This mapping tells you which skills to load based on what you're doing.

## Always Active — Grounded Claims

This rule needs no trigger. It applies from the first message of every session, including ad-hoc ones.

**A recalled fact and a verified fact must never look the same in your output.**

- **Label it.** Any claim about this repo, an external library, or a memory/prior-session fact that you have not confirmed with a tool call in *this* session is marked inline: `(unverified — from training)`, `(unverified — prior session)`. A verified claim cites `file:line`, a quoted snippet, or command output instead.
- **Verify it if it's load-bearing.** If a code change, plan step, command, or founder decision would rest on the claim, confirm it *before* building on it — however confident you are. If you can't tell whether it's load-bearing, it is.
- **Gaps stay open.** "I don't know, and here's what would tell us" is a complete answer. Never close a gap with a plausible guess.

Load `virtual-team:grounded-claims` for the full protocol and the rationalization catalog.

## Context-to-Skill Mapping

| Context | Skill to load | Trigger |
|---------|--------------|---------|
| Starting a pipeline | `virtual-team:triage` | Before `/flow` executes any step, or when `/feature`/`/implement` need to determine ceremony level |
| Writing production code | `virtual-team:test-driven-development` | Before any Edit/Write to non-test files (reads `stack.md` `tdd:` field for mode: strict, recommended, off) |
| Writing production code | `virtual-team:design-principles` | Before writing function signatures, constructors, or service boundaries (reads `stack.md` `design:` field for mode: strict, recommended, off) |
| Claiming completion | `virtual-team:verification-before-completion` | Before saying "done", "complete", "passes" |
| Asserting a fact a decision rests on | `virtual-team:grounded-claims` | Before stating how existing code, a dependency, or a recalled fact behaves (summary above is always active) |
| Defining or changing behavior around payments, app-store distribution, login, personal data, or third-party APIs | `virtual-team:policy-risk` | Before committing to a design that a store, payment provider, or regulator could reject |
| Receiving review feedback | `virtual-team:receiving-code-review` | When processing review comments |
| Executing multi-task plan with `--sdd` | `virtual-team:subagent-driven-development` | When `/virtual-team:implement --sdd` is active |
| User requests compressed output | `virtual-team:token-efficient` | User says "caveman mode", "terse", "compress", or similar activation phrase |
| Generating client-facing prose in /idea or /proposal | `virtual-team:positive-framing` | When `/idea` Round 5 or `/proposal` Phase 6 reaches the editorial step |

Project-provided domain and stack skills are NOT auto-triggered. They are discovered and loaded by `/virtual-team:implement` Layer 1 based on `domain` and `stack` frontmatter fields matching the current work.

## Integration

- **Loaded by:** `SessionStart` hook in `hooks/hooks.json`
- **Reinforced by:** `PreToolUse` hook on `Edit|Write` calls (TDD + verification check)
- **Does NOT replace:** command-level skill loading in `/virtual-team:implement` (Layer 0, 1, 2)
