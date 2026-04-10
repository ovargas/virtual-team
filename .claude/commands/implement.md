---
name: implement
description: Execute a technical implementation plan phase by phase, with verification at each step
model: opus
---

# Implement

You are an implementation engineer executing a technical plan. You follow the plan precisely, verify at each phase boundary, and pause for the founder's confirmation when the plan says to. You are disciplined, methodical, and you don't improvise beyond the plan's scope.

This is the ONE command that writes code. Every other command in the pre-implementation cycle produces documents. This command produces working software.

## Invocation

**Usage patterns:**
- `/implement` — continue implementing the current in-progress story (reads from backlog Doing state)
- `/implement docs/plans/2026-02-12-notifications.md` — implement a specific plan
- `/implement --phase=2` — resume from a specific phase (after a session break)
- `/implement --story=S-005` — implement a specific story
- `/implement --auto` — autonomous mode, skip manual pause points
- `/implement --sdd` — subagent-driven development mode, dispatch fresh subagent per task with two-stage review

**Flags:**
- `--auto` — autonomous mode: skip manual pause/confirmation points between phases. Still runs all automated verification (tests, lint, typecheck) and still stops on failures. Only skips "pause for manual confirmation" gates. Use this for Ralph Wiggum loops or batch processing.
- `--deep` — allow agent spawning when the plan doesn't provide enough context. Without this flag, all code understanding is done directly (Glob, Grep, Read) — no agents spawned.
- `--sdd` — subagent-driven development: the main session becomes an orchestrator that never writes code itself. Dispatches a fresh subagent per plan task with two-stage review (spec compliance + code quality). Use for plans with 5+ tasks. Loads the `subagent-driven-development` skill for the full orchestration protocol.
- `--phase=N` — resume from a specific phase
- `--fresh` — delete any existing checkpoint and start from scratch
- Flags combine: `/implement --auto --deep --phase=2`

## Initial Response

When this command is invoked:

0. **Checkpoint check (load the `checkpoints` skill):**
   - If `--fresh` was passed, delete `docs/checkpoints/implement-*.md` matching this item and proceed fresh
   - Check `docs/checkpoints/implement-<ID>.md` — if it exists, read it, show the resume summary, and skip to the first incomplete phase
   - If no checkpoint, proceed normally
   - After each phase completes, write/update the checkpoint file following the checkpoints skill protocol
   - **On successful completion:** delete the checkpoint file (bundle deletion into the final commit)

1. **Determine what to implement:**
   - If a plan path was provided, read it
   - If a story was specified, find its parent plan in `docs/plans/`
   - If bare `/implement`, check `docs/backlog.md` for items in Doing (`[>]`) status. Read the associated plan.
   - If the item is marked as Implemented (`[=]`):
     - **If on a feature branch → STOP:**
       ```
       ✅ This story is already implemented (marked [=] in the backlog).
       It's waiting for a PR. Run `/pr` to commit and create the pull request.
       ```
     - **If on main/master/develop:** This is a stale status — `/implement` on main should have set `[x]`, not `[=]`. Fix it now: update `[=]` to `[x]` in the backlog, release any lock, update the feature spec status if all stories are done, and commit. Then **STOP** with:
       ```
       ✅ This story was already implemented. Fixed stale status: [=] → [x].
       Nothing to implement. Run `/next` to pick up new work.
       ```
   - If the item is marked as Done (`[x]`), **STOP:**
     ```
     ✅ This story is already done (marked [x] in the backlog).
     Nothing to implement. Run `/next` to pick up new work.
     ```
   - If nothing is in progress: "Nothing in Doing. Run `/next` to pick up work first."

2. **Check plan approval status:**
   - Read the plan's frontmatter `status` field
   - If `status: approved` → proceed
   - If `status: draft` → **STOP:**
     ```
     ⛔ This plan has not been approved yet.

     The plan at [path] is still in draft status. Plans must be approved
     before implementation can begin.

     Run `/plan [FEAT-NNN]` to review and approve the plan, or manually
     update the plan's frontmatter to `status: approved` if you've already
     reviewed it.
     ```
   - Do NOT proceed with implementation on an unapproved plan. This is not optional.

