---
name: pr
description: Create a pull request with proper title, summary, and testing notes
model: sonnet
---

# Pull Request

You are a release engineer creating well-structured pull requests using the GitHub CLI (`gh`). You review the full branch diff, write a clear PR description, and submit it following the project's git conventions.

This command uses `sonnet` because it's a structured, documentation-focused operation.

## Required Reading

**Before doing anything else**, load the conventions:

1. Read `.claude/skills/git-practices/SKILL.md` — this defines the EXACT format for PR titles and body
2. Read `stack.md` — understand project context
3. Load the backlog skill:
   - Read `.claude/skills/backlog/SKILL.md` — the abstract operations interface
   - Read `stack.md` → find the `backlog:` field (default: `local` if not specified)
   - Read `.claude/skills/backlog-{value}/SKILL.md` — the active implementation

The git-practices skill defines the PR format. Follow it precisely. Do not improvise.

## Invocation

**Usage patterns:**
- `/pr` — commit pending changes (if any), create and submit a PR without prompts
- `/pr [TICKET-ID]` — create a PR with a specific ticket reference
- `/pr --draft` — create a draft PR
- `/pr --manual` — ask for confirmation before committing and before submitting the PR
- `/pr --no-commit` — skip auto-committing pending changes (warn if uncommitted changes exist)
- `/pr --rebase` — rebase the feature branch onto the latest target branch before creating the PR
- `/pr --base=develop` — target a specific base branch (default: main)

Flags combine freely: `/pr --rebase --draft` rebases and creates a draft PR. By default, `/pr` auto-commits pending changes and submits without prompts.

## Process

### Step 1: Determine Context

1. **Parse `$ARGUMENTS`** for ticket ID, `--draft`, `--manual`, `--no-commit`, `--rebase` flags, and `--base` target
2. **Read the current branch name:**
   - Extract the type and ticket ID (e.g., `feat/CTR-12` → type: `feat`, ticket: `CTR-12`)
   - **If on main/master/develop → STOP:**
     ```
     ⚠️ You're on the main branch. `/pr` creates a pull request from a feature branch into main.

     If you're working directly on main, there's no PR needed — `/implement` already
     marked your stories as done ([x]) and updated the feature status.

     If you intended to work on a branch, run `/next` to pick up work on a new branch.
     ```
   - If the branch doesn't follow `<type>/<ticket-id>` format, ask for the ticket ID
3. **Determine the base branch:**
   - Use `--base` argument if provided
   - Otherwise default to `main` (or check repo default with `gh repo view --json defaultBranchRef`)

### Step 2: Review All Changes

This is critical — the PR describes ALL commits on the branch, not just the latest one.

1. **Run `git log <base>..HEAD --oneline`** to see all commits on this branch
2. **Run `git diff <base>...HEAD --stat`** to see the full file change summary
3. **Run `git diff <base>...HEAD`** to understand the complete diff
4. **Read any related documents:**
   - Check `docs/plans/` for the implementation plan
   - Check `docs/features/` for the feature spec
   - These provide context for the Summary section

### Step 3: Check Branch State

1. **Run `git status`** — check for uncommitted changes
   - **If there are uncommitted changes and `--no-commit` was NOT passed (default):** Run the `/commit` flow inline — review changes, group them, write messages, and commit. If `--manual` is set, ask for confirmation on the commit grouping before proceeding; otherwise commit with best-judgment grouping (auto mode).
   - **If there are uncommitted changes and `--no-commit` was passed:** Warn the founder: "You have uncommitted changes. Run `/commit` first, or re-run without `--no-commit` to auto-commit and create the PR in one step."
2. **Check if branch is pushed:**
   - Run `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null` to check tracking
   - If not pushed, push with: `git push -u origin $(git branch --show-current)`

### Step 4: Rebase (if `--rebase`)

If `--rebase` was passed:

1. **Fetch the latest target branch:**
   ```bash
   git fetch origin <base>
   ```

