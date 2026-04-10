---
name: backlog-local
description: File-based backlog implementation using docs/backlog.md (bracket markers) and docs/backlog.lock (YAML). Default when stack.md has backlog local or no backlog field.
---

# Backlog Local — File-Based Implementation

```yaml
implements: backlog
stack: local
```

This skill implements the backlog interface using local markdown files. It is the default implementation when `stack.md` has `backlog: local` or no `backlog:` field.

## Files

| File | Purpose | Format |
|---|---|---|
| `docs/backlog.md` | Item list with statuses | Markdown with bracket markers |
| `docs/backlog.lock` | Lock entries preventing parallel pickup | YAML |

## Status Markers

| Status | Marker | Example |
|---|---|---|
| ready | `[ ]` | `- [ ] S-003: Story title \| feature:FEAT-005 \| group:1 \| order:1` |
| doing | `[>]` | `- [>] S-003: Story title — \`feat/CTR-12\`` |
| implemented | `[=]` | `- [=] S-003: Story title — \`feat/CTR-12\` — implemented, pending PR` |
| done | `[x]` | `- [x] S-003: Story title — PR #42` |

## Backlog File Structure

```markdown
# Backlog

## Doing
- [>] S-003: Story title — `feat/CTR-12`

## Ready
- [ ] S-010: Story title | feature:FEAT-005 | group:1 | order:1 | service:be | spec:docs/features/...
- [ ] S-011: Story title | feature:FEAT-005 | group:1 | order:2 | service:be | spec:docs/features/...

## Done
- [x] S-001: Story title — PR #12
- [x] S-002: Story title — PR #15

## Inbox
- Raw idea 1
- Raw idea 2
```

Items are ordered within sections. `## Ready` items are in priority order (top = highest). Within a feature group, `order:N` defines the execution sequence.

## Lock File Format

```yaml
# Managed by backlog skill — do not edit manually
locks:
  - item: "S-003"
    feature: "FEAT-007"
    branch: "feat/CTR-12"
    worktree: "../repo-worktrees/feat/CTR-12"  # or "in-place" or "current-branch"
    started: "2026-02-12T14:30:00"
```

---

## Operation Implementations

### list(filter)

1. Read `docs/backlog.md`
2. Parse each line starting with `- [` to extract: marker, ID, title, tags
3. Filter by the requested criteria:
   - `status`: match bracket marker (`[ ]`=ready, `[>]`=doing, `[=]`=implemented, `[x]`=done)
   - `feature`: match `feature:FEAT-NNN` tag
   - `service`: match `service:xx` tag
   - `group`: match `group:N` tag
   - `branch`: match branch reference after `—`
4. Return matching items with all parsed metadata

### get(id)

1. Read `docs/backlog.md`
2. Find the line containing the requested ID (e.g., `S-003` or `CTR-12`)
3. Parse the full item: marker, ID, title, all tags, branch reference
4. If `docs/backlog.lock` exists, check for a lock entry for this item
5. Return full item metadata including lock info

### check_lock(id)

