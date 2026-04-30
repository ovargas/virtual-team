---
name: checkpoints
description: Checkpoint protocol for resuming multi-phase commands after session interruptions
loaded_when: /vt-debug, /vt-epic, /vt-feature, /vt-implement, /vt-plan
---

# Checkpoints Skill

Checkpoints let multi-phase commands survive session interruptions. When a phase completes, the command writes a checkpoint file. When the command is re-invoked, it reads the checkpoint and resumes from the first incomplete phase.

## Context Pre-flight

Before starting a multi-phase command, check context usage:

- **At 60% context:** Warn the user. Suggest running `/compact` to free space, or finishing the current phase, committing the checkpoint, and starting a fresh session.
- **At 80% context:** Warn the user. Suggest running `/virtual-team:handoff` to generate a handoff document before context runs out, so the next session can resume cleanly.

Checkpoints exist precisely for this scenario — running out of context mid-work is expected, not exceptional. The command proceeds either way, but the user knows checkpoints will protect their progress.

## File Location and Naming

Checkpoint files live in `docs/checkpoints/`:

```
docs/checkpoints/<command>-<ID>.md
```

Where:
- `<command>` is the command name: `debug`, `epic`, `feature`, `implement`, `plan`
- `<ID>` is the item identifier the command is working on (e.g., `FEAT-003`, `EPIC-001`, `BUG-012`, the plan filename slug)

Examples:
```
docs/checkpoints/feature-FEAT-003.md
docs/checkpoints/implement-2026-02-12-notifications.md
docs/checkpoints/debug-BUG-012.md
docs/checkpoints/epic-EPIC-001.md
docs/checkpoints/plan-FEAT-007.md
```

If the item has no formal ID (e.g., a debug session started from a symptom description), derive a short slug from the context (e.g., `debug-login-timeout`).

## Checkpoint File Format

```markdown
---
command: <command>
item: <ID or description>
branch: <git branch name>
started: <ISO 8601 timestamp>
updated: <ISO 8601 timestamp>
status: in_progress
current_phase: 2
total_phases: 5
---

# Checkpoint: <command> — <item>

## Phases

| # | Phase | Status | Completed |
|---|---|---|---|
| 0 | Decision Sync | done | 2026-02-27T10:15:00Z |
| 1 | Capture | done | 2026-02-27T10:32:00Z |
| 2 | Product Analysis | in_progress | — |
| 3 | Technical Routing | pending | — |
| 4 | Agreements | pending | — |
| 5 | Document | pending | — |

## Current Phase Detail

<!-- Granular sub-tasks within the active phase only.
     Cleared when the phase completes. -->

- [x] Gathered user interview notes from docs/research/
- [x] Identified three competitor approaches
- [ ] Draft market positioning summary
- [ ] Validate assumptions with user persona matrix

## Current State

<!-- Brief description of where things stand — what was the last thing completed,
     what's next, any decisions made or blockers encountered. Keep this short
     but specific enough to resume without re-reading everything. -->

## Key Decisions

<!-- Capture decisions made during completed phases that affect later phases.
     This prevents re-asking the user questions they already answered. -->

- [Phase 0] Synced with hub decisions ADR-NNN and ADR-NNN
- [Phase 1] Scope confirmed: notifications for orders only, not marketing

## Artifacts Produced

<!-- List files created or modified by completed phases. This tells the
     resuming session what already exists and doesn't need to be recreated. -->

- `docs/epics/EPIC-001-notifications.md` (draft, through Phase 1)
- `docs/decisions/2026-02-27-notification-transport.md`

## Key Context

<!-- References to documents and context the resuming session should re-read.
     Populated on creation, stays fixed throughout. -->

- Feature: `docs/features/FEAT-003-notifications.md`
- Plan: `docs/plans/2026-02-12-notifications.md`
- Branch: `feat/CTR-12`
- Stack: Node.js + React (from stack.md)
```

## Phase Definitions by Command

Each command defines its own phases in its command file. The checkpoint tracks progress through those phases — it does not redefine them.

| Command | Phases | Source of truth |
|---|---|---|
| `/virtual-team:debug` | 4 phases (Reproduce → Document) | `commands/vt-debug.md` |
| `/virtual-team:epic` | 6 phases (Decision Sync → Document) | `commands/vt-epic.md` |
| `/virtual-team:feature` | 6 phases (Understand → Stories) | `commands/vt-feature.md` |
| `/virtual-team:plan` | 5 phases (Arch Gate → Update Backlog) | `commands/vt-plan.md` |
| `/virtual-team:implement` | Dynamic (from plan document) | The plan file being implemented |