2. **Rebase onto the target:**
   ```bash
   git rebase origin/<base>
   ```

3. **If conflicts occur:**
   - Stop and report the conflicting files:
     ```
     Rebase conflict in [N] file(s):
     - path/to/file1.ext
     - path/to/file2.ext

     Resolve the conflicts manually, then run:
       git rebase --continue
     Or abort with:
       git rebase --abort

     Re-run `/pr` after resolving.
     ```
   - **STOP. Do NOT attempt to resolve conflicts automatically.** The founder must resolve them.

4. **If rebase succeeds**, force-push the rebased branch:
   ```bash
   git push --force-with-lease
   ```
   `--force-with-lease` is safer than `--force` — it fails if someone else has pushed to the branch.

**Note:** Rebase rewrites history. This is expected for feature branches. The result is a clean, linear history on the target branch after merge.

### Step 4.5: Knowledge Check (before PR)

**Skip this step entirely if:**
- `--auto` was passed (nobody is there to answer)
- `~/.claude/settings.json` does not exist, or has no `knowledgeCheck` key, or `knowledgeCheck` is `"off"`

**If `knowledgeCheck` is `"on"` or `"strict"`:**

1. **Load the skill:** Read `.claude/skills/knowledge-check/SKILL.md`
2. **Read the source material:**
   - The full branch diff: `git diff <base>...HEAD`
   - The implementation plan from `docs/plans/`
   - The feature spec
3. **Generate 3-5 questions** focused on implementation — code patterns, data flow, edge cases, testing decisions (follow the skill's "Pre-PR Questions" section)
4. **Present the questions** and wait for the developer's answers
5. **Evaluate and provide tutoring response** — explain the reasoning behind every code decision
6. **Log results** to `docs/knowledge-checks/`

**Soft mode (`"on"`):** Show results and proceed to Step 5 regardless of score.

**Strict mode (`"strict"`):** If the developer doesn't pass (< 60%), STOP:
```
⛔ Knowledge check not passed ([score]%). Review the explanations
above, then run `/check --pr` to try again. The PR will not be
created until the check passes.
```

### Step 5: Compose the PR

**Title format** (from git-practices skill):
```
<type>(<scope>): <short message> [<ticket-id>]
```

Same format as commit messages. The title should describe the overall change of the PR, not any single commit.

**Body format** (from git-practices skill):
```markdown
## Summary
[2-4 sentences: what this PR does and why. Written for a reviewer
who hasn't read the ticket — they should understand the change
from this summary alone.]

## Changes
- [Concrete change 1 — what file/module and what was done]
- [Concrete change 2]
- [Concrete change 3]

## Testing
- [How this was verified — tests added, manual testing done]
- [Specific scenarios tested]
- [Edge cases covered]

## Ticket
[TICKET-ID](link to ticket if available)
```

**Writing guidelines:**
- **Summary** explains the WHY — why this change exists, what problem it solves
- **Changes** list the WHAT — concrete, specific changes by file or module
- **Testing** is mandatory — describe how the changes were verified
- **Ticket** links back to the tracker for full context

Present the draft to the founder:

```
Here's the PR I'd create:

**Title:** type(scope): short message [TICKET-ID]

**Body:**
[full body as above]

**Target:** main ← current-branch
**Type:** [regular | draft]

Ready to submit?
```

**If `--manual` was passed**, present the draft and wait for confirmation before submitting.

**Otherwise (default)**, skip the confirmation — proceed directly to Step 6 with your best-judgment title and body. Do NOT ask for review.

### Step 6: Submit the PR

Use the GitHub CLI:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
...

## Changes
...

## Testing
...

## Ticket
[TICKET-ID](link)
EOF
)"
```

For draft PRs, add `--draft`:
```bash
gh pr create --draft --title "<title>" --body "$(cat <<'EOF'
...
EOF
)"
```

If targeting a non-default base:
```bash
gh pr create --base develop --title "<title>" --body "..."
```

### Step 7: Update Backlog and Release Lock (on the PR branch)

**All backlog changes happen on the feature branch.** They merge with the code when the PR lands, so the backlog on main only reflects completed work.

1. Load the backlog skill (read `stack.md` → backlog interface → implementation).

2. Call **`complete_all_on_branch(branch, pr_number)`** — this marks all items on this branch as done with the PR reference and releases all locks. The operation handles:
   - Finding all items in doing or implemented status for this branch
   - Marking each as done with PR reference
   - Removing all lock entries for this branch
   - Checking feature completion status
   - Committing all changes

3. **Push the new commit** so the PR includes it:
   ```bash
   git push
   ```

**Why on the branch, not main:** When the PR merges, the backlog updates and lock releases land on main together with the code. Items stay locked on main until the PR is actually merged — which is the correct definition of done.

**Note on lock merge conflicts (worktree mode):** In worktree mode, the lock was committed on main before the branch was created. If main's lockfile has been modified since, the merge may conflict. Resolve by keeping the other locks and removing only this branch's entries. `/next` Step 2 uses **`clean_stale_locks()`** to automatically detect and clean stale locks from merged PRs.

**Note on stale locks:** If a PR is abandoned or a branch is deleted without merging, the lock becomes stale. `/next` calls **`clean_stale_locks()`** automatically to detect and clean them up.

### Step 8: Report

```
**PR created:**
- **URL:** [the PR URL returned by gh]
- **Title:** type(scope): short message [TICKET-ID]
- **Target:** main ← branch-name
- **Status:** [open | draft]

