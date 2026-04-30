---
name: vt-worktree
description: Create, remove, or list git worktrees for branch-based parallel work
model: sonnet
---

# Worktree

You manage git worktrees — isolated working directories for branch-based development. Each ticket gets its own worktree, enabling parallel work without branch switching.

This command uses `sonnet` because it's a mechanical git operation.

## Required Reading

**Before doing anything else**, load the conventions:

1. Read `skills/git-practices/SKILL.md` — this defines worktree folder conventions, branch naming, and backlog lock format
2. Read `stack.md` — understand the project context

## Invocation

**Usage patterns:**
- `/virtual-team:worktree create feat/CTR-12` — create a worktree for a branch
- `/virtual-team:worktree remove feat/CTR-12` — remove a worktree and clean up
- `/virtual-team:worktree list` — show all active worktrees with their status
- `/virtual-team:worktree clean` — remove worktrees for branches that have been merged

Shorthand:
- `/virtual-team:worktree feat/CTR-12` — same as `create` (default action)
- `/virtual-team:worktree --rm feat/CTR-12` — same as `remove`

## Process

### Action: Create

1. **Parse `$ARGUMENTS`** for the branch name
2. **Validate the branch name** follows `<type>/<ticket-id>` convention from `virtual-team:git-practices` skill
   - If it doesn't match, warn:
     ```
     Branch name "my-feature" doesn't follow the convention: <type>/<ticket-id>
     Expected something like: feat/CTR-12, fix/CTR-45

     Continue anyway, or provide a correct branch name?
     ```
3. **Check we're in the main repo** (not inside a worktree):
   ```bash
   git rev-parse --git-common-dir
   ```
   - If inside a worktree, warn: "You're inside a worktree. Switch to the main repo directory to create new worktrees."

4. **Create the worktree** using the founder's alias:
   ```bash
   git wt <branch-name>
   ```

5. **Verify it was created:**
   ```bash
   git worktree list
   ```

6. **Report:**
   ```
   **Worktree created:**
   - **Branch:** feat/CTR-12
   - **Path:** ../{repo}-worktrees/feat/CTR-12

   To work in this worktree:
   - Open a new Claude Code session in the worktree directory
   - Run `/virtual-team:implement` to load context and start implementation
   ```

### Action: Remove

1. **Parse `$ARGUMENTS`** for the branch name
2. **Check for in-progress work** — load the backlog skill and call **`list(status=doing)`** to check if any items are being worked on this branch:
   - If items are in Doing status, warn:
     ```
     Branch feat/CTR-12 has work in progress:
     - Item: S-003 (from FEAT-007) — status: Doing

     This means work is still in progress. Options:
     1. Remove the worktree (work is done or abandoned)
     2. Cancel — keep the worktree
     ```

3. **Check for uncommitted changes** in the worktree:
   ```bash
   git -C ../{repo}-worktrees/<branch> status --porcelain
   ```
   - If there are changes, warn:
     ```
     The worktree has uncommitted changes:
     [list of changed files]

     Options:
     1. Remove anyway (changes will be lost)
     2. Cancel — commit or stash first
     ```

4. **Remove the worktree:**
   ```bash
   git wtr <branch-name>
   ```

5. **Optionally delete the branch** if the PR has been merged:
   - Check: `gh pr list --head <branch-name> --state merged`
   - If merged, ask: "The PR for this branch has been merged. Delete the local branch too?"
   - If yes: `git branch -d <branch-name>`

6. **Report:**
   ```
   **Worktree removed:**
   - **Branch:** feat/CTR-12
   - **Path cleaned:** ../{repo}-worktrees/feat/CTR-12
   - **Branch deleted:** [yes/no]
   - **Lock released:** [yes/no/none existed]
   ```

### Action: List

1. **Run `git worktree list`** and parse the output
2. **Load the backlog skill** and retrieve lock information to correlate locks with worktrees
3. **For each worktree, check:**
   - Does it have uncommitted changes?
   - Does it have a backlog lock?
   - Has its PR been merged? (`gh pr list --head <branch> --state merged`)

4. **Present:**
   ```
   **Active worktrees:**

   | Branch | Path | Lock | Status |
   |--------|------|------|--------|
   | feat/CTR-12 | ../repo-worktrees/feat/CTR-12 | S-003 (FEAT-007) | Clean |
   | fix/CTR-45 | ../repo-worktrees/fix/CTR-45 | S-008 (FEAT-009) | 3 uncommitted files |
   | feat/CTR-78 | ../repo-worktrees/feat/CTR-78 | — | PR merged ✓ (can remove) |

   **Main repo:** on branch main, clean
   ```

### Action: Clean

1. **List all worktrees**
2. **For each worktree (excluding main):**
   - Check if the PR has been merged: `gh pr list --head <branch> --state merged`
   - Check if the branch has been deleted remotely: `git ls-remote --heads origin <branch>`
3. **Collect candidates for removal** — worktrees where:
   - The PR has been merged, OR
   - The remote branch no longer exists
4. **Present the cleanup plan:**
   ```
   **Cleanup candidates:**

   1. feat/CTR-12 — PR merged, no uncommitted changes → safe to remove
   2. fix/CTR-45 — Remote branch deleted, no uncommitted changes → safe to remove
   3. feat/CTR-78 — PR merged, but 2 uncommitted files → ⚠️ review first

   Remove the safe ones? (Will also clean up any stale backlog locks)
   ```
5. **After confirmation**, remove each worktree and clean up locks.

---

## Important Guidelines

1. **HARD BOUNDARY — No implementation:**
   - This command manages worktrees, it does NOT write application code
   - Do NOT start implementing features after creating a worktree
   - After creating a worktree, STOP — the founder opens a new session there

2. **Always validate branch names:**
   - Branch naming follows `virtual-team:git-practices`: `<type>/<ticket-id>`
   - Warn on non-conforming names but don't block (the founder might have a reason)

3. **Protect uncommitted work:**
   - Never remove a worktree with uncommitted changes without explicit confirmation
   - Always show what would be lost

4. **Main repo stays clean:**
   - The main repo directory always stays on the default branch
   - Never create worktrees from inside another worktree
   - Worktrees are always at `../{repo}-worktrees/{branch}`

5. **Ask before destructive actions:**
   - Removing worktrees with changes
   - Deleting branches
   - Cleaning up multiple worktrees
