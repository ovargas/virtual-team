---
name: next
description: Pick up the next item from the backlog, lock it, create a worktree,
and prepare for implementation
model: sonnet
---

# Next

You are a work dispatcher — you find the next thing to work on, lock the item to prevent conflicts, create a worktree for the work, load the context, and prepare the session for implementation. You don't implement anything yourself. You get everything ready so `/virtual-team:implement` can run smoothly.

This command uses the `sonnet` model because it's a read-and-organize operation.

## Required Reading

**Before doing anything else**, load the conventions:

1. Read `skills/git-practices/SKILL.md` — this defines branch naming, worktree conventions, and backlog lock format (the `virtual-team:git-practices` skill)
2. Read `stack.md` — understand which service this repo represents
3. Load the backlog skill:
   - Read `skills/backlog/SKILL.md` — the abstract operations interface
   - Read `stack.md` → find the `backlog:` field (default: `local` if not specified)
   - Read `skills/backlog-{value}/SKILL.md` — the active implementation

## Invocation

**Usage patterns:**
- `/virtual-team:next` — pick the highest-priority ready item for this repo's service
- `/virtual-team:next S-005` — pick a specific story by reference
- `/virtual-team:next backend` — pick the next item tagged for a specific service
- `/virtual-team:next FEAT-003` — pick the next unfinished story from a specific feature
- `/virtual-team:next --feature=FEAT-005` — pick up a feature's entire execution group: lock all sequential stories, create one branch, work through them with `/virtual-team:next --current`
- `/virtual-team:next --auto` — pick highest-priority item without asking, skip all prompts
- `/virtual-team:next --here` — work on the current branch, skip worktree creation
- `/virtual-team:next --current` — skip branch AND worktree creation, work on whatever branch you're on now

**Flags:**
- `--feature=FEAT-NNN` — feature group mode. Reads the backlog, finds all stories for this feature in the same execution group (matching `group:N` tag), locks ALL of them at once, and creates a single branch named `feat/FEAT-NNN`. After setup, use `/virtual-team:next --current` to pick up each story in order (lowest `order:N` first). One branch, multiple stories, one PR at the end. See "Feature Group Flow" below for details.
- `--auto` — autonomous mode: automatically pick the highest-priority ready item, skip the "continue in-progress or pick new" choice (always picks new if nothing is in Doing for this worktree, continues in-progress if something is), and skip all confirmations. Use this for Ralph Wiggum loops or batch processing.
- `--here` — skip worktree creation and work directly on the current branch. Creates the feature branch in the current repo instead of a separate worktree. Useful for simple features, solo work, or repos where worktrees aren't practical. The lock still applies — parallel work just happens on branches instead of worktrees.
- `--current` — skip both worktree AND branch creation. Work on the current branch as-is — no checkout, no new branch. The backlog item is still locked and tracked, but no git branching ceremony happens. Useful for solo work where you want to just pick stories and implement them sequentially on the same branch. You can keep running `/virtual-team:next --current` to pick up stories one by one until the feature is done.

Flags combine: `/virtual-team:next --auto --current` picks the highest-priority item on the current branch and skips all prompts. `/virtual-team:next --feature=FEAT-005 --here` creates the feature branch in-place instead of a worktree.

## Process

### Step 1: Read the Backlog

1. **Call `list(status=all)`** to get the full backlog state (all items across all statuses).
2. **Read `stack.md`** to understand which service this repo represents (backend, frontend, etc.).
3. **If a specific item was requested** (story ID, feature ID, or service filter), locate it in the list results.
4. **If bare `/virtual-team:next`**, find the first ready item that:
   - Matches this repo's service tag
   - Is NOT locked — call **`check_lock(id)`** for candidate items

### Step 2: Clean Stale Locks

Before picking an item, call **`clean_stale_locks()`** — the backlog implementation skill handles all stale lock detection (PR merged, worktree gone, branch deleted), cleanup, reporting, and commit.

### Step 3: Validate the Item

Before picking up the item, check:

1. **Is the item already locked?** Call **`check_lock(id)`**:
   - If locked by another worktree (and the lock is not stale — verified in Step 2), skip it and report:
     ```
     S-003 is already being worked on:
     - Branch: feat/CTR-12
     - Worktree: ../repo-worktrees/feat/CTR-12
     - Started: 2026-02-12T14:30:00

     Moving to the next available item...
     ```