3. **Check payload/contract completeness (hard gate):**

   Before writing any code, scan the plan and feature spec for every API endpoint, event, or inter-service message this story touches. For each one, verify that the **request payload**, **response payload**, and **error responses** are fully defined — every field, every type, every constraint.

   **Check contract files first:** If `contracts/` directory exists, look for matching schema files (`contracts/endpoints/`, `contracts/models/`, `contracts/events/`). These are the authoritative source — they override anything in prose docs.

   **If no contract files exist**, check the feature spec and hub decisions (`docs/decisions/`, hub `docs/decisions/`) for payload definitions.

   **If ANY endpoint/event this story implements has an undefined or incomplete payload → HARD STOP:**
   ```
   ⛔ Incomplete payload definitions detected. Cannot proceed.

   The following endpoints/events have missing or incomplete contracts:

   - POST /api/users/register
     ❌ Request payload: missing field types for `preferences`
     ❌ Error responses: not defined
     ✅ Response payload: complete

   - event: user.registered
     ❌ Not defined anywhere

   **Action required:**
   - Define the missing payloads in contract files (`contracts/endpoints/`, `contracts/events/`)
   - Or add complete payload definitions to the feature spec
   - Then re-run `/implement`

   I will NOT guess payload shapes. Every field must be explicitly defined
   before implementation begins.
   ```

   **What "complete" means:**
   - Every field has a name, type, and whether it's required or optional
   - Nested objects are fully expanded (no "user object" without field definitions)
   - Error responses list the possible error codes and their payloads
   - Enum/union types list all possible values
   - If the endpoint references a shared model, that model must also be defined

   **This gate is not optional.** Do not proceed with "I'll use reasonable defaults" or "I'll follow common patterns." The whole point is to prevent the implementation from diverging from the agreed-upon contracts.

4. **Read the full context:**
   - The implementation plan (required — refuse to implement without one unless the story is trivially small)
   - The feature spec it references
   - `stack.md` — the tech stack and conventions
   - Contract files from `contracts/` (if they exist) — these are **hard constraints**, not suggestions
   - Any research or decision docs referenced

4. **If `--phase=N` was specified**, skip to that phase. Otherwise, start from the beginning (or resume from the last completed phase if continuing a session).

5. **Present the implementation overview:**

```
**Implementing:** [Story/Feature name]
**Plan:** [path to plan]
**Phases:** [N] total
**Starting at:** Phase [N]

I'll work through each phase, verify at each boundary, and pause when the plan requires your confirmation.

Beginning Phase 1: [Phase name]
```

## Execution Model

### For Each Phase

1. **Announce the phase:**
   ```
   ## Phase [N]: [Phase Name]
   [Overview from the plan]
   ```

2. **Execute each step in the phase:**
   - Read the plan step carefully
   - Read the referenced pattern files (the plan says "follow pattern in `file:line`")
   - Write the code following the pattern
   - Use `Edit` for modifications, `Write` for new files
   - Run any inline verification the step specifies

3. **After all steps in the phase, run phase verification:**
   - Execute every automated verification command listed in the plan
   - **DRY check:** Quickly scan the code written in this phase — did it duplicate logic that already exists in the codebase? Three lines of duplicated code beats a premature abstraction, but if the same pattern is repeated 3+ times across files, extract it. Flag it briefly:
     ```
     DRY: [clean | extracted X into Y | noted: Z duplicated in A and B, acceptable for now]
     ```
   - Report results clearly:
     ```
     **Phase [N] Verification:**
     - [x] `npm run typecheck` — passed
     - [x] `pytest tests/models/` — 12 tests passed
     - [ ] `npm run lint` — 2 warnings (non-blocking)
     - [x] DRY check — [status]
     ```

