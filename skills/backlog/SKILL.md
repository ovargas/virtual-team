---
name: backlog
description: Abstract backlog operations interface. Load this skill before any backlog read/write operation — it defines the operations that all commands reference, delegating to the active implementation (local or external).
---

# Backlog — Abstract Interface

This skill defines the backlog operations that commands use. It does NOT define how they're implemented — that's the job of the active backlog implementation skill (`virtual-team:backlog-local`, `virtual-team:backlog-external`, etc.), selected by the `backlog:` field in `stack.md`.

**Commands MUST reference operations from this interface, never format-specific details.** A command says "call **start(id)**" — the implementation skill decides whether that means editing a markdown file or calling an API.

## How to Load the Implementation

1. Read `stack.md` and find the `backlog:` field (default: `local` if not specified)
2. Load `skills/backlog-{value}/SKILL.md`
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

**Returns:** List of items, each with: id, title, status, feature, group, order, service, spec path.

### get(id)

Return a single backlog item with all metadata.

**Parameters:** `id` — story ID (e.g., `S-003`) or ticket ID (e.g., `CTR-12`)

**Returns:** Full item metadata: id, title, status, feature, group, order, service, spec path.

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

**Title contract:**
- `title` must be **≤ 80 characters** — implementations MUST reject longer titles and surface the error to the caller. This is part of the backlog interface, not a soft suggestion.
- `title` should be an imperative verb phrase describing the capability (e.g., `Add reviews migration`, `Wire review module factory`, `Expose review endpoints`).
- Implementation detail (file paths, schema definitions, config keys, code fragments) belongs in the spec file referenced by `spec:` — not in the title.
- Rationale: the title is the scanning surface for `list()` operations. Long titles destroy readability of `docs/backlog.md` and any external tracker UI; the spec link exists so detail has a proper home.

**Behavior:**
- Items are created in **ready** status
- Items are placed in the Ready section/state, ordered by group then order number
- This is called by `/virtual-team:feature` during story breakdown

### start(id)

Move an item from ready to doing.

**Parameters:**
- `id` — story ID

**Behavior:**
- Change item status: ready → doing
- Commit the status change

### mark_implemented(id)

Mark an item as code-complete, pending PR. **Only used in branch flow.**

**Parameters:**
- `id` — story ID

**Behavior:**
- Change item status: doing → implemented
- Add "pending PR" notation

### complete(id, reference)

Mark an item as done.

**Parameters:**
- `id` — story ID
- `reference` — PR number (branch flow) or "completed on main" (direct flow)

**Behavior:**
- Change item status: doing → done (direct flow) or implemented → done (branch flow)
- Add reference (PR number or "on main") to the item
- Check if all stories for the parent feature are done — if yes, update the feature spec status

---

## Sync Operations (external backends only)

These operations are no-ops for the local backend. External backends use them to keep the external service in sync.

### push_status(id, status, reference)

Update the item's status in the external service.

**Called after:** Every status change (start, mark_implemented, complete).

### push_summary(feature_id, title, spec_link)

Create or update a feature-level entry in the external service with a link to the local spec.

**Called after:** `/virtual-team:feature` creates a feature spec.

### push_stories(feature_id, items)

Create or update story-level entries in the external service for all stories in a feature.

**Called after:** `/virtual-team:feature` story breakdown.

### pull_comments(id)

Retrieve comments/feedback from the external service for an item.

**Called before:** `/virtual-team:implement` starts a story (to check for team feedback).

### pull_priorities()

Retrieve the current priority ordering from the external service.

**Called by:** `/virtual-team:implement` when picking the next item (external ordering overrides local ordering).

---

## Guidelines for Commands

1. **Always load the backlog skill before any backlog operation.** Read `stack.md` → load matching implementation skill.

2. **Use operation names, not format details.** Say "call **list(ready)**", not "read `docs/backlog.md` and parse bracket markers."

3. **Commit after write operations.** The implementation skill produces file changes (for local) or API calls (for external). Either way, commit local file changes immediately after the operation.

4. **Handle errors from the skill.** If an operation fails (item not found, API error), report the error and stop — don't fall back to a different implementation.

5. **Sync operations are optional.** Only call push_*/pull_* if the backlog implementation indicates it supports them (external backends). Local backend ignores them.
