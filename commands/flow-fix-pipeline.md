---
name: flow-fix-pipeline
description: Bug fix pipeline for /flow --fix mode. Loaded conditionally by flow.md when --fix is passed.
---

## Bug Fix Pipeline (`--fix` mode)

When `--fix` is passed, the orchestrator runs a compressed pipeline designed for bug fixes:

```
/virtual-team:bug → /virtual-team:debug → implement fix → /virtual-team:review + /virtual-team:validate  → /pr
```

No `/virtual-team:feature`, `/virtual-team:contracts`, or formal `/virtual-team:plan` — the bug report and debug investigation serve as the spec. The debug output (root cause, all occurrences, suggested fix) becomes the implementation guide.

### Mode Detection

The orchestrator checks for `--fix` at startup:
- `--fix` present → run the bug fix pipeline (this section)
- `--fix` absent → run the feature pipeline (above)

This is explicit, not inferred. The user decides whether they're fixing a bug or building a feature.

### Input Handling

- `/virtual-team:flow --fix "description"` → description becomes input to `/virtual-team:bug`
- `/virtual-team:flow --fix BUG-NNN` → skip `/virtual-team:bug`, load the existing report, start at `/virtual-team:debug`
- `/virtual-team:flow --fix --quick "description"` → skip `/virtual-team:bug`, description becomes input to `/virtual-team:debug`

### Gate: After /bug

**Check for:**
- Bug report has reproduction steps (at minimum, what was observed and what was expected)
- Severity is set
- Report is saved to `docs/bugs/`

**Patch-and-continue:** If the user's description is too vague, ask focused questions to fill gaps (reproduction steps, expected behavior, environment).

**Auto mode:** Auto-accept if reproduction steps and severity exist. Stop only if the report is too vague to investigate.

**On clean pass:** Report "Bug documented — proceeding to /debug" and continue.

### Gate: After /virtual-team:debug (Complexity Gate)

This is the most critical gate in the bug fix pipeline. It evaluates the debug investigation findings to determine whether a compressed fix pipeline is appropriate or whether the bug is systemic enough to warrant a full feature pipeline.

**Check for:**
- Root cause identified
- Pattern sweep completed (mandatory — `debug.md` requires it)
- Occurrence count and scope classification

**Gate evaluation — complexity check:**

| Scope | Occurrences | Gate Action |
|-------|------------|-------------|
| Isolated | 1-3 confirmed (🔴) | **Continue** — straightforward fix |
| Multi-file | 4-9 confirmed (🔴) | **Continue with caution** — note scope in checkpoint |
| Systemic | 10+ confirmed (🔴) or architectural issue | **Halt** — recommend feature pipeline |

**On halt (systemic):**
```
⚠️ This bug is systemic — [N] confirmed occurrences across [N] files.

A bug fix pipeline handles isolated issues. This needs a planned approach:
1. Run `/virtual-team:flow` (feature pipeline) to spec and plan a systematic fix
2. The bug report and investigation are preserved at [path] — use them as input

The debug investigation is complete and saved. No work is lost.
```

**Auto mode:** Continue on isolated/multi-file. Halt on systemic (always — this is a hard gate).

**On clean pass:** Report "Root cause found — [scope] ([N] occurrences). Proceeding to implement fix" and continue.

### Inline Fix Implementation

This replaces the formal `/virtual-team:implement` step. The orchestrator implements the fix inline — no formal plan document. The debug investigation IS the plan.

1. **Read the debug findings:** root cause, all occurrences (🔴 confirmed + 🟡 likely), suggested fix approach
2. **Load behavioral skills:** `virtual-team:test-driven-development`, `virtual-team:verification-before-completion`
3. **Load domain skill** if applicable (`virtual-team:api-design`, `virtual-team:data-layer`, etc. based on the files being modified). If `--deep` was passed, also load the relevant stack-specific skill.
4. **Generate inline fix plan:** List which occurrences to fix, in what order, what regression tests to write. Present the plan briefly before executing.
5. **TDD cycle for each occurrence:**
   a. Write a regression test that reproduces the bug for this occurrence
   b. Verify the test fails (confirms the bug exists)
   c. Apply the fix
   d. Verify the test passes
   e. Run full verification (tests, lint, typecheck)