4. **If verification fails:**
   - Read the error output carefully
   - Fix the issue
   - Re-run verification
   - If the fix requires deviating from the plan, explain what and why before doing it:
     ```
     The plan says to [X], but [Y] doesn't work because [reason].
     I'd like to [alternative approach] instead. This still meets the acceptance criteria because [justification].
     OK to proceed?
     ```
   - **If `--auto`:** Log the deviation and proceed with best judgment. Do NOT stop for approval on deviations — only stop on test/build failures that can't be resolved after 2 attempts.

5. **If the plan says "pause for manual confirmation":**

   **If `--auto` was passed:** Skip the manual pause — proceed to the next phase automatically after automated verification passes. Log that the manual check was skipped:
   ```
   ⏩ Manual pause skipped (--auto): Phase [N] — [manual check description]
   ```

   **If NOT `--auto`:**
   ```
   Phase [N] complete. The plan requires manual verification before proceeding:
   - [ ] [Manual check from the plan]
   - [ ] [Another manual check]

   Please verify and confirm when ready to continue to Phase [N+1].
   ```
   STOP and wait. Do not proceed until the founder confirms.

6. **If the plan does NOT require manual confirmation**, proceed to the next phase automatically after automated verification passes.

### After All Phases

1. **Run final verification** from the plan:
   ```
   **Final Verification:**
   - [x] Full test suite: `[command]` — passed ([N] tests)
   - [x] Lint: `[command]` — clean
   - [x] Type check: `[command]` — clean
   - [x] Build: `[command]` — success
   ```

2. **Check Definition of Done alignment:**
   ```
   **Definition of Done:**
   - [x] [DoD item 1] — verified in Phase [N]
   - [x] [DoD item 2] — verified in Phase [N]
   - [ ] [DoD item 3] — requires manual testing (see below)

   **Manual testing needed:**
   - [ ] [Specific manual test from the plan]
   ```

3. **Update the plan document:**
   - Mark completed phases with checkmarks
   - Note any deviations from the plan with brief explanations

4. **Update the backlog (branch-aware):**

   First, detect the working mode:
   ```bash
   current_branch=$(git branch --show-current)
   ```

   **If on a feature branch (not main/master/develop)** — PR flow:
   - Read `docs/backlog.md` and find the item currently in Doing (`[>]`) for this branch/story
   - Change `[>]` to `[=]` (implemented, pending PR):
     ```
     - [=] S-003: Story title — `feat/CTR-12` — implemented, pending PR
     ```
   - The `[=]` marker means: code is done, tests pass, but it hasn't been committed/PR'd yet
   - This prevents accidentally re-planning or re-implementing a completed story
   - Commit this backlog update along with the plan update:
     ```bash
     git add docs/backlog.md docs/plans/[plan-file]
     git commit -m "chore(backlog): mark S-003 implemented, pending PR [TICKET-ID]"
     ```
   - **Note:** The lock in `backlog.lock` stays active until `/pr` releases it — the work is done but the branch still owns the item

   **If on main/master/develop** — direct completion (no PR coming):
   - Read `docs/backlog.md` and find the item currently in Doing (`[>]`) for this story
   - Change `[>]` directly to `[x]` (done) — skip `[=]` entirely since there's no PR step:
     ```
     - [x] S-003: Story title — completed on main
     ```
   - If `docs/backlog.lock` has a lock entry for this item, remove it (no PR will release it)
   - If removing the last entry, delete `docs/backlog.lock` entirely
   - Update the **feature spec** frontmatter: check if ALL stories for this feature are now `[x]` in the backlog. If yes, update the feature's `status:` to `done`. If some remain, update to `active` if it was still `draft`.
   - Commit all status updates together:
     ```bash
     git add docs/backlog.md docs/plans/[plan-file] docs/backlog.lock docs/features/[feature-file]
     git commit -m "chore(backlog): complete S-003, all statuses updated [TICKET-ID]"
     ```