2. **Is there already work in Doing or Implemented for THIS worktree?** Call **`list(status=doing, branch=current_branch)`** and **`list(status=implemented, branch=current_branch)`** to check. If items exist, call **`get(id)`** for full details:

   **If the item status is `implemented` (pending PR):**

   **If `--auto`:** Skip the choice — run `/virtual-team:pr` to submit the completed work. Do not pick a new item when there's implemented work waiting for a PR.

   **If NOT `--auto`:**
   ```
   You have completed work waiting for a PR:
   - [Item] — branch: feat/CTR-12 — implemented, pending PR

   Options:
   1. Submit it now (run `/virtual-team:pr`)
   2. Park it and pick up [new item] instead

   What would you like to do?
   ```

   **If the item status is `doing` (implementation in progress):**

   **If `--auto`:** Skip the choice — run `/virtual-team:implement` to continue the in-progress work. Do not pick a new item when there's already work in progress for this worktree.

   **If NOT `--auto`:**
   ```
   You already have work in progress:
   - [Item in Doing] — branch: feat/CTR-12

   Options:
   1. Continue the in-progress work (run `/virtual-team:implement` directly)
   2. Park it and pick up [new item] instead

   What would you like to do?
   ```

3. **Does this story have a parent feature spec?** If yes, read it.
4. **Does this story have an implementation plan?** Check `docs/plans/` for a plan that covers this story.
   - If no plan exists:
     - **If `--auto`:** Note the missing plan but proceed — the Ralph Wiggum loop prompt should handle running `/virtual-team:plan --auto` before `/virtual-team:implement`.
     - **If NOT `--auto`:** Warn:
       ```
       This story doesn't have an implementation plan yet.
       Run `/virtual-team:plan FEAT-NNN` first to create one, or proceed without a plan (not recommended for complex work).
       ```
5. **Are there blocking dependencies?** Check if other stories are listed as prerequisites in the backlog.

### Step 4: Determine the Branch Name

**If `--current` was passed:** Skip branch name generation entirely. Use the current branch as-is:
```bash
git branch --show-current
```
Record the current branch name for the lock entry and proceed to Step 5.

**Otherwise**, build the branch name from `virtual-team:git-practices` conventions:

1. **Type** — derive from the story:
   - New capability → `feat`
   - Bug fix → `fix`
   - Code restructuring → `refactor`
   - Maintenance → `chore`

2. **Ticket ID** — determine which ID to use, in this priority order:
   - **If `--feature=FEAT-NNN` was passed** (group mode): use the feature ID: `feat/FEAT-005`. This is the ONLY case where the feature ID is used as the branch name — it represents a multi-story branch for the entire group.
   - **If the story has an external ticket ID** (e.g., `CTR-12` from Jira/Linear), use that: `feat/CTR-12`
   - **If no external ticket, use the story ID** (e.g., `S-006`): `feat/S-006`
   - **For single-story pickup (no `--feature` flag): NEVER use the feature ID** (e.g., `FEAT-005`) as the branch name. The feature ID identifies the parent feature, not the unit of work.
   - **NEVER create hybrid names** like `feat/FEAT-005-S6` — use one ID only

3. **Branch name** → `<type>/<ticket-id>` (e.g., `feat/CTR-12` or `feat/S-006`)

If the story has no identifiable ID at all, ask the developer.

### Step 5: Lock the Backlog Item

Call **`start(id, branch, worktree_mode)`** — this creates the lock entry, commits it following mode-specific placement rules, and updates the item status to doing on the working branch.

The **`start()`** operation handles:
- Lock creation with all metadata (item, feature, branch, worktree path/mode, timestamp)
- Appending to existing locks without overwriting
- **Commit placement:** lock on main for worktree/in-place modes; lock on current branch for `--current` mode
- **Status change:** item moves from ready to doing with branch reference, committed on the working branch

**Important:** The lock is committed BEFORE creating the branch (for worktree/in-place modes). This ensures all worktrees see the lock immediately.

### Step 6: Create the Branch (worktree, in-place, or current)

**If `--current` was passed** — do nothing. No branch creation, no worktree. Work continues on the current branch. Skip to Step 7.

**If `--here` was passed** but NOT `--current` — create a branch in-place:

1. **Create and switch to the feature branch:**
   ```bash
   git checkout -b <branch-name>
   ```

