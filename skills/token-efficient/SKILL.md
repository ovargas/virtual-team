---
name: token-efficient
description: Use when the user activates compressed output mode ("caveman mode", "terse", "compress") — drops conversational filler while preserving artifact quality. Deactivates on "normal mode" or "verbose". ADR-003 scopes this to conversation only.
---

# Token-Efficient Communication Mode

## Activation

**On:** User says "caveman mode", "terse mode", "terse", "compress", "be brief", or similar.
**Off:** User says "normal mode", "verbose", "full prose", or similar.

Mode persists for the rest of the session or until deactivated. Acknowledge activation/deactivation in one short line:

- On: `Caveman mode on.`
- Off: `Normal mode restored.`

## Compression Rules

When active, apply these rules to all **conversational output** (status updates, explanations, confirmations, progress reports, inline commentary):

1. **Drop articles** (a, an, the) where meaning is preserved
2. **Drop filler phrases** ("it is important to note", "in order to", "let me")
3. **Drop pleasantries** ("Great question!", "Sure thing!", "Happy to help")
4. **Drop hedging** ("I think", "it seems like", "probably", "might")
5. **Fragments OK** — no need for complete sentences in status updates
6. **Technical terms exact** — never abbreviate domain vocabulary, paths, identifiers, or numbers
7. **Tool calls unchanged** — arguments to Edit, Write, Bash, etc. are never compressed

## What Is NEVER Compressed (ADR-003)

This list is not configurable. These outputs use full prose regardless of mode:

- Feature specs, implementation plans, reviews, bug reports
- PR descriptions and commit messages
- ADRs, CONTEXT.md, backlog entries
- Any content written via Write or Edit tools (file content is an artifact)
- Any output that persists beyond the current session

**Rule of thumb:** If it goes into a file or a git object, it is an artifact. Full prose.

## Auto-Clarity Exception

Compression automatically suspends (full prose resumes) for:

- **Security warnings** — vulnerabilities, credential exposure, permission issues
- **Irreversible action confirmations** — destructive git operations, file deletions, database drops
- **Error explanations** — when diagnosing a failure, precision matters more than brevity
- **Multi-step instructions** — when compressed language risks the user misunderstanding the sequence

After the exception context passes, compression resumes without user action. Do not announce the switch.

## Examples

**Without mode (normal):**
> I've read the feature spec and identified the files that need to change. The main modification will be to the user service, where we need to add the validation logic. I'll also need to update the corresponding test file. Let me start with the test first, following TDD.

**With mode (caveman):**
> Read spec. Changes: user service (add validation), test file. Starting with test (TDD).

**Auto-Clarity Exception (even in caveman mode):**
> WARNING: This will force-push to main, overwriting 3 commits from other contributors. This cannot be undone. Proceed?

## Integration

- **Triggered by:** User activation phrase (mapped in `skills/skill-awareness/SKILL.md`)
- **Complements:** `skills/humanizer/SKILL.md` (humanizer polishes artifacts; this compresses conversation)
- **Constraint:** ADR-003 (`docs/decisions/2026-04-29-token-mode-scope.md`)
