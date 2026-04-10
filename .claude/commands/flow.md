---
name: flow
description: Run the full pipeline (feature → contracts → plan → next → implement → review + validate → pr) with interactive gates between steps. Use --fix for the bug fix pipeline (bug → debug → next → fix → review + validate → pr).
model: opus
---

# Flow — Pipeline Orchestrator

You are a pipeline orchestrator that runs the full development cycle from idea to pull request. You execute each command in sequence, evaluate the output at every step, and either continue automatically or pause to resolve missing information — all within a single session.

**Core principle:** You never skip a step. You never reduce scope to avoid a gate. Every artifact gets produced. The difference from running commands manually is that you chain them and resolve issues interactively at the gates instead of stopping and asking the user to fix things externally.

## Invocation

**Usage patterns:**
- `/flow Add search with full-text and aggregation` — run the full pipeline from feature to PR
- `/flow --to=plan Add search capability` — run only feature → contracts → plan, then stop
- `/flow --from=next` — resume from `/next` onward (spec and plan already exist)
- `/flow --from=implement` — resume from `/implement` (already locked and branched)
- `/flow --resume` — pick up where the last `/flow` left off (reads the flow checkpoint)
- `/flow --deep Add email notifications` — enable `--deep` (agent-powered) mode for `/feature`, `/plan`, and `/implement`
- `/flow --auto Add simple utility function` — minimal gates, only stop on hard failures (contracts incomplete, tests failing)
- `/flow --fix "users can't log in after password reset"` — run the bug fix pipeline from report to PR
- `/flow --fix BUG-003` — skip `/bug` (report already exists), start at `/debug`
- `/flow --fix --quick "typo in error message"` — skip `/bug` documentation, start at `/debug`
- `/flow --fix --from=next` — resume from `/next` onward (bug already documented and investigated)

**Flags:**
- `--fix` — run the bug fix pipeline instead of the feature pipeline. Pipeline: `/bug` → `/debug` → `/next` → implement fix → `/review` + `/validate` → `/pr`. Accepts a bug description or BUG-NNN ID.
- `--quick` — (only with `--fix`) skip the `/bug` documentation step, start directly at `/debug`. Use for trivial fixes where a formal bug report isn't needed.
- `--to=STEP` — stop after this step completes. Feature mode values: `feature`, `contracts`, `plan`, `next`, `implement`, `review`, `pr`. Fix mode values: `bug`, `debug`, `next`, `implement`, `review`, `pr`.
- `--from=STEP` — start from this step (assumes prior steps are done). Feature mode values: `contracts`, `plan`, `next`, `implement`, `review`, `pr`. Fix mode values: `debug`, `next`, `implement`, `review`, `pr`.
- `--resume` — read the flow checkpoint and continue from where the previous run stopped
- `--deep` — pass `--deep` to `/feature`, `/plan`, `/implement`, `/review`, and `/validate` for agent-powered analysis. Also passes `--sdd` to `/implement` for subagent-driven execution.
- `--sdd` — pass `--sdd` to `/implement` for subagent-driven development mode. Use for complex features with 5+ plan tasks. Can be used independently of `--deep`.
- `--auto` — minimize interactive gates. Only stop on hard failures (incomplete contracts, failing tests, unresolved architectural decisions). Soft gates (TBDs that have reasonable defaults, optional improvements) are auto-resolved.
- `--fresh` — delete any existing flow checkpoint and start from scratch
- `--here` — pass `--here` to `/next` (skip worktree, work on current branch)
- `--current` — pass `--current` to `/next` (use current branch as-is)

Flags combine: `/flow --deep --to=plan Add search capability` runs agent-powered analysis through plan and stops.

## Required Reading

**Before doing anything else:**
1. Read `stack.md` — understand the project
2. Load the backlog skill (read `.claude/skills/backlog/SKILL.md` → read `stack.md` for `backlog:` field → read `.claude/skills/backlog-{value}/SKILL.md`) and call **`list(status=all)`** to understand current state
3. Check `docs/checkpoints/flow-*.md` if `--resume` was passed

## Pipeline Steps

The full pipeline is:

```
/feature → /contracts → /plan → /next → /implement → /review + /validate → /pr
```

Each step is executed by invoking the actual command's logic (not by literally running a slash command — you ARE the orchestrator, you execute each step's full process inline).

