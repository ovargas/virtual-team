---
name: worktree
description: Create, remove, list, or migrate git worktrees for branch-based parallel work
model: sonnet
---

# Worktree

You manage git worktrees — isolated working directories for branch-based development. Each ticket gets its own worktree under `.claude/worktrees/`, enabling parallel work without branch switching.

This command uses `sonnet` because it's a mechanical git operation.

## Required Reading

**Before doing anything else**, load the conventions:

1. Read `skills/git-practices/SKILL.md` — this defines worktree folder conventions, branch naming, and backlog lock format
2. Read `stack.md` — understand the project context and the `worktree_copy:` list

## Invocation

**Usage patterns:**
- `/virtual-team:worktree create feat/CTR-12` — create a worktree for a branch and move the session into it
- `/virtual-team:worktree remove feat/CTR-12` — remove a worktree and clean up
- `/virtual-team:worktree list` — show all active worktrees with their status
- `/virtual-team:worktree clean` — remove worktrees for branches that have been merged
- `/virtual-team:worktree migrate` — move worktrees from the legacy `../{repo}-worktrees/` location into `.claude/worktrees/`

Shorthand:
- `/virtual-team:worktree feat/CTR-12` — same as `create` (default action)
- `/virtual-team:worktree --rm feat/CTR-12` — same as `remove`

## Paths

- **Main checkout root** (works from the main checkout or any worktree):
  ```bash
  dirname "$(git rev-parse --path-format=absolute --git-common-dir)"
  ```
- **Worktree directory:** `<main-root>/.claude/worktrees/<dir>`, where `<dir>` is the branch name with `/` replaced by `-` (`feat/CTR-12` → `feat-CTR-12`).

## Process

### Action: Create

1. **Parse `$ARGUMENTS`** for the branch name and derive `<dir>`
2. **Validate the branch name** follows `<type>/<ticket-id>` convention from `virtual-team:git-practices` skill
   - If it doesn't match, warn:
     ```
     Branch name "my-feature" doesn't follow the convention: <type>/<ticket-id>
     Expected something like: feat/CTR-12, fix/CTR-45

     Continue anyway, or provide a correct branch name?
     ```
3. **Check we're in the main checkout** (not inside a worktree):
   ```bash
   [ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ]
   ```
   - If inside a worktree, warn: "You're inside a worktree. Switch to the main checkout to create new worktrees."

4. **Check `.gitignore`:**
   ```bash
   git check-ignore -q .claude/worktrees/probe
   ```
   - If not ignored, ask: "`.claude/worktrees/` is not in `.gitignore`. Add it now?" If yes, append `.claude/worktrees/` to `.gitignore` and tell the founder the change must be committed through a PR. If no, continue but repeat the warning in the report.

5. **Check for an existing worktree** — if `git worktree list` already shows `.claude/worktrees/<dir>`, enter it with `EnterWorktree` and `path` (skip to step 7).

6. **Create the worktree and enter it:**
   - **New branch:** call `EnterWorktree` with `name: <dir>`. It creates `.claude/worktrees/<dir>` from `origin/<default-branch>` and moves the session there. If the branch it created isn't `<branch>`, rename it: `git branch -m <branch>`.
   - **Branch already exists** (`git show-ref --verify --quiet refs/heads/<branch>`): `EnterWorktree` only creates new branches, so run
     ```bash
     git worktree add .claude/worktrees/<dir> <branch>
     ```
     then call `EnterWorktree` with `path: .claude/worktrees/<dir>`.

7. **Copy local files** — for each entry in `stack.md` `worktree_copy:`, copy it from the main checkout root into the worktree:
   - Skip entries that don't exist in the main checkout (list them in the report)
   - Never overwrite a file that already exists in the worktree

8. **Verify** with `git worktree list` and `git branch --show-current`.

9. **Report:**
   ```
   **Worktree created:**
   - **Branch:** feat/CTR-12
   - **Path:** .claude/worktrees/feat-CTR-12
   - **Copied:** .env  (skipped: none)

   The session is now in the worktree. Run `/virtual-team:implement` to load context and start implementation.
   ```

