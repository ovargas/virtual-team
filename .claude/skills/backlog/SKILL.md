---
name: backlog
description: Abstract backlog operations interface. Load this skill before any backlog read/write operation — it defines the operations that all commands reference, delegating to the active implementation (local or external).
---

# Backlog — Abstract Interface

This skill defines the backlog operations that commands use. It does NOT define how they're implemented — that's the job of the active backlog implementation skill (`backlog-local`, `backlog-external`, etc.), selected by the `backlog:` field in `stack.md`.

**Commands MUST reference operations from this interface, never format-specific details.** A command says "call **start(id, branch, worktree)**" — the implementation skill decides whether that means editing a markdown file or calling an API.

## How to Load the Implementation

1. Read `stack.md` and find the `backlog:` field (default: `local` if not specified)
2. Load `.claude/skills/backlog-{value}/SKILL.md`
3. Use that skill's instructions for every backlog operation

If the `backlog:` field is missing from `stack.md`, assume `local`.

---

## Status Values

| Status | Meaning | Transition From | Transition To |
|---|---|---|---|
| **ready** | Specced and ready for work | (created) | doing |
| **doing** | Currently in progress | ready | implemented, done |
| **implemented** | Code complete, pending PR (branch flow only) | doing | done |
| **done** | Shipped | doing, implemented | (terminal) |

**Direct-to-main flow:** When working on main/master/develop, `doing` transitions directly to `done` — skip `implemented` entirely. There's no PR step.

**Branch flow:** `doing` → `implemented` → `done` (via PR merge).

---

## Read Operations

### list(filter)

Return backlog items matching the filter criteria.

**Filters:**
- `status` — one of: ready, doing, implemented, done, all
- `feature` — feature ID (e.g., `FEAT-005`)
- `service` — service tag (e.g., `be`, `fe`)
- `group` — group number within a feature
- `branch` — items associated with a specific branch

**Returns:** List of items, each with: id, title, status, feature, group, order, service, branch (if doing/implemented), spec path.

### get(id)

Return a single backlog item with all metadata.

**Parameters:** `id` — story ID (e.g., `S-003`) or ticket ID (e.g., `CTR-12`)

**Returns:** Full item metadata: id, title, status, feature, group, order, service, branch, worktree, spec path, lock info.

### check_lock(id)

Check if an item is locked and by whom.

**Parameters:** `id` — story ID

**Returns:** locked (boolean), branch, worktree, started (timestamp). If not locked, returns locked=false.

### get_feature_progress(feature_id)

Count items per status for a specific feature.

**Parameters:** `feature_id` — e.g., `FEAT-005`

**Returns:** Counts per status: ready, doing, implemented, done, total.

### next_id()

Generate the next available story ID (e.g., `S-016` if the highest existing is `S-015`).

**Returns:** Next sequential story ID string.

---

## Write Operations

### create(items)

Add new items to the backlog in ready status.

**Parameters:** List of items, each with: id, title, feature, group, order, service, spec path.

**Behavior:**
- Items are created in **ready** status
- Items are placed in the Ready section/state, ordered by group then order number
- This is called by `/feature` during story breakdown

### start(id, branch, worktree_mode)

Move an item from ready to doing and create a lock.

**Parameters:**
- `id` — story ID
- `branch` — branch name (e.g., `feat/CTR-12`)
- `worktree_mode` — one of: `worktree` (default), `in-place`, `current-branch`

**Behavior:**
- Change item status: ready → doing
- Add branch reference to the item
- Create lock entry with: item, feature, branch, worktree path/mode, timestamp
- **Lock commit placement:**
  - `worktree` or `in-place`: lock committed on main BEFORE branch creation
  - `current-branch`: lock committed on current branch
- Status change committed on the working branch (not main) — so it merges with the PR

### start_group(feature_id, group, branch, worktree_mode)

Lock all items in a feature group and start the first one.