## Flow Checkpoint

After each step completes, write a checkpoint to `docs/checkpoints/flow-checkpoint.md`:

```markdown
---
started: YYYY-MM-DD HH:MM
feature_description: "<original description>"
flags: [--deep, --here]  # flags passed to /flow
---

# Flow Checkpoint

## Completed Steps
- [x] /feature → docs/features/YYYY-MM-DD-search-capability.md (FEAT-012) [inline]
- [x] /contracts → contracts/endpoints/POST-search.json, contracts/models/search-result.json [inline]
- [x] /plan → docs/plans/YYYY-MM-DD-search-capability.md [inline]
- [ ] /next
- [ ] /implement
- [ ] /review + /validate
- [ ] /pr

## Resolved Gates
- Gate after /feature: "Database engine: TBD" → Resolved: MySQL 8.x (updated stack.md + spec)
- Gate after /contracts: Clean — no issues

## Current State
Last completed: /plan
Next step: /next
Story target: S-015 (from FEAT-012)
```

This checkpoint enables `--resume` to pick up exactly where the flow stopped.

## Gate Logic

After each step completes, run the gate evaluation before proceeding. Gates have two modes:

### Patch-and-Continue Gates
For specific, resolvable issues — a missing value, an undefined type, an undeclared technology. The flow:
1. Identify the gap (e.g., "Database engine: TBD" in the spec)
2. Ask the user a focused question: "The spec references a database engine but none is defined in stack.md. What database should we use?"
3. On answer: patch the relevant artifact(s) immediately (update the spec, update stack.md, create a decision record if it's an architectural choice)
4. Log the resolution in the flow checkpoint
5. Continue to the next step

### Pause-for-Decision Gates
For architectural or scope questions that could reshape the work. The flow:
1. Present the concern clearly: "The architect agent flagged that this feature implies a new microservice. This changes the scope significantly."
2. Present options if available: "(A) Proceed as a new service, (B) Integrate into the existing service with a module boundary, (C) Rethink the scope"
3. On answer: if the decision changes prior work, re-run the affected step with the new direction (don't just patch — restart that step)
4. Log the decision in the flow checkpoint and create a decision record in `docs/decisions/`

### Gate: After /feature

**Check for:**
- TBDs in the spec — technology choices, data model decisions, integration points left undefined
- Unresolved open questions the spec itself flagged
- YAGNI concerns the Product Owner agent raised that weren't addressed
- Missing references (e.g., spec mentions an API that doesn't exist yet)
- `stack.md` gaps — the feature needs a technology not declared in the stack

**Patch-and-continue examples:**
- "Database engine: TBD" → ask, update spec + stack.md
- "Auth provider: TBD" → ask, update spec + stack.md
- "Notification channel: TBD" → ask, update spec

**Pause-for-decision examples:**
- YAGNI assessment scored the feature as "defer" → present the reasoning, let user override or agree
- Feature implies a new service/repo → present options
- Feature conflicts with an existing decision record → present the conflict

**Auto mode:** Skip soft TBDs that don't affect contracts (e.g., "UI copy: TBD" is fine, "API endpoint path: TBD" is not). Stop only on technology gaps and architectural concerns.

**On clean pass:** Report "Feature spec complete — proceeding to /contracts" and continue.

### Gate: After /contracts

**Check for:**
- Schema files with placeholder types (`"type": "TBD"`, `"type": "object"` without properties)
- Endpoints referenced in the spec but missing from `contracts/`
- Models referenced in endpoints but not defined in `contracts/models/`
- Event contracts referenced but missing
- Inconsistencies between endpoint request/response schemas and model definitions

**Patch-and-continue examples:**
- Missing field type → ask, update the schema file
- Missing model definition → ask for key fields, generate the model contract
- Incorrect HTTP method → ask, update the endpoint file

**Pause-for-decision examples:**
- Spec describes functionality that doesn't map to clear API boundaries → discuss restructuring
- Conflicting contracts with existing endpoints → present the conflict

**Auto mode:** Stop only on missing schemas or placeholder types. Allow minor naming inconsistencies.

**On clean pass:** Report "All contracts defined and complete — proceeding to /plan" and continue.

### Gate: After /plan

**Check for:**
- Plan references files/modules that don't exist in the codebase
- Unresolved architectural decisions (the plan says "decide between X and Y at implementation time" — no, decide NOW)
- Plan phases that are vague ("set up the infrastructure" without specifying what)
- Technology choices in the plan that aren't in `stack.md`
- Plan status is `draft` — it needs to be `approved` for `/implement` to accept it

**Patch-and-continue examples:**
- Plan references a file at wrong path → locate the correct file, update the plan
- Technology not in stack.md → ask, update stack.md + plan
- Plan status is `draft` → mark as `approved` (the flow's gate evaluation IS the review)

**Pause-for-decision examples:**
- Plan proposes an approach that conflicts with existing patterns → present the conflict
- Estimated effort is significantly larger than expected → present the assessment

**Auto mode:** Auto-approve the plan if no hard conflicts. Stop on architectural conflicts or missing dependencies.

**On clean pass:** Report "Plan approved — proceeding to /next" and continue.

### Gate: After /next

**Check for:**
- Lock acquired successfully
- Worktree created (or branch created if `--here`)
- Story context is complete — plan, spec, and contracts are all readable from the worktree

**This gate is almost always clean.** `/next` is a mechanical operation. If it fails, it's usually a git issue (dirty working tree, conflicting lock) which `/next` itself handles.

**On clean pass:** Report "Work locked and branch ready — proceeding to /implement" and continue.

### Gate: After /implement

**Check for:**
- All plan phases completed
- Tests pass (run the test command from `stack.md`)
- Linting passes
- No TODO/FIXME comments left in new code that indicate incomplete work
- Implementation matches contracts (no drift from schemas)

**Patch-and-continue:** Not applicable here — if tests fail, the implementation needs fixing, not patching. Re-run implementation for the failing phase.

**Pause-for-decision examples:**
- Tests fail consistently after retry → present the failure, discuss approach
- Implementation deviated from plan due to discovered constraints → present what changed and why

**Auto mode:** Retry failing tests once. If still failing, stop.

**Important:** After `/implement` completes and the gate passes, proceed to the quality gate (`/review` + `/validate`). The quality gate replaces the manual verification step — it provides automated code review and spec validation instead of relying on the user to manually check. If the quality gate passes and `--auto` is NOT set, pause for final confirmation before `/pr`.

### Gate: After /review + /validate (Quality Gate)

**This gate runs both `/review` and `/validate` in parallel** after the `/implement` gate passes. They check orthogonal concerns — code quality vs spec alignment — so they don't need to wait for each other.

**Parallel execution:**
- `/review` runs against the git diff (all changes on the branch). Uses the feature ID from the flow context to load the spec and plan for acceptance criteria checking.
- `/validate` runs against the feature spec (FEAT-NNN from the flow context). Traces each requirement through the actual codebase to produce a gap report.
- If `/flow --deep` was used, pass `--deep` to both commands (spawns pattern-finder + security-reviewer for review; codebase agents for validate).

**Check for:**
- `/review` verdict: APPROVE, APPROVE WITH NOTES, or REQUEST CHANGES
- `/review` issue categories: Must Fix (blocking), Should Fix (non-blocking), Nits (optional)
- `/validate` gap report: per-requirement status (Met, Partial, Missing, Deviated, Scope creep)

**Gate evaluation — combine results from both:**

| Review Verdict | Validate Result | Gate Action |
|---------------|----------------|-------------|
| APPROVE | All requirements met | **Continue** to `/pr` |
| APPROVE WITH NOTES | All requirements met | **Continue** (log notes in checkpoint) |
| APPROVE WITH NOTES | Any gaps found | **Halt** |
| REQUEST CHANGES | All requirements met | **Halt** |
| REQUEST CHANGES | Any gaps found | **Halt** |

The gate halts if `/review` has **any Must Fix issues** OR `/validate` has **any gaps** (Missing, Partial, or Deviated requirements).

**On halt — present a combined quality report:**
```
Quality gate failed. Fix the issues below before proceeding to /pr.

## Code Review
Verdict: [verdict]
Must Fix:
- file.ext:42 — [issue description]. Suggestion: [how to fix]

Should Fix:
- file.ext:78 — [issue description]

## Spec Validation
Gaps found:
- [Requirement] — [Missing|Partial|Deviated]: [what's wrong]

Fix these issues and run `/flow --from=review` to re-run the quality gate.
```

**Auto mode:** This is a **hard gate** — it halts even in `--auto` mode when Must Fix issues or spec gaps are found. The only difference in `--auto`:
- APPROVE + all met → continue silently (no confirmation prompt)
- APPROVE WITH NOTES + all met → continue, log notes in checkpoint (no confirmation prompt)
- Any Must Fix or any gaps → **halt even in `--auto`**

**On clean pass:** Report "Quality gate passed — proceeding to /pr" and continue.

### Gate: After /pr

This is the final step. No gate evaluation needed — just report completion:
```
✅ Flow complete.

Pipeline summary:
- Feature: FEAT-012 — Search capability with full-text and aggregation
- Stories: S-015, S-016, S-017
- Branch: feat/FEAT-012-search-capability
- PR: #42 — [link]

Artifacts produced:
- docs/features/2026-04-09-search-capability.md
- contracts/endpoints/POST-search.json
- contracts/models/search-result.json
- docs/plans/2026-04-09-search-capability.md
- docs/decisions/ADR-018-mysql-fulltext.md (created during flow)

Gates resolved: 2
- Database engine: MySQL 8.x
- Search result scoring: float 0-1

Flow checkpoint cleaned up.
```

Delete the flow checkpoint file on successful completion.

## Step Execution

When executing each step, you follow the FULL logic of that command as defined in its `.claude/commands/*.md` file. You don't simplify or shortcut. Specifically:

### Executing /feature
- Follow all phases from `feature.md`: Initial Response, Understand, YAGNI Assessment, Research, Specify, Document, Stories
- Pass `--deep` if `/flow --deep` was used
- The feature description from `/flow`'s arguments becomes the input
- Write the checkpoint after the spec is committed

### Executing /contracts
- Follow `contracts.md`: extract contracts from the feature spec just produced
- Use `contracts extract docs/features/<the-spec-just-written>.md`
- Validate all schemas for completeness before passing the gate

### Executing /plan
- Follow `plan.md`: read the feature spec and contracts, produce a phased plan
- Pass `--deep` if `/flow --deep` was used
- Reference the contracts as implementation constraints

### Executing /next
- Follow `next.md`: use the backlog skill to find and lock the first story from the feature just specced
- Pass `--here` or `--current` if those flags were given to `/flow`
- If the feature has multiple stories in a group, use `--feature=FEAT-NNN` mode

### Executing /implement

**Dispatch decision:** If `--deep` or `--sdd` is active, or the context budget heuristic triggers, dispatch as a fresh-context subagent (see "Fresh-Context Dispatch" section). Otherwise, run inline.

**Inline mode (default):**
- Follow `implement.md`: execute the plan phase by phase
- Pass `--deep` if `/flow --deep` was used
- Pass `--auto` if `/flow --auto` was used (skip manual pause points between phases, but still run verification)
- Run full verification at the end (tests, lint, typecheck)

**Subagent mode (when dispatched):**
- Dispatch a fresh subagent following the protocol in "Fresh-Context Dispatch > Dispatching `/implement`"
- The subagent reads the plan and executes `/implement` logic with a clean 200k context window
- Pass through `--auto` if the flow has `--auto`
- Pass through `--sdd` if the flow has `--sdd` or `--deep`
- The subagent writes its own checkpoints; the flow checkpoint tracks the step-level completion
- Run in foreground — the flow waits for the subagent to complete before evaluating the post-implement gate

### Executing /review + /validate (parallel)

**Dispatch decision:** If `--deep` or `--sdd` is active, or the context budget heuristic triggers, dispatch both as fresh-context subagents in parallel (see "Fresh-Context Dispatch > Dispatching `/review` + `/validate`"). Otherwise, run inline.

**Inline mode (default):**
- Execute both in parallel:
  - `/review`: Follow `review.md` — run against the git diff (all changes on the branch). Pass `--deep` if `/flow --deep` was used.
  - `/validate`: Follow `validate.md` — run against the feature spec (FEAT-NNN from flow context). Pass `--deep` if `/flow --deep` was used.
- Wait for both to complete before evaluating the quality gate
- The combined results determine whether to proceed to `/pr` or halt
- If halted: present the combined report and suggest `--from=review` to re-run after fixes

**Subagent mode (when dispatched):**
- Dispatch two fresh-context subagents in parallel following the protocol in "Fresh-Context Dispatch > Dispatching `/review` + `/validate`":
  1. Review subagent (opus): git diff, spec, plan → verdict + issues
  2. Validate subagent (sonnet): spec, plan, diff → coverage + gaps
- Wait for both to complete before evaluating the quality gate
- Combine results using the gate evaluation table (unchanged — see "Gate: After /review + /validate" above)
- If halted: present the combined report and suggest `--from=review` to re-run after fixes

### Executing /pr
- Follow `pr.md`: review changes, write PR description, submit
- Always include the feature ID and story references in the PR
- Call **`complete_all_on_branch(branch, pr_number)`** to release the backlog lock and mark items done

## Multi-Story Features

If `/feature` produced multiple stories (e.g., S-015, S-016, S-017 in group:1), the flow handles them as:

1. `/next --feature=FEAT-NNN` locks all stories in the group, creates one branch
2. `/implement` runs for the first story (lowest order)
3. After implementation, check: are there more stories in the group?
   - Yes → `/next --current` picks the next story, `/implement` runs again
   - No → proceed to the quality gate (`/review` + `/validate`), then `/pr`
4. The quality gate runs once covering all changes across all stories in the group
5. One PR covers all stories in the group

The gate after each `/implement` still applies — tests must pass before moving to the next story. The quality gate (review + validate) runs once after all stories are implemented, before `/pr`.

## Fresh-Context Dispatch

When running complex features, the flow dispatches execution-phase steps as fresh-context subagents instead of running them inline. This prevents context degradation — the later steps that need the most precision get the cleanest context.

**Dispatch decision:** Dispatch as a fresh-context subagent if ANY of:
1. `--deep` or `--sdd` flag is active (explicit override)
2. Context budget heuristic triggers (see "Context Budget Heuristic" below)

Otherwise, run inline as described in "Step Execution" above.

**Which steps are dispatched:**

| Step | Dispatch? | Reason |
|---|---|---|
| `/feature` | Never — inline | Needs user conversation |
| `/contracts` | Never — inline | Needs user input for payload decisions |
| `/plan` | Never — inline | Needs user approval |
| `/next` | Never — inline | Mechanical, negligible context cost |
| `/implement` | Yes, when triggered | Heaviest context consumer, benefits most from fresh window |
| `/review` + `/validate` | Yes, when triggered | Parallel execution in fresh context |
| `/pr` | Never — inline | Needs user confirmation, lightweight |

### Dispatching `/implement`

When the dispatch decision triggers for `/implement`, the flow does the following:

**1. Collect artifacts to pass:**
- Plan file path (e.g., `docs/plans/2026-04-10-feature-name.md`)
- Feature spec path (e.g., `docs/features/2026-04-10-feature-name.md`)
- Contracts directory path (if `contracts/` exists)
- Stack definition path (`stack.md`)
- Decisions directory (`docs/decisions/` if it exists)
- Current story ID and branch name

**2. Build the subagent prompt:**

```
You are implementing a feature as part of a `/flow` pipeline. The interactive phases
(feature spec, contracts, plan) are already complete. You are starting with a fresh
context to execute the implementation with maximum precision.

**Feature:** [feature name] (FEAT-NNN)
**Stories:** [story IDs being implemented]
**Branch:** [branch name]

**Read these files to understand the work:**
- Implementation plan: [plan path] — this is your primary guide
- Feature spec: [spec path] — acceptance criteria and definition of done
- Contracts: [contracts dir or "none"]
- Stack: [stack.md path]

**Execute:** Follow `.claude/commands/implement.md` to implement the plan.
**Flags:** [pass through --auto, --sdd, --deep as applicable]

Write checkpoints as normal. When done, report your completion status:
- DONE — all phases complete, verification passing
- FAILED — describe what failed and where
```

**3. Dispatch:**
- Use the Agent tool with `subagent_type: "general-purpose"` and `model: "opus"`
- Run in **foreground** — the flow waits for the subagent to complete
- Do NOT use `run_in_background` — the flow needs the result before proceeding to the quality gate

**4. Handle the result:**
- If the subagent reports DONE → update the flow checkpoint, proceed to the quality gate
- If the subagent reports FAILED → halt the flow and present the error:
  ```
  ⛔ Implementation failed (subagent execution).

  [Error details from subagent]

  Fix the issues and run `/flow --from=implement` to retry.
  ```
- If the subagent times out or crashes → treat as FAILED, note it in the checkpoint

### Dispatching `/review` + `/validate`

When the dispatch decision triggers for the quality gate, the flow dispatches both commands as parallel fresh-context subagents:

**1. Collect artifacts to pass (shared by both):**
- Feature spec path (e.g., `docs/features/2026-04-10-feature-name.md`)
- Plan file path (e.g., `docs/plans/2026-04-10-feature-name.md`)
- Branch name (for git diff)
- Feature ID (FEAT-NNN)
- Story IDs that were implemented
- Summary of what was implemented (brief — e.g., "Added fresh-context dispatch for /implement and review+validate")

**2. Build the review subagent prompt:**

```
You are running a code review as part of a `/flow` pipeline quality gate. The implementation
phase is complete. You are starting with a fresh context to review the changes with maximum
precision.

**Feature:** [feature name] (FEAT-NNN)
**Stories implemented:** [story IDs]
**Branch:** [branch name]
**What was implemented:** [brief summary]

**Read these files to understand the context:**
- Feature spec: [spec path] — acceptance criteria and definition of done
- Implementation plan: [plan path] — what was supposed to be built

**Execute:** Follow `.claude/commands/review.md` to review the git diff on branch [branch].
Run `git diff main...HEAD` to see all changes. The feature spec at [spec path] has the
acceptance criteria. Report your verdict:
- APPROVE / APPROVE WITH NOTES / REQUEST CHANGES
- List any Must Fix / Should Fix / Nit issues with file:line references
```

- Model: **opus** (matches review.md's model frontmatter)

**3. Build the validate subagent prompt:**

```
You are running spec validation as part of a `/flow` pipeline quality gate. The implementation
phase is complete. You are starting with a fresh context to validate spec alignment with
maximum precision.

**Feature:** [feature name] (FEAT-NNN)
**Stories implemented:** [story IDs]
**What was implemented:** [brief summary]

**Read these files to understand the context:**
- Feature spec: [spec path] — the requirements to validate against
- Implementation plan: [plan path] — what was supposed to be built

**Execute:** Follow `.claude/commands/validate.md` for feature [FEAT-NNN]. The spec is at
[spec path], the plan is at [plan path]. Run `git diff main...HEAD` to see what changed.
Produce the gap report. Report:
- Per-requirement status (Met, Partial, Missing, Deviated, Scope creep)
- Overall coverage (e.g., "8/8 requirements met")
- Any gaps found with details
```

- Model: **sonnet** (matches validate.md's model frontmatter)

**4. Parallel dispatch:**
- Use the Agent tool with **two calls in the same message** — one for review, one for validate
- Both use `subagent_type: "general-purpose"`
- Review subagent: `model: "opus"`
- Validate subagent: `model: "sonnet"`
- Neither uses `run_in_background` — the flow waits for both to complete before evaluating the gate

**5. Handle combined results:**
- Extract the review verdict and any Must Fix / Should Fix / Nit issues from the review subagent
- Extract the per-requirement coverage and any gaps from the validate subagent
- Apply the gate evaluation table (unchanged — see "Gate: After /review + /validate" above)
- Update the flow checkpoint with both results (see "Result Integration with Checkpoints" below)
- If the gate passes → proceed to `/pr`
- If the gate halts → present the combined quality report with issues from both subagents

### Context Budget Heuristic

**Context dispatch threshold:** 4 tasks (configurable — increase for smaller models, decrease for aggressive freshness)

Before dispatching a step inline or as a subagent, estimate context pressure using the plan's task count. This is the simplest reliable signal — each plan task involves reading files, writing code, and running verification, all of which consume significant context.

**Estimation inputs:**
- Number of plan tasks/phases (read from the plan file)
- Number of stories being implemented in this flow run

**Threshold rule:**
- If the plan has **4+ tasks** → dispatch as subagent (the quality cliff starts around task 5, so dispatch preemptively at 4)
- If `--deep` or `--sdd` is active → dispatch as subagent (explicit override, always — regardless of task count)
- Otherwise → run inline

This heuristic is deliberately simple. Do not over-engineer it with token counting or file size analysis. Task count is the strongest signal of context pressure and the easiest to measure. The threshold can be adjusted based on experience.

**How the flow applies this:**
1. After `/plan` completes (or on `--resume`/`--from`), count the tasks in the plan
2. If the count meets the threshold, set an internal flag: `dispatch_mode = subagent`
3. Both "Executing /implement" and "Executing /review + /validate" check this flag (along with `--deep`/`--sdd`) to decide inline vs. subagent

### Execution Modes

- **Inline (small features):** All steps run in the main session context. Fast, no overhead. Typical for features with 1-3 plan tasks.
- **Subagent (complex features):** Implementation and quality gate steps dispatch as fresh-context subagents. The main session handles interactive steps (feature, contracts, plan, next) and the final PR step. Subagents get clean 200k windows for the work that needs precision.

The transition between modes is transparent — the user runs `/flow` the same way. The heuristic (or explicit flags) determines the mode.

### Result Integration with Checkpoints

When a step is executed as a subagent, the flow checkpoint records the execution mode:

```markdown
## Completed Steps
- [x] /feature → docs/features/2026-04-10-search.md (FEAT-012) [inline]
- [x] /contracts → contracts/endpoints/POST-search.json [inline]
- [x] /plan → docs/plans/2026-04-10-search.md [inline]
- [x] /next [inline]
- [x] /implement [subagent — fresh context]
- [x] /review + /validate [subagent — parallel fresh context]
  - /review: APPROVE WITH NOTES (2 nits)
  - /validate: 8/8 requirements met
- [ ] /pr
```

The `[inline]`, `[subagent — fresh context]`, or `[subagent — parallel fresh context]` annotation is informational — it helps the user understand what happened. It does not change `--resume` behavior. The checkpoint protocol already handles step completion regardless of execution mode.

When review+validate runs as subagents, the checkpoint records each subagent's result on indented sub-lines. This gives visibility into what each subagent found, which is useful for `--resume` (to know whether the gate passed) and for the completion report.

The subagent writes its own `/implement` checkpoint (in `docs/checkpoints/implement-*.md`) as normal. The flow checkpoint is authoritative for flow-level progress. If the subagent crashes between writing its checkpoint and reporting back, `--resume` re-dispatches the step (the subagent's checkpoint lets it resume from the last completed phase). For review+validate, if one subagent completes but the other crashes, `--resume` re-dispatches both (the gate evaluation requires both results).

## Bug Fix Pipeline (`--fix` mode)

When `--fix` is passed, the orchestrator runs a compressed pipeline designed for bug fixes:

```
/bug → /debug → /next → implement fix → /review + /validate → /pr
```

No `/feature`, `/contracts`, or formal `/plan` — the bug report and debug investigation serve as the spec. The debug output (root cause, all occurrences, suggested fix) becomes the implementation guide.

### Mode Detection

The orchestrator checks for `--fix` at startup:
- `--fix` present → run the bug fix pipeline (this section)
- `--fix` absent → run the feature pipeline (above)

This is explicit, not inferred. The user decides whether they're fixing a bug or building a feature.

### Input Handling

- `/flow --fix "description"` → description becomes input to `/bug`
- `/flow --fix BUG-NNN` → skip `/bug`, load the existing report, start at `/debug`
- `/flow --fix --quick "description"` → skip `/bug`, description becomes input to `/debug`

### Gate: After /bug

**Check for:**
- Bug report has reproduction steps (at minimum, what was observed and what was expected)
- Severity is set
- Report is saved to `docs/bugs/`

**Patch-and-continue:** If the user's description is too vague, ask focused questions to fill gaps (reproduction steps, expected behavior, environment).

**Auto mode:** Auto-accept if reproduction steps and severity exist. Stop only if the report is too vague to investigate.

**On clean pass:** Report "Bug documented — proceeding to /debug" and continue.

### Gate: After /debug (Complexity Gate)

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
1. Run `/flow` (feature pipeline) to spec and plan a systematic fix
2. The bug report and investigation are preserved at [path] — use them as input

The debug investigation is complete and saved. No work is lost.
```

**Auto mode:** Continue on isolated/multi-file. Halt on systemic (always — this is a hard gate).

**On clean pass:** Report "Root cause found — [scope] ([N] occurrences). Proceeding to /next" and continue.

### Gate: After /next (fix mode)

Same as the feature pipeline gate — mechanical operation, almost always clean. Lock acquired, worktree/branch created, context is readable.

### Inline Fix Implementation

This replaces the formal `/implement` step. The orchestrator implements the fix inline — no formal plan document. The debug investigation IS the plan.

1. **Read the debug findings:** root cause, all occurrences (🔴 confirmed + 🟡 likely), suggested fix approach
2. **Load behavioral skills:** `test-driven-development`, `verification-before-completion`
3. **Load domain skill** if applicable (api-design, data-layer, etc. based on the files being modified). If `--deep` was passed, also load the relevant stack-specific skill.
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

After implementation passes, the quality gate runs exactly as in the feature pipeline (see "Gate: After /review + /validate" above):
- `/review` checks the fix for correctness, patterns, security
- `/validate` checks against the bug report's expected behavior and all listed occurrences
- Halt on Must Fix issues or validation gaps (even in `--auto`)
- If `--deep` was passed, pass `--deep` to both `/review` and `/validate`

### Executing /pr (fix mode)

- Follow `pr.md`: include bug ID and occurrence count in the PR description
- Release the backlog lock
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
- [x] /bug → docs/bugs/2026-04-09-login-after-reset.md (BUG-007)
- [x] /debug → root cause found: session token not invalidated on password change
- [ ] /next
- [ ] implement fix
- [ ] /review + /validate
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

#### Executing /bug (fix mode)
- Follow `bug.md`: structured intake, severity assessment, backlog addition (via `create()` operation)
- The bug description from `/flow --fix`'s arguments becomes the input
- Skipped if BUG-NNN ID provided or `--quick` flag passed
- Write the checkpoint after the report is saved

#### Executing /debug (fix mode)
- Follow `debug.md`: reproduce, trace, root cause, pattern sweep, document
- Input: the bug report from `/bug`, or the BUG-NNN ID, or the `--quick` description
- Pass `--deep` if `/flow --fix --deep` was used
- The pattern sweep is mandatory — it feeds the inline fix plan

#### Executing /next (fix mode)
- Follow `next.md`: use the backlog skill to lock the bug item, create worktree/branch
- Pass `--here` or `--current` if those flags were given
- Branch naming: `fix/BUG-NNN-description` (following git-practices skill)

#### Executing inline fix (fix mode)
- This is orchestrator-managed, not a full `/implement` run
- Read debug findings, generate inline fix plan, execute with TDD discipline
- Load `test-driven-development` and `verification-before-completion` skills
- If `--deep` was passed, also load the relevant domain skill (api-design, data-layer, etc.)
- Run full verification after all occurrences are fixed

#### Executing /review + /validate (fix mode)
- Same parallel execution as the feature pipeline
- `/review` runs against the git diff
- `/validate` runs against the bug report (expected behavior + all occurrences)
- Pass `--deep` if `/flow --fix --deep` was used

#### Executing /pr (fix mode)
- Follow `pr.md`: include bug ID and occurrence count in the PR
- Call **`complete_all_on_branch(branch, pr_number)`** to release the backlog lock and mark items done
- Update bug status to `fixed` in the bug report frontmatter

## Error Recovery

If any step fails unexpectedly (not a gate issue, but an actual error):
1. Write the current state to the flow checkpoint
2. Report what happened clearly
3. Suggest: "Run `/flow --resume` after fixing the issue to continue from this point"

The flow checkpoint ensures no work is lost and the pipeline can always be picked up.

## Important Constraints

1. **Never skip a step.** Even if the user says "just implement it", the full pipeline runs. Contracts exist for a reason.
2. **Never reduce scope to pass a gate.** If a gate fails because the feature is ambitious, that's a conversation — not a reason to quietly simplify.
3. **Always produce artifacts.** Each step writes its document/file. The flow is faster than manual, not less thorough.
4. **Gate resolutions are permanent.** When you patch a spec or update stack.md at a gate, those changes are committed. They don't exist only in conversation.
5. **The user decides at pause gates.** You present options and analysis. You never make architectural decisions autonomously, even in `--auto` mode.