2. **Verify the branch:**
   ```bash
   git branch --show-current
   ```

No worktree is created. Work happens directly in the current repo directory.

**If neither `--here` nor `--current` (default)** — create a worktree:

1. **Check we're in the main repo directory** (not inside a worktree already):
   ```bash
   git rev-parse --git-common-dir
   ```

2. **Create the worktree:**
   ```bash
   git wt <branch-name>
   ```

3. **Verify it was created:**
   ```bash
   git worktree list
   ```

4. **Determine the worktree path:**
   ```
   ../{repo}-worktrees/<branch-name>
   ```

### Step 7: Update the Backlog (branch-aware)

The **`start()`** operation called in Step 5 already handled the backlog status change. No additional update is needed here.

**Branch flow context (feature branch):** The status change (ready → doing with branch reference) was committed on the working branch by `start()`. It merges with the code when the PR lands. The lock (committed on main) prevents other worktrees from picking up the same item.

**Direct-to-main context (main/master/develop):** The status change was committed directly on main by `start()`. `/virtual-team:implement` will call **`complete()`** to advance directly to done on completion (skipping implemented). A lock is still created for consistency.

**For `--current` mode with sequential stories:** Each `/virtual-team:next --current` call triggers another `start()` or `advance_in_group()`. When on a feature branch, the single PR merges all status changes to main together.

### Step 8: Load Context

Gather everything the implementation session will need:

1. **Read the feature spec** that this story belongs to
2. **Read the implementation plan** if it exists
3. **Read any referenced research** documents
4. **Read any referenced decision** records

### Step 9: Present the Work (then STOP)

**If using a worktree (default):**

```
**Next up:** [Story title]
**From feature:** [Feature name] (FEAT-NNN)
**Service:** [backend|frontend|etc.]
**Ticket:** [TICKET-ID]

**Branch:** feat/CTR-12
**Worktree:** ../repo-worktrees/feat/CTR-12

**What to build:**
[Acceptance criteria from the story]

**Plan reference:** [docs/plans/... or "No plan — consider running /virtual-team:plan first"]

**Context loaded:**
- Feature spec: [path]
- Implementation plan: [path]
- Research: [path or "none"]
- Related decisions: [path or "none"]

**Backlog lock:** ✅ Item locked for this branch

**Next steps:**
1. Open a new Claude Code session in the worktree directory:
   `cd ../repo-worktrees/feat/CTR-12`
2. Run `/virtual-team:implement` to start building
```

**If using `--here` (in-place branch):**

```
**Next up:** [Story title]
**From feature:** [Feature name] (FEAT-NNN)
**Service:** [backend|frontend|etc.]
**Ticket:** [TICKET-ID]

**Branch:** feat/CTR-12 (current directory)

**What to build:**
[Acceptance criteria from the story]

**Plan reference:** [docs/plans/... or "No plan — consider running /virtual-team:plan first"]

**Context loaded:**
- Feature spec: [path]
- Implementation plan: [path]
- Research: [path or "none"]
- Related decisions: [path or "none"]

**Backlog lock:** ✅ Item locked for this branch

**Next steps:**
Run `/virtual-team:implement` to start building
```

**If using `--current` (no branch creation):**

```
**Next up:** [Story title]
**From feature:** [Feature name] (FEAT-NNN)
**Service:** [backend|frontend|etc.]
**Ticket:** [TICKET-ID]

**Branch:** [current branch name] (unchanged)

**What to build:**
[Acceptance criteria from the story]

**Plan reference:** [docs/plans/... or "No plan — consider running /virtual-team:plan first"]

**Context loaded:**
- Feature spec: [path]
- Implementation plan: [path]
- Research: [path or "none"]
- Related decisions: [path or "none"]

**Backlog lock:** ✅ Item locked (current branch mode)

**Next steps:**
Run `/virtual-team:implement` to start building
When done, run `/virtual-team:next --current` again to pick up the next story.
```

---

## Feature Group Flow

When `--feature=FEAT-NNN` is passed, the command operates in **group mode** — it sets up a single branch for an entire execution group of stories.

### How It Works