When writing a checkpoint, copy the phase names from the command's definition. Do not invent or rename phases here.

## Protocol

### On Command Start (Step 0)

Every checkpointed command runs this before anything else:

1. **If `--fresh` was passed:**
   - Delete `docs/checkpoints/<command>-*.md` matching the current item
   - Proceed as if no checkpoint exists

2. **Check for existing checkpoint:**
   - Look for `docs/checkpoints/<command>-<ID>.md`
   - If found, read it and show a resume summary:
     ```
     Resuming from checkpoint: docs/checkpoints/<command>-<ID>.md
     Last updated: <timestamp>
     Completed: Phase 0 (Decision Sync), Phase 1 (Capture)
     Resuming at: Phase 2 (Product Analysis)
     ```
   - Skip to the first phase with status `pending` or `in_progress`
   - Re-read any artifacts listed in the checkpoint to restore context

3. **If no checkpoint exists:**
   - Proceed normally from the beginning

### After Each Phase Completes

1. Update the checkpoint file:
   - Set the completed phase status to `done` with a timestamp
   - Set the next phase status to `in_progress` (if there is one)
   - Update the `updated` timestamp in frontmatter
   - Update `Current State` with a brief summary
   - Add any decisions to `Key Decisions`
   - Add any created files to `Artifacts Produced`
   - Clear `Current Phase Detail` sub-tasks (the next phase starts with a fresh list)

2. Write the file using the Write tool — always overwrite the full file (not Edit), since multiple sections change each time.

3. Commit the checkpoint:
   ```bash
   git add docs/checkpoints/<command>-<ID>.md
   git commit -m "checkpoint: <command> <ID> — phase <N> complete"
   ```

### On Successful Completion

When all phases are done:

1. Delete the checkpoint file: `rm docs/checkpoints/<command>-<ID>.md`
2. Bundle the deletion into the final commit (e.g., the backlog update commit in `/virtual-team:implement`)
3. If the command doesn't produce a final commit, use: `git rm` + `git commit -m "checkpoint: <command> <ID> — complete, removing checkpoint"`

### On Failure or Interruption

If a phase fails (verification doesn't pass, blocker found):

1. Update the checkpoint with the failure state in `Current State`
2. Leave the phase as `in_progress` (not `done`)
3. Commit the failure state:
   ```bash
   git add docs/checkpoints/<command>-<ID>.md
   git commit -m "checkpoint: <command> <ID> — phase <N> failed"
   ```
4. The next session will resume at the failed phase with context about what went wrong

If the session is interrupted (context limit, user closes terminal):

- The last committed checkpoint is the recovery point
- This is why checkpoints are committed **after** each phase, not at the end — partial progress is preserved

## Directory Management

- Create `docs/checkpoints/` if it doesn't exist (with `.gitkeep`)
- Checkpoints are committed. They live in git so they survive across sessions, worktrees, and machines.
- Never add `docs/checkpoints/` to `.gitignore` — checkpoint reliability depends on git persistence.

## Guidelines

1. **Write checkpoints after phases, not during.** A phase is either done or not — no partial phase checkpoints.
2. **Keep `Current State` concise.** Two to three sentences max. The resuming session will re-read artifacts for detail.
3. **Capture decisions, not discussion.** `Key Decisions` records what was decided, not the deliberation.
4. **Always delete on success.** Stale checkpoints cause confusion. Clean up.
5. **Checkpoints are committed.** Every checkpoint write is followed by a `git commit`. This is the reliability guarantee — without it, checkpoints don't survive session boundaries.
6. **Don't checkpoint trivial commands.** Only the five multi-phase commands use checkpoints. Single-step commands like `/virtual-team:commit` or `/virtual-team:review` don't need them.
7. **Sub-tasks are ephemeral.** `Current Phase Detail` tracks granular items within the active phase only. When the phase completes, sub-tasks are cleared — they've served their purpose.
8. **Completed phases are trusted.** When resuming, do NOT re-verify or re-implement completed phases. Trust the checkpoint. If something is wrong, the user can `--fresh` to start over.
9. **One checkpoint per command+ID pair.** If `/virtual-team:implement FEAT-007` is run, there's one checkpoint file. Running it again resumes. Running `/virtual-team:implement FEAT-008` creates a separate checkpoint.
