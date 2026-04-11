---
name: git-practices
description: Git conventions for branches, commits, and pull requests. Load this skill whenever creating branches, writing commit messages, or opening PRs. Trigger on any git workflow operation — commits, branches, pull requests, or merge operations.
model: sonnet
---

# Git Practices

These are the conventions for all git operations in this project. Every branch, commit, and pull request follows these rules without exception.

## Branch Naming

**Format:** `<type>/<ticket-id>`

**Types:**
- `feat` — New feature or capability
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `chore` — Maintenance, tooling, config, dependencies

**Examples:**
```
feat/CTR-12
fix/CTR-45
refactor/CTR-78
chore/CTR-99
```

**Rules:**
- Ticket ID matches the project tracker (JIRA, Linear, etc.)
- Lowercase everything
- No descriptions in branch name — the ticket ID is the reference
- One branch per ticket — don't combine work from multiple tickets

## Commit Messages

**Format:**
```
<type>(<scope>): <short message> [<ticket-id>]

<description>
```

**Line 1 (subject):**
- `type` — Same as branch types, plus: `docs` (documentation), `test` (tests only)
- `scope` — One word indicating the module or layer affected (e.g., `auth`, `api`, `database`, `ui`, `config`)
- `short message` — Imperative mood, lowercase, no period, under 50 characters after the scope
- `ticket-id` — In square brackets at the end

**Line 2:** Blank line (always)

**Line 3+ (description):**
- What was done and why, in plain sentences
- Reference related files or decisions if helpful
- Keep it concise — enough context for someone reading git log, not a full essay

**Examples:**
```
feat(document): implement search by text [CTR-12]

Added full-text search to the document module using the existing
search index. Follows the pattern established in the user search
feature.
```

```
fix(auth): prevent token refresh race condition [CTR-45]

Two concurrent requests could both trigger a token refresh,
causing one to fail with an invalid token error. Added a mutex
to ensure only one refresh happens at a time.
```

```
refactor(api): extract validation middleware [CTR-78]

Moved request validation logic from individual route handlers
into a shared middleware. Reduces duplication across 12 endpoints.
```

```
chore(config): update dependencies to latest stable [CTR-99]

Bumped all non-major dependencies. No breaking changes detected.
```

```
test(billing): add edge cases for prorated charges [CTR-33]

Covers: mid-cycle upgrade, downgrade on last day, zero-usage
month, and negative balance scenarios.
```

```
docs(api): update endpoint documentation for v2 routes [CTR-55]

Reflects the new response format introduced in the API v2 migration.
```

**Rules:**
- Subject line is mandatory, description is mandatory for anything beyond trivial changes
- No co-author or AI attribution lines
- One logical change per commit — if you have to use "and" in the subject, consider splitting
- The type in the commit matches the branch type (a `feat/` branch should have `feat()` commits, with occasional `test()` or `docs()` commits for supporting work)

## Pull Requests

**Title format:** Same as commit subject line:
```
<type>(<scope>): <short message> [<ticket-id>]
```

**Body format:**
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

**Examples:**

Title: `feat(document): implement search by text [CTR-12]`

Body:
```markdown
## Summary
Adds full-text search to the document module, allowing users to
search documents by content rather than just title. Uses the existing
search index infrastructure established in user search.

## Changes
- Added search endpoint `GET /api/documents/search` with query parameter
- Created `DocumentSearchService` following the `UserSearchService` pattern
- Added search result highlighting in the response
- Added 8 unit tests covering: exact match, partial match, no results,
  special characters, pagination, and sorting

## Testing
- Unit tests pass: `npm run test -- documents`
- Manual testing: verified search returns expected results with 500+ documents
- Tested edge cases: empty query, very long query, special characters

## Ticket
[CTR-12](https://tracker.example.com/CTR-12)
```

