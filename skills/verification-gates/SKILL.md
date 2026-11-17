---
name: verification-gates
description: Use when running or writing verification steps in a service repo — resolves the project's declared fast and full gate commands from the ## Verification section of stack.md, runs them verbatim, and falls back to a visible inferred command when none is declared
loaded_when: /implement phase and final verification, /flow gate after /implement and fix cycles, /flow-fix-pipeline, /plan verification blocks, /doctor gates audit
---

# Verification Gates

The project decides how its work is verified. The plugin runs the commands the project declared, at the moments this skill names, and nothing else.

## 1. Ownership

- The project owns its gates: hook scripts, linters, Makefile targets, CI.
- The plugin **never** installs, edits, or wires them, and never edits `stack.md` to declare them.
- The plugin runs only the declared `Fast gate` and `Full gate` commands (or the inferred fallback below).

## 2. Declaration Format

Service-repo `stack.md`:

```markdown
## Verification
- **Fast gate:** `make check-fast`
- **Full gate:** `make check`
```

- One command per line, run from the repository root.
- `TBD` counts as not declared.
- Other lines in the section are capability lines (section 6). Ignore them when resolving gates.

## 3. Which Gate When

| Moment | Gate |
|---|---|
| Phase boundary in `/implement` | fast |
| Final verification in `/implement` | full |
| `/flow` gate after `/implement`, and the end of an auto-fix cycle | full |
| After each fix and at the end of `/flow-fix-pipeline` | full |
| Before claiming completion | full |

A plan that lists its own verification commands wins. Declared gates fill the gaps where a plan lists none. They never override the plan.

## 4. Resolve the Command

1. Read `stack.md` → `## Verification`.
2. **Declared:** use the command verbatim. Do not add flags, narrow it to changed files, or swap it for a faster one.
3. **Only one declared:**
   - Only `Full gate` → use it for `fast` too.
   - Only `Fast gate` → infer `full` (step 4).
4. **Not declared** (no section, missing line, or `TBD`):
   - Infer from the project the same way you would without this skill: Makefile targets, package scripts, the stack's test, lint, and typecheck tools.
   - Print once per command run:
     ```
     Inferred gate: <cmd> — declare it under ## Verification in stack.md
     ```
   - Proceed with the inferred command.

**Trust:** gates execute repo code, the same as running the project's tests. Running them in an untrusted repo carries the same risk as running its test suite; a declared gate adds no new exposure. Review `stack.md` changes from untrusted contributors like any other code change.

## 5. Failure Handling

- A failing declared gate is a failing verification. Fix the cause and re-run the same command.
- Never substitute a different or narrower command to get a pass.
- If the gate itself is broken (missing target, tool not installed), stop and report it to the founder. Fixing the project's gate is the project's call.

## 6. Capability Lines

The same section can declare, per capability in `skills/verification-gates/references/catalog.md`, how the project covers it. Each line is exactly one of:

- `- **<catalog-id>:** <mechanism>` — a command, hook script path, or file path
- `- **<catalog-id>:** n/a — <reason>` — the reason is mandatory
- `- **<catalog-id>:** deferred — <reason> (<backlog ref>)` — the ref is optional
- `- **extra / <id>:** <mechanism>` — a project-local capability, checked for existence only

`/virtual-team:doctor gates` audits these lines. Pipeline commands never run them; they run only `Fast gate` and `Full gate`.

## Integration

This skill is loaded by:
- `commands/implement.md` — phase and final verification
- `commands/flow.md` — gate after `/implement`, auto-fix cycle, inline mode
- `commands/flow-fix-pipeline.md` — fix-cycle verification
- `commands/plan.md` — Phase and Final Verification blocks
- `commands/doctor.md` — gates audit of capability lines