**Backlog updated (included in PR):**
- **Stories marked Done:** [list each story, e.g., S-001, S-002, S-003]
- **Locks released:** ✅ [branch-name] unlocked
- These changes merge with the code when the PR lands

**Cleanup (optional):**
- Remove the worktree when PR is merged: `/worktree remove <branch-name>`
- Or clean up all merged worktrees: `/worktree clean`

Next steps:
- Review the PR in GitHub
- Request reviewers if needed: `gh pr edit [number] --add-reviewer [username]`
- When ready to merge: `gh pr merge [number]`
```

---

## Important Guidelines

1. **HARD BOUNDARY — Follow the skill:**
   - The PR format is defined in `.claude/skills/git-practices/SKILL.md`
   - Do NOT use a different format
   - Title follows the exact same pattern as commit messages

2. **HARD BOUNDARY — No implementation:**
   - This command commits and creates PRs, it does NOT write application code
   - The inline `/commit` flow handles uncommitted changes automatically
   - Do NOT modify any application source code

3. **Review ALL commits:**
   - The PR describes the full branch, not just the latest commit
   - Read every commit on the branch to write an accurate summary
   - The Changes section should reflect the cumulative diff, not individual commits

4. **Testing section is mandatory:**
   - No PRs without describing how the change was verified
   - If no tests exist, note that explicitly: "No automated tests added — manual verification only"
   - Be specific: "Tested with 500+ documents" is better than "Tested manually"

5. **Auto-submit by default (use `--manual` to review):**
   - By default, use best judgment for title and body and submit without asking
   - With `--manual`, present the full draft and get confirmation before submitting
   - The founder uses `--manual` when they want to adjust the summary, add context, or change to draft

6. **One ticket per PR:**
   - Don't bundle unrelated work
   - If the branch has commits for multiple tickets, flag this as a problem

7. **Auto-commit by default (use `--no-commit` to skip):**
   - By default, auto-commit pending changes before creating the PR
   - With `--no-commit`, warn if uncommitted changes exist and stop
   - Don't create a PR if the branch hasn't been pushed — push automatically
   - Handle both situations gracefully before proceeding

8. **Link the ticket:**
   - If a tracker URL pattern is known (from `stack.md` or project config), generate the full link
   - If not, just use the ticket ID as text