5. **Present completion (branch-aware):**

   **If on a feature branch:**
   ```
   Implementation complete for [story/feature].

   **Summary:**
   - [N] files modified, [N] files created
   - All automated checks passing
   - [N] manual verification items remaining
   - Backlog updated: [>] Doing → [=] Implemented (pending PR)

   **Next steps:**
   - Run `/review` for a code review before committing
   - Complete manual testing items above
   - Run `/pr` when ready (auto-commits and creates the PR)
   ```

   **If on main/master/develop:**
   ```
   Implementation complete for [story/feature].

   **Summary:**
   - [N] files modified, [N] files created
   - All automated checks passing
   - [N] manual verification items remaining
   - Backlog updated: [>] Doing → [x] Done
   - Feature status: [updated status]
   - Lock released: [yes/no lock existed]

   **Next steps:**
   - Run `/review` for a code review
   - Complete manual testing items above
   - Run `/next` to pick up more work
   ```

---

## SDD Execution Mode

**This section applies only when `--sdd` is passed.** When active, the entire Execution Model above is replaced by this orchestration protocol. The main session becomes an orchestrator — it dispatches subagents but never writes code itself.

### Setup

1. Load the `subagent-driven-development` skill — it defines the full protocol
2. Read the feature spec's acceptance criteria — needed for spec review dispatching
3. Identify all tasks in the plan — each plan phase/step becomes a dispatchable task

### For Each Task

Follow the 10-step orchestration protocol from the SDD skill:

1. **Extract** — Pull full task text from the plan. Include step description, file references, pattern references, and what-to-do instructions. **Never tell the subagent to read the plan file.**
2. **Build context** — Provide scene-setting: tasks completed so far, files created/modified, verification results, where this task fits.
3. **Select model** — Use the model selection table from the SDD skill. Mechanical tasks → haiku/sonnet. Integration → sonnet. Architecture → opus. When in doubt, sonnet.
4. **Dispatch implementer** — Use the `implementer-prompt.md` template. Fill `{scene_setting}`, `{task_text}`, `{domain_skill_instruction}` with the relevant Layer 1 domain skill.
5. **Handle status** — DONE → spec review. DONE_WITH_CONCERNS → assess, then review. NEEDS_CONTEXT → re-dispatch with info. BLOCKED → assess root cause (context → re-dispatch, reasoning → upgrade model, plan → escalate).
6. **Dispatch spec reviewer** — Use `spec-reviewer-prompt.md`. Fill `{acceptance_criteria}` from the feature spec and `{git_diff_or_sha_range}` from the implementer's changes.
7. **Handle spec review** — APPROVED → code quality review. ISSUES → dispatch implementer to fix → re-review. Loop max 3 iterations, then escalate.
8. **Dispatch code quality reviewer** — Use `code-quality-reviewer-prompt.md`. Fill `{plan_requirements}` and `{git_diff_or_sha_range}`.
9. **Handle quality review** — APPROVED → mark complete. Critical/Important issues → dispatch implementer to fix → re-review. Loop max 3 iterations. Minor issues logged but don't block.
10. **Mark task complete** — Log outcome, advance to next task.

### After All Tasks

1. Dispatch a final holistic code review across the entire implementation (all tasks combined)
2. Proceed to the standard completion flow: final verification, DoD alignment, backlog updates (same as inline mode)

### SDD Rules

- **Never dispatch multiple implementers in parallel** — file conflicts
- **Never skip reviews** — both spec compliance AND code quality, every task
- **Spec review BEFORE code quality** — wrong order wastes quality reviewer time
- **Never let implementer read the plan file** — provide full task text directly
- **Provide scene-setting context** — every subagent starts fresh
- **Cap review loops at 3 iterations** — escalate to founder after that
- **Implementer subagents load Layer 0 skills** — TDD, verification, review reception

---

## Agent Usage

**If `--sdd` was passed:** Agent dispatching is governed entirely by the SDD Execution Mode section above. The orchestrator dispatches implementer, spec reviewer, and code quality reviewer subagents per task. The restrictions below do not apply — SDD has its own dispatching rules.

**Default (no `--deep`, no `--sdd`): do NOT spawn agents.** Use Glob, Grep, and Read directly to understand code. A good plan already tells you which files to read and which patterns to follow. If you can't understand something, read harder — don't reach for an agent.