6. **Cover ALL confirmed (🔴) and likely (🟡) occurrences** from the pattern sweep — not just the primary one. A fix that only patches the reported instance is incomplete.

**Gate after implementation:** Same as the feature pipeline — all tests pass, lint clean, typecheck clean. If tests fail, fix and re-verify.

**Auto mode:** Skip manual confirmations between occurrences, but still run all verification.

### Quality Gate (fix mode)

After implementation passes, the quality gate runs exactly as in the feature pipeline (see the quality gate section in `commands/flow.md`):
- `/virtual-team:review` checks the fix for correctness, patterns, security
- `/virtual-team:validate` checks against the bug report's expected behavior and all listed occurrences
- Halt on Must Fix issues or validation gaps (even in `--auto`)
- `/virtual-team:review` always dispatches specialized passes (no `--deep` needed). If `--deep` was passed, pass `--deep` to `/virtual-team:validate`
- The auto-fix cycle applies here too — mechanical Must Fix issues are auto-fixed and re-reviewed (max 3 iterations), architectural concerns halt for human judgment

### Executing /virtual-team:pr (fix mode)

- Follow `pr.md`: include bug ID and occurrence count in the PR description
- Call **`complete(id, pr_number)`** for the bug item to mark it done
- Update bug status to `fixed` in the bug report frontmatter

### Bug Fix Checkpoint Format

```markdown
---
started: YYYY-MM-DD HH:MM
bug_description: "users can't log in after password reset"
bug_id: BUG-007
flags: [--fix]
---

# Flow Checkpoint (Bug Fix)

## Completed Steps
- [x] /virtual-team:bug → docs/bugs/2026-04-09-login-after-reset.md (BUG-007)
- [x] /virtual-team:debug → root cause found: session token not invalidated on password change
- [ ] implement fix
- [ ] /virtual-team:review + /validate
- [ ] /pr

## Resolved Gates
- Gate after /debug: Straightforward — isolated to 1 file (auth/session.go:142)
```

### Bug Fix Completion Report

```
✅ Bug fix complete.

Pipeline summary:
- Bug: BUG-007 — Users can't log in after password reset
- Root cause: Session token not invalidated on password change
- Occurrences fixed: 2 confirmed + 1 likely
- Branch: fix/BUG-007-login-after-reset
- PR: #45 — [link]

Artifacts produced:
- docs/bugs/2026-04-09-login-after-reset.md (created + updated with investigation)
- 3 regression tests added

Flow checkpoint cleaned up.
```

Delete the flow checkpoint file on successful completion.

### Bug Fix Step Execution

When `--fix` is active, the step execution differs from the feature pipeline:

#### Executing /virtual-team:bug (fix mode)
- Follow `bug.md`: structured intake, severity assessment, backlog addition (via `create()` operation)
- The bug description from `/virtual-team:flow --fix`'s arguments becomes the input
- Skipped if BUG-NNN ID provided or `--quick` flag passed
- Write the checkpoint after the report is saved

#### Executing /virtual-team:debug (fix mode)
- Follow `debug.md`: reproduce, trace, root cause, pattern sweep, document
- Input: the bug report from `/virtual-team:bug`, or the BUG-NNN ID, or the `--quick` description
- Pass `--deep` if `/virtual-team:flow --fix --deep` was used
- The pattern sweep is mandatory — it feeds the inline fix plan

#### Executing inline fix (fix mode)
- This is orchestrator-managed, not a full `/virtual-team:implement` run
- Read debug findings, generate inline fix plan, execute with TDD discipline
- Load `virtual-team:test-driven-development` and `virtual-team:verification-before-completion` skills
- If `--deep` was passed, also load the relevant domain skill (`virtual-team:api-design`, `virtual-team:data-layer`, etc.)
- Run full verification after all occurrences are fixed

#### Executing /virtual-team:review + /virtual-team:validate  (fix mode)
- Same parallel execution as the feature pipeline
- `/virtual-team:review` runs against the git diff
- `/virtual-team:validate` runs against the bug report (expected behavior + all occurrences)
- Pass `--deep` if `/virtual-team:flow --fix --deep` was used

#### Executing /virtual-team:pr (fix mode)
- Follow `pr.md`: include bug ID and occurrence count in the PR
- Call **`complete(id, pr_number)`** for the bug item to mark it done
- Update bug status to `fixed` in the bug report frontmatter