**Parameters:**
- `feature_id` — e.g., `FEAT-005`
- `group` — group number
- `branch` — branch name (e.g., `feat/FEAT-005`)
- `worktree_mode` — same as start()

**Behavior:**
- Lock ALL ready items in the specified group
- Change ONLY the first item (lowest `order:N`) to doing
- Other items remain ready but locked (they'll be started by subsequent `/next --current` calls)

### advance_in_group(feature_id, group)

Complete the current doing item and start the next one in the group.

**Parameters:**
- `feature_id` — e.g., `FEAT-005`
- `group` — group number

**Behavior:**
- Find the item in `doing` status for this feature/group
- Mark it `done`
- Find the next `ready` item in the group (lowest `order:N`)
- Mark it `doing`
- If no more items: report "all stories in this group are done"

### mark_implemented(id, branch)

Mark an item as code-complete, pending PR. **Only used in branch flow.**

**Parameters:**
- `id` — story ID
- `branch` — branch reference

**Behavior:**
- Change item status: doing → implemented
- Add "pending PR" notation
- Lock stays active — released by complete()

### complete(id, reference)

Mark an item as done and release its lock.

**Parameters:**
- `id` — story ID
- `reference` — PR number (branch flow) or "completed on main" (direct flow)

**Behavior:**
- Change item status: doing → done (direct flow) or implemented → done (branch flow)
- Remove lock entry for this item
- If removing the last lock entry, clean up the lock store entirely
- Add reference (PR number or "on main") to the item

### complete_all_on_branch(branch, reference)

Mark ALL items on a branch as done. Used by `/pr` when a branch has multiple stories.

**Parameters:**
- `branch` — branch name
- `reference` — PR number

**Behavior:**
- Find all items in doing or implemented status for this branch
- Mark each as done with the PR reference
- Remove all lock entries for this branch

### lock(id, branch, worktree_mode)

Create a lock entry without changing status. Used for group locking.

**Parameters:** Same as start(), but only creates the lock — no status change.

### release_lock(id)

Remove a lock entry for an item.

**Parameters:** `id` — story ID

**Behavior:**
- Remove lock entry
- If last entry, clean up the lock store entirely

### clean_stale_locks()

Detect and remove stale lock entries.

**Detection rules:**
- PR for the branch was merged (check via `gh pr list --head <branch> --state merged`)
- Worktree no longer exists
- Branch was deleted

**Behavior:**
- Remove stale entries
- Report what was cleaned
- Commit changes if any

---

## Sync Operations (external backends only)

These operations are no-ops for the local backend. External backends use them to keep the external service in sync.

### push_status(id, status, reference)

Update the item's status in the external service.

**Called after:** Every status change (start, mark_implemented, complete).

### push_summary(feature_id, title, spec_link)

Create or update a feature-level entry in the external service with a link to the local spec.

**Called after:** `/feature` creates a feature spec.

### push_stories(feature_id, items)

Create or update story-level entries in the external service for all stories in a feature.

**Called after:** `/feature` story breakdown.

### pull_comments(id)

Retrieve comments/feedback from the external service for an item.

**Called before:** `/implement` starts a story (to check for team feedback).

### pull_priorities()

Retrieve the current priority ordering from the external service.

**Called by:** `/next` when picking the next item (external ordering overrides local ordering).

---

## Guidelines for Commands

1. **Always load the backlog skill before any backlog operation.** Read `stack.md` → load matching implementation skill.

2. **Use operation names, not format details.** Say "call **list(ready)**", not "read `docs/backlog.md` and parse bracket markers."

3. **Commit after write operations.** The implementation skill produces file changes (for local) or API calls (for external). Either way, commit local file changes immediately after the operation.

4. **Handle errors from the skill.** If an operation fails (item not found, lock conflict, API error), report the error and stop — don't fall back to a different implementation.

5. **Sync operations are optional.** Only call push_*/pull_* if the backlog implementation indicates it supports them (external backends). Local backend ignores them.
