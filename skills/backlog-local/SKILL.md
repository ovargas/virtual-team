---
name: backlog-local
description: File-based backlog implementation using docs/backlog.md (bracket markers). Default when stack.md has backlog local or no backlog field.
---

# Backlog Local — File-Based Implementation

```yaml
implements: backlog
stack: local
```

This skill implements the backlog interface using a local markdown file. It is the default implementation when `stack.md` has `backlog: local` or no `backlog:` field.

## Files

| File | Purpose | Format |
|---|---|---|
| `docs/backlog.md` | Item list with statuses | Markdown with bracket markers |

## Status Markers

| Status | Marker | Example |
|---|---|---|
| ready | `[ ]` | `- [ ] S-003: Story title \| feature:FEAT-005 \| group:1 \| order:1` |
| doing | `[>]` | `- [>] S-003: Story title` |
| implemented | `[=]` | `- [=] S-003: Story title — implemented, pending PR` |
| done | `[x]` | `- [x] S-003: Story title — PR #42` |

## Backlog File Structure

```markdown
# Backlog

## Doing
- [>] S-003: Story title

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
4. Return matching items with all parsed metadata

### get(id)

1. Read `docs/backlog.md`
2. Find the line containing the requested ID (e.g., `S-003` or `CTR-12`)
3. Parse the full item: marker, ID, title, all tags
4. Return full item metadata

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

1. **Validate each item's title (enforces the abstract `backlog/SKILL.md` title contract):**
   - Measure `len(title)` — the title string only, excluding the `S-NNN: ` prefix and the ` | tag:value` suffix that gets appended at write time.
   - If `len(title) > 80`, **abort immediately**. Do not write any item to the file (not even the valid ones — fail the whole batch so the caller fixes the source). Surface this error to the caller:
     ```
     ⛔ Story title too long: {N} chars (max 80) for {id}.
        Title: "{title[:60]}..."

        Rewrite as a short imperative verb phrase (e.g., "Add reviews migration",
        "Wire review module factory"). Implementation detail — file paths, schema,
        config keys, code fragments — belongs in the spec file referenced by spec:,
        not the title.
     ```
2. Read `docs/backlog.md`
3. Find the `## Ready` section (create it if it doesn't exist — place between `## Doing` and `## Inbox`, or at the top)
4. For each item, append a line in this format:
   ```
   - [ ] {id}: {title} | feature:{feature_id} | group:{group} | order:{order} | service:{service} | spec:{spec_path}
   ```
5. Write the updated file
6. **Do not commit** — the calling command handles the commit (usually grouped with the feature spec commit)

### start(id)

1. Read `docs/backlog.md`
2. Find the item line with the matching ID
3. Change `- [ ]` to `- [>]`
4. Update notation: `- [>] {id}: {title}`
5. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): start {id}"
   ```

### mark_implemented(id)

1. Read `docs/backlog.md`
2. Find the item line
3. Change `- [>]` to `- [=]`
4. Update notation: `- [=] {id}: {title} — implemented, pending PR`
5. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): mark {id} implemented, pending PR"
   ```

### complete(id, reference)

1. Read `docs/backlog.md`
2. Find the item line
3. Change `[>]` or `[=]` to `[x]`
4. Update notation:
   - Branch flow: `- [x] {id}: {title} — PR #{number}`
   - Direct flow: `- [x] {id}: {title} — completed on main`
5. Check if all stories for this feature are now `[x]`. If yes, update the feature spec's `status:` frontmatter to `done`.
6. Commit:
   ```bash
   git add docs/backlog.md docs/features/{feature_file}
   git commit -m "chore(backlog): complete {id}"
   ```

---

### Sync Operations

All sync operations are **no-ops** for the local backend:

- **push_status:** no-op
- **push_summary:** no-op
- **push_stories:** no-op
- **pull_comments:** returns empty (no external comments)
- **pull_priorities:** returns current file ordering (local is the source)