1. Read `docs/backlog.lock` (if it doesn't exist, return locked=false)
2. Find an entry where `item` matches the requested ID
3. Return: locked, branch, worktree, started

### get_feature_progress(feature_id)

1. Call list(feature=feature_id, status=all)
2. Count items per status
3. Return counts: ready, doing, implemented, done, total

### next_id()

1. Read `docs/backlog.md`
2. Find all existing `S-NNN` IDs using regex
3. Return `S-{max+1}` zero-padded to 3 digits (e.g., `S-016`)

---

### create(items)

1. Read `docs/backlog.md`
2. Find the `## Ready` section (create it if it doesn't exist — place between `## Doing` and `## Inbox`, or at the top)
3. For each item, append a line in this format:
   ```
   - [ ] {id}: {title} | feature:{feature_id} | group:{group} | order:{order} | service:{service} | spec:{spec_path}
   ```
4. Write the updated file
5. **Do not commit** — the calling command handles the commit (usually grouped with the feature spec commit)

### start(id, branch, worktree_mode)

**Two commits, two locations:**

**Commit 1 — Lock (on main or current branch):**
1. Read `docs/backlog.lock` (create if it doesn't exist)
2. Append a new lock entry:
   ```yaml
   - item: "{id}"
     feature: "{feature_id}"
     branch: "{branch}"
     worktree: "{worktree_path}"  # or "in-place" or "current-branch"
     started: "{ISO-8601 timestamp}"
   ```
3. Commit placement:
   - `worktree` or `in-place` mode: commit on main BEFORE creating the branch
   - `current-branch` mode: commit on the current branch
4. Commit:
   ```bash
   git add docs/backlog.lock
   git commit -m "chore(backlog): lock {id} for {branch}"
   ```

**Commit 2 — Status change (on the working branch):**
1. Read `docs/backlog.md`
2. Find the item line with the matching ID
3. Change `- [ ]` to `- [>]`
4. Add branch reference: `- [>] {id}: {title} — \`{branch}\``
   - If on main/master/develop: `- [>] {id}: {title} — working on main`
5. Commit on the working branch:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): start {id} [{ticket_id}]"
   ```

### start_group(feature_id, group, branch, worktree_mode)

1. Call list(feature=feature_id, group=group, status=ready) to find all items in the group
2. **Lock ALL items** in a single lock commit (same as start() Commit 1, but with multiple entries)
3. **Start ONLY the first item** (lowest `order:N`): change `[ ]` to `[>]`, add branch reference
4. Commit status change on working branch

### advance_in_group(feature_id, group)

1. Find the item in `doing` status for this feature/group
2. Change `[>]` to `[x]` (done) — add "completed" notation
3. Find the next `ready` item in the group (locked but still `[ ]`) by lowest `order:N`
4. If found: change `[ ]` to `[>]`, add branch reference. Return the new item.
5. If no more items: return "group complete"
6. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): complete {done_id}, start {next_id}"
   ```

### mark_implemented(id, branch)

1. Read `docs/backlog.md`
2. Find the item line
3. Change `- [>]` to `- [=]`
4. Update notation: `- [=] {id}: {title} — \`{branch}\` — implemented, pending PR`
5. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): mark {id} implemented, pending PR [{ticket_id}]"
   ```

### complete(id, reference)

1. Read `docs/backlog.md`
2. Find the item line
3. Change `[>]` or `[=]` to `[x]`
4. Update notation:
   - Branch flow: `- [x] {id}: {title} — PR #{number}`
   - Direct flow: `- [x] {id}: {title} — completed on main`
5. Call release_lock(id)
6. Check if all stories for this feature are now `[x]`. If yes, update the feature spec's `status:` frontmatter to `done`.
7. Commit:
   ```bash
   git add docs/backlog.md docs/backlog.lock docs/features/{feature_file}
   git commit -m "chore(backlog): complete {id} [{ticket_id}]"
   ```

### complete_all_on_branch(branch, reference)

1. Read `docs/backlog.md`
2. Find ALL items with doing (`[>]`) or implemented (`[=]`) status that reference this branch
3. Change each to `[x]` with PR reference
4. Read `docs/backlog.lock`, remove ALL entries for this branch
5. If no more lock entries remain, delete `docs/backlog.lock` entirely
6. Check feature status (same as complete())
7. Commit:
   ```bash
   git add docs/backlog.md docs/backlog.lock
   git commit -m "chore(backlog): mark stories done and release locks [{ticket_id}]"
   ```

### lock(id, branch, worktree_mode)

Same as start() Commit 1 only — create lock entry, commit it. No status change.

### release_lock(id)

1. Read `docs/backlog.lock`
2. Remove the entry for this ID
3. If no entries remain, delete the file entirely
4. **Do not commit** — the calling operation handles the commit (usually grouped with a status change)

### clean_stale_locks()

1. Read `docs/backlog.lock`
2. For each entry:
   - Check if PR was merged: `gh pr list --head {branch} --state merged`
   - Check if worktree exists (for worktree entries)
   - Check if branch exists: `git branch --list {branch}` and `git ls-remote --heads origin {branch}`
3. If PR merged: run `git pull` first (the PR merge should have brought backlog updates). If lock persists after pull, remove it.
4. If worktree or branch deleted: remove the entry
5. Report what was cleaned:
   ```
   Cleaned up stale locks:
   - {id} ({branch}) — PR merged, lock released
   - {id} ({branch}) — branch deleted, lock released
   ```
6. Commit if changes were made:
   ```bash
   git add docs/backlog.lock docs/backlog.md
   git commit -m "chore(backlog): clean stale locks"
   ```

---

### Sync Operations

All sync operations are **no-ops** for the local backend:

- **push_status:** no-op
- **push_summary:** no-op
- **push_stories:** no-op
- **pull_comments:** returns empty (no external comments)
- **pull_priorities:** returns current file ordering (local is the source)

---

## Merge Conflict Guidance

When branch flow is used with worktrees, `docs/backlog.lock` is committed on main while `docs/backlog.md` changes are committed on feature branches. This can cause merge conflicts:

**`backlog.lock` conflicts:** Happen when multiple worktrees add/remove locks concurrently. Resolve by keeping all non-stale entries and removing only entries for the current branch.

**`backlog.md` conflicts:** Happen when multiple branches modify the same section. Resolve by keeping all status changes — each branch only modifies its own items.
