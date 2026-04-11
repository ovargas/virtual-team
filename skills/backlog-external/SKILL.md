---
name: backlog-external
description: External service backlog implementation (GitHub Issues, Linear, JIRA). Used when stack.md has backlog external with a backlog_config section.
---

# Backlog External — Generic External Service Implementation

```yaml
implements: backlog
stack: external
```

This skill implements the backlog interface using an external project management service (GitHub Issues, Linear, Jira, etc.). It reads the service type and state mappings from `stack.md`.

**Design principle:** Local is the source of truth for documents (specs, plans, contracts). The external service is the source of truth for item status and priority ordering. This skill bridges both.

## Prerequisites

- An MCP connector for the configured service (Linear, Jira) **OR** the `gh` CLI for GitHub Issues
- The `backlog_config` section in `stack.md` properly configured

## Configuration in `stack.md`

```yaml
backlog: external

backlog_config:
  service: github-issues     # github-issues | linear | jira
  project: my-org/my-repo    # GitHub: owner/repo, Linear: project slug, Jira: project key
  states:
    ready: "Backlog"          # Service-specific state name for each workflow status
    doing: "In Progress"
    implemented: "In Review"
    done: "Done"
  labels:
    feature_prefix: "feat:"   # Label prefix for feature grouping (e.g., "feat:FEAT-005")
    service_prefix: "svc:"    # Label prefix for service tagging (e.g., "svc:be")
    group_prefix: "group:"    # Label prefix for story groups
  issue_type: "Story"         # Jira only: issue type for stories
```

## How It Works — The Hybrid Model

**External service manages:** Item status, priority ordering, team comments/feedback, assignment, labels, sprint planning.

**Local files manage:** Document references (spec paths, plan paths). Locks are local or external depending on mode (see below).

**The bridge:** Each backlog item has an external issue ID AND a local story ID. The external issue links to the local spec file. Local operations update the external service after each status change.

## Locking Strategy by Mode

Read `stack.md` → `mode:` field (default: `solo`). The mode determines how item locking works:

**Solo mode (`mode: solo`):** Locks use `docs/backlog.lock` (same as `backlog-local`). The external service is the source of truth for status, but locking is local because there is no concurrency concern — one developer across worktrees.

**Team mode (`mode: team`):** Locks use the external service's assignment mechanism. **No `docs/backlog.lock` file is created or used.** This eliminates merge conflicts when multiple developers run `/virtual-team:next` concurrently.

| Operation | Solo mode | Team mode |
|-----------|-----------|-----------|
| `check_lock(id)` | Read `docs/backlog.lock` | Query external issue: is it assigned and in "In Progress" state? |
| `start(id, branch, ...)` | Create lock in `docs/backlog.lock`, commit on main | Assign issue to current user, move to "In Progress", add comment with branch name |
| `lock(id, branch, ...)` | Create lock entry in `docs/backlog.lock` | Assign issue without status change |
| `release_lock(id)` | Remove entry from `docs/backlog.lock` | Unassign issue |
| `clean_stale_locks()` | Clean stale entries in `docs/backlog.lock` | Query issues assigned to current user with deleted branches, unassign them |

**Team mode identity:** The "current user" is determined by the external service's authentication context (e.g., `gh api user` for GitHub, the authenticated MCP user for Linear/Jira).

---

## Operation Implementations

### General Approach

For every operation, the AI:
1. Reads `stack.md` to get the `backlog_config`
2. Determines which tools to use based on `service`:
   - **github-issues:** Use `gh` CLI commands (already available, no MCP needed)
   - **linear:** Use the Linear MCP connector tools
   - **jira:** Use the Jira MCP connector tools
3. Translates the operation's intent into the appropriate tool call
4. The skill describes WHAT to do, not WHICH specific tool to call — the AI maps to available tools at runtime

### list(filter)

**Intent:** Get items from the external service matching the filter.

- Query the external service for issues in the configured project
- Filter by state mapping (e.g., `status: ready` → query for issues in the state configured as `backlog_config.states.ready`)
- Filter by labels for feature, service, and group (using configured prefixes)
- Parse results into the standard item format: id, title, status, feature, group, order, service

**For GitHub Issues:**
```bash
gh issue list --repo {project} --state open --label "{label}" --json number,title,state,labels
```

**For Linear/Jira:** Use the appropriate MCP tool to list/search issues with the matching state and labels.

**Priority ordering:** The external service's ordering is authoritative. Items are returned in the order the service provides them.

### get(id)

**Intent:** Get a single item with full metadata.

- Fetch the issue from the external service by ID
- Check lock info: **solo mode** → read `docs/backlog.lock`; **team mode** → check issue assignee and status in the external service
- Return merged metadata: external (title, status, labels, comments) + lock info + spec path from labels/description

### check_lock(id)

**Solo mode:** Same as backlog-local — read `docs/backlog.lock`.

**Team mode:** Query the external issue. It is locked if it is assigned to someone AND in the `doing` state. Return: locked (boolean), assignee (who), branch (from issue comment/field), started (issue transition timestamp).

### get_feature_progress(feature_id)

**Intent:** Count items per status for a feature.

- Query the external service for all issues with the feature label (e.g., `feat:FEAT-005`)
- Count by state mapping
- Return counts

### next_id()

**Intent:** Generate the next story ID.

- Query the external service for all issues with story ID labels (or scan issue titles for `S-NNN` pattern)
- Return `S-{max+1}`

---

### create(items)

**Intent:** Create new issues in the external service for each backlog item.

For each item:
1. Create an issue in the external service:
   - Title: `{id}: {title}`
   - State: configured `ready` state
   - Labels: feature label, service label, group label, order label
   - Description/body: Link to the local spec file — `Spec: {spec_path}`