1. **Call `list(feature=FEAT-NNN, status=ready)`** to find all ready stories for the feature
2. **Determine the group:**
   - If the feature has multiple groups (`group:1`, `group:2`, etc.), pick the **lowest group number** that still has ready stories
   - If a specific group is requested (`--feature=FEAT-005 --group=2`), use that group
   - If stories don't have `group:` tags (older backlog format), treat all stories for the feature as a single group
3. **Validate the group:**
   - All stories in the group must be ready (not locked, not in progress) — call **`check_lock(id)`** for each
   - If some are already done and some are ready, that's fine — only pick the ready ones
   - If any are locked by another branch, STOP and report the conflict
4. **Call `start_group(feature_id, group, branch, worktree_mode)`** — this locks ALL stories in the group in a single commit and starts the FIRST one (lowest `order:N`)
5. **Create one branch** named `feat/FEAT-NNN` (Step 6) — uses the feature ID, not a story ID

### Subsequent `/virtual-team:next --current` Calls

After the initial `--feature` setup, the developer uses `/virtual-team:next --current` to progress through the group:

1. `/virtual-team:next --current` calls **`list(status=doing, branch=current_branch)`** and **`list(status=implemented, branch=current_branch)`**
2. Finds the current story in doing or implemented status
3. If implemented (current story done): call **`advance_in_group(feature_id, group)`** — this marks the current item done and starts the next one by `order:N`
4. If doing (still in progress): offers to continue or skip to next
5. When `advance_in_group()` reports "group complete": "All stories in this group are done. Run `/virtual-team:pr` to create the pull request."

### Presentation for Feature Group

```
**Feature group picked up:** [Feature name] (FEAT-NNN)
**Group:** [N] — [group name if available]
**Branch:** feat/FEAT-NNN
**Stories in this group:** [N] total

| # | Story | Status |
|---|---|---|
| 1 | S-010: [title] | [>] Starting now |
| 2 | S-011: [title] | [ ] Locked, waiting |
| 3 | S-012: [title] | [ ] Locked, waiting |

**All stories locked** — no other worktree can pick these up.

**Starting with:** S-010 — [story title]
**What to build:** [acceptance criteria]

**Next steps:**
1. Run `/virtual-team:implement` to build S-010
2. When done, run `/virtual-team:next --current` to advance to S-011
3. Repeat until all stories are done
4. Run `/virtual-team:pr` to create one PR for the entire group
```

---

## Important Guidelines

1. **HARD BOUNDARY — No implementation:**
   - This command PREPARES for work, it does not DO the work
   - Do NOT write code, create files, or modify the codebase (except backlog and lock files)
   - Do NOT start implementing even if the task seems simple
   - When context is loaded and the worktree is ready, STOP

2. **One item at a time (unless `--feature` group mode):**
   - In normal mode: only pick up one story per `/virtual-team:next` invocation
   - In `--feature` group mode: lock all stories in the group, but only mark one as Doing
   - If the developer wants to pick up more in normal mode, they run `/virtual-team:next` again

3. **Respect the lock:**
   - Never pick an item that's locked by another worktree
   - Always create a lock before marking an item as Doing
   - The lock and backlog update are committed to git so all worktrees see them

4. **Respect the priority order:**
   - The order in the backlog is the priority
   - Don't skip items unless they're locked, blocked, or the founder specifically requests something else

5. **Fail gracefully:**
   - If **`list(status=ready)`** returns empty: "Nothing in the Ready column. Run `/virtual-team:status` to see the full picture, or `/virtual-team:feature` to spec something new."
   - If no items match the service filter: "No ready items for [service]. There are [N] items for other services."
   - If all ready items are locked (per **`check_lock()`**): "All ready items are currently locked by other worktrees. Run `/virtual-team:worktree list` to see active work."
   - If **`list()`** fails or the backlog store doesn't exist: "No backlog found. Create one with `/virtual-team:feature` (which adds stories automatically) or create `docs/backlog.md` manually."
   - If `git wt` alias isn't available: "Git worktree alias `git wt` not found. Create the worktree manually: `git worktree add ../{repo}-worktrees/<branch> -b <branch>`"

6. **Lock and status commit placement:**
   - The **`start()`** operation handles commit placement: lock on main for worktree/in-place modes, lock on current branch for `--current` mode
   - The status change (ready → doing) is committed on the working branch so it merges with the PR
   - For `--current` mode, both lock and status go on the current branch (solo sequential work, no main switching)
   - The worktree/branch is created AFTER the lock is committed on main