**Rules:**
- PR title follows the exact same format as commit messages
- Summary explains the WHY, changes list the WHAT
- Testing section is mandatory — no PRs without describing how it was verified
- One ticket per PR — don't bundle unrelated work
- Link the ticket if possible
- No screenshots unless the change is visual (then they're encouraged)

## Tool

Pull requests are created with the GitHub CLI (`gh`):

```bash
gh pr create --title "<title>" --body "<body>"
```

For drafts:
```bash
gh pr create --draft --title "<title>" --body "<body>"
```

## Determining the Type

When in doubt about the commit/branch type:

| If the change... | Type |
|---|---|
| Adds a new user-facing capability | `feat` |
| Fixes something that was broken | `fix` |
| Changes code structure without changing behavior | `refactor` |
| Updates build, CI, deps, config, tooling | `chore` |
| Only adds or updates documentation | `docs` |
| Only adds or updates tests | `test` |

If a commit includes both a feature and its tests, use `feat` — the tests support the feature. If a commit is purely adding missing tests for existing code, use `test`.

## Determining the Scope

The scope should be a single word identifying the affected module or layer. Use names that match your project's directory structure or domain concepts:

**Examples of good scopes:**
- `auth`, `api`, `database`, `ui`, `config`, `billing`, `search`, `notifications`
- `user`, `document`, `task`, `project`, `team`

**Avoid:**
- Generic scopes: `app`, `code`, `misc`, `stuff`
- Multi-word scopes: `user-profile` (use `user` or `profile`)
- File names as scopes: `userService` (use `user`)

## Git Worktrees

We use git worktrees instead of switching branches. Each branch lives in its own directory, allowing parallel work across multiple features.

**Folder convention:**
```
my-repo/                    ← main branch (cloned from GitHub)
my-repo-worktrees/          ← worktree directory (sibling, auto-created)
  feat/CTR-12/              ← one worktree per branch
  fix/CTR-45/
```

**Creating a worktree:**
```bash
git wt feat/CTR-12
```
This uses the global alias `git wt` which:
- Creates the worktree at `../{repo}-worktrees/{branch}`
- Reuses the branch if it already exists, or creates it with `-b`

**Removing a worktree:**
```bash
git wtr feat/CTR-12
```
This uses the global alias `git wtr` which removes the worktree from `../{repo}-worktrees/{branch}`.

**Listing worktrees:**
```bash
git worktree list
```

**Rules:**
- Always create worktrees from the main repo directory (not from inside another worktree)
- Branch name follows the Branch Naming convention above: `<type>/<ticket-id>`
- One worktree per ticket — matches one-branch-per-ticket rule
- Remove worktrees after the PR is merged to keep the directory clean
- The main repo directory always stays on the default branch (main/master) — never switch branches there

## Backlog Lock

When working with worktrees, multiple sessions may access the backlog simultaneously. A lockfile prevents two worktrees from picking up the same item.

**File:** `docs/backlog.lock`

**Format:**
```yaml
# Managed by /next and /pr commands — do not edit manually
locks:
  - item: "S-003"
    feature: "FEAT-007"
    branch: "feat/CTR-12"
    worktree: "../my-repo-worktrees/feat/CTR-12"
    started: "2026-02-12T14:30:00"
```

**Rules:**
- `/next` creates a lock entry when picking up a backlog item
- `/pr` removes the lock entry on the feature branch — the removal lands on main when the PR merges
- `/worktree --remove` checks for stale locks and warns
- Before picking an item, `/next` checks the lockfile — if the item is locked, it skips to the next
- If a lock is stale (branch no longer exists, PR merged, worktree removed), `/next` cleans it up automatically

**Lock vs. backlog status — where each is committed:**
- **Lock file (`backlog.lock`):** Committed on main for default/here modes (cross-worktree coordination). Committed on the current branch for `--current` mode (solo work, no main switching).
- **Backlog status (`backlog.md`):** Always committed on the feature branch. The `[ ]` → `[>]` → `[=]` → `[x]` lifecycle happens entirely on the branch and merges with the PR. Main's backlog only reflects completed work after PRs merge.

**Multi-story branches:** When using `/next --current` to pick up multiple stories on a single branch, each story gets its own lock entry and `[>]` marker on the feature branch. `/pr` marks ALL stories as Done and removes ALL locks for that branch in a single commit.

## Story Groups

Stories within a feature can be grouped into execution tracks using backlog tags.

**Backlog format with groups:**
```markdown
- [ ] S-010: Create user model | feature:FEAT-005 | group:1 | order:1 | service:be
- [ ] S-011: Add user API endpoints | feature:FEAT-005 | group:1 | order:2 | service:be
- [ ] S-012: Add user validation | feature:FEAT-005 | group:1 | order:3 | service:be
- [ ] S-013: User profile page | feature:FEAT-005 | group:2 | order:1 | service:fe
- [ ] S-014: User settings page | feature:FEAT-005 | group:2 | order:2 | service:fe
```

**Tags:**
- `feature:FEAT-NNN` — parent feature
- `group:N` — execution group. Stories in the same group are sequential and go on one branch.
- `order:N` — execution order within the group. Processed in ascending order.
- `service:xx` — which service/repo

**Branch naming for groups:**
- `/next --feature=FEAT-005` → branch: `feat/FEAT-005` (feature ID, not story ID)
- `/next S-010` → branch: `feat/S-010` (story ID for single-story pickup)

**Group flow:**
1. `/next --feature=FEAT-005` locks all stories in the group, creates `feat/FEAT-005`
2. `/next --current` advances through stories in `order:N` sequence
3. `/pr` marks all stories as Done in one commit