2. Record the external issue ID mapping (add it as a tag in the description or use labels)

**Do NOT create local `docs/backlog.md` entries.** The external service IS the backlog. However, maintain a lightweight local index file at `docs/backlog-index.md` that maps story IDs to external issue IDs for quick reference:
```markdown
# Backlog Index
| Story | External | Feature | Status |
|---|---|---|---|
| S-010 | #42 | FEAT-005 | ready |
| S-011 | #43 | FEAT-005 | ready |
```

### start(id, branch, worktree_mode)

**Two actions:**

**Action 1 — Lock:**

- **Solo mode:** Same as backlog-local — create/update `docs/backlog.lock` with the lock entry. Commit placement follows the same rules (main for worktree/in-place, current branch for --current).
- **Team mode:** Assign the issue to the current user in the external service. Add a comment: "Locked for branch `{branch}`". No local lock file is created.

**Action 2 — Update external status:**
- Move the issue to the `doing` state in the external service
- Add a comment: "Started on branch `{branch}`"
- Update `docs/backlog-index.md` status column

### start_group(feature_id, group, branch, worktree_mode)

1. Query all issues for the feature/group
2. Lock ALL items: **solo mode** → same as backlog-local group locking (`docs/backlog.lock`); **team mode** → assign all issues to the current user in the external service
3. Move the FIRST issue to `doing` in the external service
4. Add comments to all issues: "Locked for branch `{branch}` — will be worked sequentially"

### advance_in_group(feature_id, group)

1. Find the current `doing` issue for this feature/group
2. Move it to `done` in the external service, add completion comment
3. Find the next issue in the group (by order label)
4. Move it to `doing` in the external service
5. Update local lock and index
6. If no more issues: report "group complete"

### mark_implemented(id, branch)

- Move the issue to the `implemented` state in the external service
- Add comment: "Implementation complete, pending PR on `{branch}`"
- Update local index

### complete(id, reference)

- Move the issue to the `done` state in the external service
- Add comment with PR reference: "Completed — PR #{number}" or "Completed on main"
- Call release_lock(id) — **solo mode:** remove from `docs/backlog.lock`; **team mode:** unassign issue
- Update local index
- Check feature completion: if all stories for the feature are done, update the feature spec status

### complete_all_on_branch(branch, reference)

- Find all issues associated with this branch: **solo mode** → read lock entries from `docs/backlog.lock`; **team mode** → query external service for issues assigned to current user on this branch
- Move each to `done` in the external service with PR reference
- Release all locks for this branch (mode-appropriate — local file or external unassignment)
- Update local index

### lock(id, branch, worktree_mode)

**Solo mode:** Same as backlog-local — create lock entry in `docs/backlog.lock`.

**Team mode:** Assign the issue to the current user in the external service. No status change, no local file.

### release_lock(id)

**Solo mode:** Same as backlog-local — remove entry from `docs/backlog.lock`.

**Team mode:** Unassign the issue in the external service. No local file to clean.

### clean_stale_locks()

**Solo mode:** Same as backlog-local for lock cleanup. Additionally, verify that the external service status matches expectations (if an issue is `done` externally but locked locally, clean the lock).

**Team mode:** Query the external service for issues assigned to the current user that are in "In Progress" but whose branches no longer exist (check via `git branch --list` and `git ls-remote`). Unassign stale issues.

---

### Sync Operations

These are ACTIVE for external backends:

### push_status(id, status, reference)

Update the issue status in the external service. Map the workflow status to the configured state name.

**Already called inline by start(), complete(), etc.** — this operation exists for cases where the status needs to be updated separately (e.g., fixing a stale status).

### push_summary(feature_id, title, spec_link)

Create or update a parent issue/virtual-team:epic in the external service:
- Title: `{feature_id}: {title}`
- Description: Link to the local spec file
- If the service supports parent-child relationships (Linear, Jira), set this as the parent of all story issues

### push_stories(feature_id, items)

Same as create(items) but specifically for syncing after `/virtual-team:feature` creates stories.

### pull_comments(id)

Retrieve comments from the external issue. Present them to the AI as context:
```
Team feedback on {id}:
- [{author}] ({date}): {comment text}
- [{author}] ({date}): {comment text}
```

**Called by `/virtual-team:implement` before starting a story** — ensures the AI sees any QA feedback, PO notes, or team discussion.

### pull_priorities()

Retrieve the current issue ordering from the external service. This overrides any local ordering:
- The external service's priority/position is authoritative
- If the team reordered issues in Linear/Jira, that's the new priority

---

## Error Handling

- **MCP connector not available:** STOP and report: "The {service} connector is not available. Install it or switch to `backlog: local` in stack.md."
- **Authentication failure:** STOP and report: "Authentication failed for {service}. Re-authenticate the connector."
- **Issue not found:** Report and suggest creating it: "Issue {id} not found in {service}. Run `/virtual-team:contracts sync` or create it manually."
- **Rate limit:** Report and suggest waiting or switching to local temporarily.

**Never fall back to local silently.** If the external service is unavailable, tell the user explicitly. Using local as a silent fallback would cause the two sources to diverge.

---

## Migration: Local → External

To migrate from `backlog: local` to `backlog: external`:

1. Configure `backlog_config` in `stack.md`
2. Run a one-time sync: for each item in `docs/backlog.md`, create an issue in the external service
3. Generate `docs/backlog-index.md` from the sync
4. Optionally keep `docs/backlog.md` as a read-only archive (rename to `docs/backlog-archive.md`)
5. Change `stack.md` to `backlog: external`
