---
name: handoff
description: Capture session state for clean context transfer between sessions
model: sonnet
---

# Handoff

You are writing a handoff note — a document that lets a future session (or the founder returning tomorrow) pick up exactly where this session left off. Think of it as the note a night-shift worker leaves for the morning shift.

This command uses `sonnet` because it's a read-and-summarize operation.

## Invocation

**Usage patterns:**
- `/handoff` — capture full session state
- `/handoff [brief context]` — include specific notes in the handoff

## Process

### Step 1: Gather State

Read all relevant context WITHOUT asking the user — this should be fast and automatic:

1. **Check `docs/backlog.md`** — what's in Doing?
2. **Check `git status` and `git log --oneline -5`** — what was committed? What's uncommitted?
3. **Check `git diff --stat`** — how many files have been modified?
4. **Check the current implementation plan** (if one was being executed) — which phase/step was in progress?
5. **Read any TodoWrite state** — what tasks were tracked this session?
6. **Read recent handoffs** in `docs/handoffs/` — is there a chain of context to maintain?

### Step 2: Write the Handoff

Create the document at `docs/handoffs/YYYY-MM-DD-HHMMSS-description.md`:

```markdown
---
date: YYYY-MM-DDTHH:MM:SS
session_context: [brief description of what this session was about]
story_in_progress: [S-NNN or "none"]
feature: [FEAT-NNN or "none"]
plan: [docs/plans/... or "none"]
status: [implementing | planning | researching | reviewing | idle]
---

# Session Handoff — [Date]

## What Was Being Worked On

[1-2 sentences: the story or task, and what phase of work.]

## What Got Done

[Bullet list of concrete accomplishments this session:]
- [Completed Phase 1 of implementation plan — database migration and model created]
- [Committed: `abc1234` — "feat: add notification preferences table"]
- [Reviewed and approved: auth middleware changes]

## Where It Stopped

[Exactly where work paused — which phase, which step, what was the last thing completed:]

**Current state:**
- Plan phase: [N] of [total], Step [N.N]
- Last completed: [specific step]
- Next step: [what would happen next]

## Uncommitted Changes

[List of modified files not yet committed, and their purpose:]
- `path/to/file.ext` — [what was changed and why it's not committed yet]

Or: "All changes committed. Clean working directory."

## Blockers or Issues

[Anything that's stuck, broken, or needs the founder's decision:]
- [Blocker 1: description and what's needed to unblock]

Or: "No blockers."

## Open Questions

[Questions that came up during the session that weren't resolved:]
- [Question 1]

Or: "None."

## To Resume

[Exact instructions for the next session to continue seamlessly:]

```
1. Run `/next` or `/implement --phase=N` to continue
2. [Any setup steps needed — e.g., "start the database first"]
3. [Specific thing to check — e.g., "verify the migration from last session applied cleanly"]
```

## Context That Might Be Useful

[Anything the next session should know that doesn't fit above:]
- [Decision made during this session that isn't documented elsewhere]
- [Oddity discovered in the codebase]
- [Shortcut or workaround used]
```

### Step 3: Update Backlog

If work is in progress:
- Keep the item in Doing in `docs/backlog.md`
- Add a note: `(handoff: docs/handoffs/YYYY-MM-DD-HHMMSS-description.md)`

### Step 4: Present

```
Handoff saved to: `docs/handoffs/YYYY-MM-DD-HHMMSS-description.md`

**Summary:** [1 sentence — where things stand]
**To resume:** [1 sentence — what command to run next]
```

---

## Important Guidelines

1. **Be precise about where work stopped:**
   - "Working on notifications" is useless
   - "Phase 2, Step 2.3 of the notifications plan — finished the route handler, haven't written the test yet" is useful
   - The next session should know exactly which line of the plan to pick up from

2. **Don't editorialize:**
   - Report state, not opinions
   - "The auth middleware is confusing" doesn't help. "The auth middleware in `middleware/auth.ts:45` handles both session and API token auth in one function — read it carefully before modifying" does.

3. **Include uncommitted work:**
   - If there are modified files not committed, list them with context
   - The next session needs to know if there's work-in-progress in the file system

4. **Fast and automatic:**
   - Don't ask the founder questions during handoff (unless they provided context in the invocation)
   - Read everything you need, write the document, done
   - This should take seconds, not minutes

5. **Chain context:**
   - If there's a previous handoff for the same story, reference it
   - Build a narrative — "Continued from handoff [date]: [what happened since]"

6. **HARD BOUNDARY — No implementation:**
   - This command captures state, it doesn't advance work
   - Do NOT "finish up" a step before writing the handoff
   - Do NOT commit uncommitted changes (that's `/commit`'s job)
   - Capture the state AS IT IS, then stop
