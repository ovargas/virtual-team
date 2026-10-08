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

| Status | Marker | Section | Example |
|---|---|---|---|
| ready | `[ ]` | `## Ready` | `- [ ] S-003: Story title \| feature:FEAT-005 \| group:1 \| order:1` |
| doing | `[>]` | `## Doing` | `- [>] S-003: Story title \| feature:FEAT-005 \| ...` |
| implemented | `[=]` | `## Doing` | `- [=] S-003: Story title — implemented, pending PR \| feature:FEAT-005 \| ...` |
| done | `[x]` | `## Done` | `- [x] S-003: Story title — PR #42 \| feature:FEAT-005 \| ...` |

**Marker and section always agree.** Every status change does two things: rewrite the marker, and move the whole line under the matching heading (create the heading if it is missing). A `[x]` line left under `## Ready` is a failed transition — the item still reads as ready to anyone scanning the file.

**Tags survive every transition.** Keep each ` | tag:value` on the line; status notation (`— PR #42`) goes right after the title, before the first ` | `. Feature progress is counted from the `feature:` tag, so a line that loses it drops out of its feature.

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
   - `plan`: match `plan:{plan_path}` tag
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

### link_plan(ids, plan_path)

1. Read `docs/backlog.md`
2. For each ID, find the item line and append ` | plan:{plan_path}` — or replace the value if the line already has a `plan:` tag
3. Write the updated file
4. **Do not commit** — the calling command commits it together with the plan

### start(id)

1. Read `docs/backlog.md`
2. Find the item line with the matching ID
3. Change `- [ ]` to `- [>]`
4. Move the line to the end of `## Doing`
5. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): start {id}"
   ```

### mark_implemented(id)

1. Read `docs/backlog.md`
2. Find the item line
3. Change `- [>]` (or `- [ ]`, if `start` never ran) to `- [=]`
4. Add notation after the title: `— implemented, pending PR`
5. Move the line under `## Doing` if it is not already there
6. Commit:
   ```bash
   git add docs/backlog.md
   git commit -m "chore(backlog): mark {id} implemented, pending PR"
   ```

### complete(id, reference)

1. Read `docs/backlog.md`
2. Find the item line. Any open marker qualifies: `[ ]`, `[>]`, or `[=]`. An item whose work shipped without `start` having run is completed, never skipped. If it is already `[x]`, still run steps 4–7 — they repair a half-finished transition.
3. Change the marker to `[x]`
4. Set the notation after the title, replacing `— implemented, pending PR` if present:
   - Branch flow: `— PR #{number}`
   - Direct flow: `— completed on main`
5. Move the line to the end of `## Done`
6. Update the `status:` frontmatter of the documents the item belongs to:
   - **Story** (has a `feature:` tag): call list(feature, status=all). If every item is now `[x]`, set the feature spec (the `spec:` path) to `status: done`, whatever it says today (`draft`, `ready`, `in progress`). If some items are still open, leave it.
   - **Bug** (`BUG-NNN`): set the bug report (the `bug:` path, or the file in `docs/bugs/` with that `id:`) to `status: fixed`.
   - **Plan** (has a `plan:` tag): call list(plan, status=all). If every item linked to that plan is now `[x]`, set the plan to `status: done`. With no `plan:` tag, close the plan named in the spec's `plan:` frontmatter only when the spec itself was just set to done.
   - No such document: skip.
7. Verify by re-reading every file touched before committing: the line is `[x]` under `## Done`, no copy of it remains in another section, and each document's `status:` matches step 6. Fix any miss now.
8. Commit:
   ```bash
   git add docs/backlog.md {parent_document} {plan}
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