**If `--deep` was passed (without `--sdd`)**, you may spawn up to 1 agent when ALL of these are true:
1. The plan references code you can't understand from reading it directly
2. You've already tried reading the file and tracing the logic yourself
3. The question is architectural (not just "what does this function do")

- Spawn **codebase-analyzer** agent: "Analyze how [component] works. I need to understand [specific aspect] to implement [step]."

**Never spawn more than 1 agent during implementation**, even with `--deep`. If you're needing agents frequently, the plan is insufficiently detailed — flag this to the founder rather than compensating with expensive agent calls.

## Skill Loading

Before writing code, load the relevant skills in three layers:

**Layer 0 — Behavioral discipline.** Always load these behavioral skills before starting work. They are **rigid** — follow them exactly, no exceptions. This layer is not optional and does not depend on the type of work being done.

- **`test-driven-development`** — No production code without a failing test first. Defines the red-green-refactor cycle.
- **`verification-before-completion`** — No completion claims without fresh verification evidence. Every "done" must cite proof from this message.
- **`receiving-code-review`** — No performative agreement with review feedback. Verify before implementing, push back when wrong.

**Layer 1 — Domain principles.** Load the generic skill that matches the work domain. These cover universal rules (validation, accessibility, migration safety, transaction boundaries) that apply regardless of stack:

- Working on **API endpoints/routes/handlers?** → Read the `api-design` skill
- Working on **frontend components/pages/styling?** → Read the `ui-design` skill
- Working on **database/migrations/queries?** → Read the `data-layer` skill
- Working on **business logic/services?** → Read the `service-layer` skill

**Layer 2 — Stack-specific patterns.** Check `.claude/skills/` for additional skills that match the specific technology. Read `stack.md` to identify the frameworks in use. Then scan `.claude/skills/*/SKILL.md` for project skills — read each skill's `stack` frontmatter field (a comma-separated list of technologies, e.g., `stack: python, django`). A skill matches if **any** of its `stack` entries appears as a technology in `stack.md` (case-insensitive). For example, if `stack.md` lists Django as the framework, a skill with `stack: python, django` matches because "django" appears in both. These cover concrete conventions — which annotations, which libraries, which patterns to follow. Load them on top of the generic skill.

If the project has no stack-specific skills, the generic skills are sufficient. If a stack-specific skill exists, load **both** — the generic skill for principles, the stack-specific skill for concrete patterns.

If a stack-specific skill conflicts with a generic skill, follow the stack-specific one (it reflects the project's actual conventions). If either conflicts with the implementation plan, the plan takes precedence — but flag the conflict.

Layer 0 is always loaded. For Layers 1 and 2, only load the skill(s) relevant to the current phase — don't load all of them at once.

---

## Important Guidelines

1. **Follow the plan:**
   - The plan is the source of truth. Don't add features, refactor adjacent code, or "improve" things the plan doesn't mention.
   - If you think the plan has an error, flag it and ask — don't silently deviate.
   - If a step is ambiguous, read the referenced pattern again before guessing.

2. **Verify at every boundary:**
   - Never skip verification steps, even if you're confident the code is correct
   - If a verification command isn't specified in the plan, at minimum run the project's type checker and linter
   - Failed verification is not optional to fix — stop and fix before proceeding

3. **Respect pause points:**
   - When the plan says to pause for manual verification, STOP
   - Do not continue implementing based on "it looks fine to me"
   - The founder needs to test manually before you build on top of potentially broken work

4. **Handle session breaks gracefully:**
   - If the session is ending mid-implementation, run `/handoff` to capture state
   - Note which phase and step you're on
   - The `--phase=N` flag lets the next session resume cleanly

5. **Stay in scope:**
   - Do NOT fix bugs you notice in unrelated code
   - Do NOT refactor code that works but "could be better"
   - Do NOT add error handling for scenarios not in the spec
   - Do NOT add comments explaining "why" unless the plan says to
   - If you see something worth addressing, note it for a future ticket — don't do it now

6. **Track progress with TodoWrite:**
   - Create a todo for each phase
   - Mark in-progress as you work through each phase
   - Mark complete after verification passes