### Action: Remove

1. **Parse `$ARGUMENTS`** for the branch name and derive `<dir>`
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
   git -C <main-root>/.claude/worktrees/<dir> status --porcelain
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
   - If this session entered it with `EnterWorktree` (`name`), call `ExitWorktree` with `action: remove` — note it deletes the branch too, so only use it when step 5 would delete the branch anyway.
   - Otherwise, leave it first if the session is inside it (`ExitWorktree` with `action: keep`), then from the main checkout:
     ```bash
     git worktree remove .claude/worktrees/<dir>
     ```
     Add `--force` only after the founder confirmed losing uncommitted changes in step 3.

5. **Optionally delete the branch** if the PR has been merged:
   - Check: `gh pr list --head <branch-name> --state merged`
   - If merged, ask: "The PR for this branch has been merged. Delete the local branch too?"
   - If yes: `git branch -d <branch-name>`

6. **Report:**
   ```
   **Worktree removed:**
   - **Branch:** feat/CTR-12
   - **Path cleaned:** .claude/worktrees/feat-CTR-12
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
   - Is it outside `.claude/worktrees/`? (legacy location — suggest `migrate`)

4. **Present:**
   ```
   **Active worktrees:**

   | Branch | Path | Lock | Status |
   |--------|------|------|--------|
   | feat/CTR-12 | .claude/worktrees/feat-CTR-12 | S-003 (FEAT-007) | Clean |
   | fix/CTR-45 | .claude/worktrees/fix-CTR-45 | S-008 (FEAT-009) | 3 uncommitted files |
   | feat/CTR-78 | ../repo-worktrees/feat/CTR-78 | — | Legacy location (run migrate) |

   **Main checkout:** on branch main, clean
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
5. **After confirmation**, remove each worktree with `git worktree remove <path>` and clean up locks.

### Action: Migrate

1. **Run from the main checkout** (same check as Create step 3) and run the `.gitignore` check from Create step 4.
2. **Find legacy worktrees** — entries in `git worktree list` under `../{repo}-worktrees/`.
3. **Present the plan:**
   ```
   **Migration plan:**

   1. ../repo-worktrees/feat/CTR-12 → .claude/worktrees/feat-CTR-12
   2. ../repo-worktrees/fix/CTR-45  → .claude/worktrees/fix-CTR-45

   Close any editor or Claude Code session open in these folders first — they will stop pointing at a valid directory.
   Proceed?
   ```
4. **After confirmation**, move each one (uncommitted changes move with it):
   ```bash
   git worktree move ../{repo}-worktrees/<branch> .claude/worktrees/<dir>
   ```
   - If git refuses (locked worktree, submodules, target exists), skip it and report the error — never force.
5. **Clean up** the legacy `../{repo}-worktrees/` directory only if it is now empty (`rmdir`, including empty `feat/`, `fix/` subfolders).
6. **Report** moved, skipped (with reason), and whether the legacy directory was removed. If the founder uses personal git aliases that hardcode the old path (e.g. `git wt`), mention they need updating.

---

## Important Guidelines

1. **HARD BOUNDARY — No implementation:**
   - This command manages worktrees, it does NOT write application code
   - Do NOT start implementing features after creating a worktree
   - After creating a worktree, STOP — the session is now in the worktree and the founder runs `/virtual-team:implement`

2. **Always validate branch names:**
   - Branch naming follows `virtual-team:git-practices`: `<type>/<ticket-id>`
   - Warn on non-conforming names but don't block (the founder might have a reason)

3. **Protect uncommitted work:**
   - Never remove a worktree with uncommitted changes without explicit confirmation
   - Always show what would be lost

4. **Main checkout stays clean:**
   - The main checkout always stays on the default branch
   - Never create worktrees from inside another worktree
   - Worktrees are always at `.claude/worktrees/<branch with / → ->`

5. **Ask before destructive actions:**
   - Removing worktrees with changes
   - Deleting branches
   - Cleaning up or migrating multiple worktrees
