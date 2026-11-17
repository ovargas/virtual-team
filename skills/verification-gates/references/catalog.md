---
name: verification-gates-catalog
description: Fixed catalog of verification capabilities with firing moments and applicability rules — read by /doctor gates and when declaring ## Verification
disable-model-invocation: true
---

# Verification Capability Catalog

Each entry names *what* a repo's verification protects and *when* it fires. It never names a tool. The project picks the mechanism and declares it under `## Verification` in `stack.md` (format: `skills/verification-gates/SKILL.md` section 6).

The catalog is fixed. Project-specific checks go in `extra / <id>` lines and are never promoted here.

| id | Protects | Fires | Applicable when |
|---|---|---|---|
| gate-file-protection | The gate files themselves (hook scripts, lint config, coverage floor) from edits by the agent | on edit | always |
| lint-suppression-ban | Lint rules from being silenced inline instead of fixed | on edit | `Lint:` set |
| fast-gate-on-edit | Quick feedback on each edited file before the next edit | on edit | always |
| fast-gate-on-turn-end | The fast gate passing before the agent ends its turn | agent turn end | always |
| full-gate-before-push | The full gate passing before code leaves the machine | before push | always |
| coverage-floor | Test coverage from dropping below the project's floor | full gate | `Test framework:` set |
| architecture-rules | Layer boundaries from being crossed (e.g., handler calling repo) | full gate | `Structure:` names layers |
| contract-drift | The published API contract from diverging from the code | full gate | `API style:` is OpenAPI, protobuf, or GraphQL |
| dependency-vuln-scan | Dependencies with known vulnerabilities from shipping | full gate | always |
| secret-scan | Credentials and keys from being committed | full gate | always |
| commit-pr-convention | Commit messages and PR titles from breaking the project convention | before push / PR | always |
| path-review-escalation | Sensitive paths from merging without a second reviewer | PR | `Mode: team` |
| migration-safety | Schema migrations from breaking running code or losing data | full gate | `Database:` and `Migrations:` set |

## Applicability Rules

- `always` applies to every service repo.
- A field condition reads that field from `stack.md`:
  - Concrete value → applicable.
  - Missing, empty, `none`, or `N/A` → not applicable (detected).
  - `TBD` → applicable, reported ⚠ "field is TBD".
- `Structure:` names layers when it lists two or more (e.g., `handler → service → repo`).
- `API style:` qualifies when it names OpenAPI or REST-with-spec, protobuf or gRPC, or GraphQL.
- `Database:` and `Migrations:` must both be set.
- When unsure, treat the capability as applicable. A false ⚠ is visible; a false "not applicable" hides a gap.

## Firing Moments

Moments are host-agnostic: `on edit`, `agent turn end`, `before push`, `before push / PR`, `full gate`, `PR`. Each host maps them to its own hook events (on Claude Code: `PostToolUse`/`PreToolUse` for edits, `Stop` for turn end). `full gate` means the check runs inside the declared `Full gate` command. `/virtual-team:doctor gates` checks registration in Claude Code settings and in git pre-push hooks; other host hook configs are not checked today.
