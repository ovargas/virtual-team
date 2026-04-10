---
id: FEAT-008
date: 2026-04-10
status: done
plan: docs/plans/2026-04-10-pluggable-backlog-backend.md
type: feature
research_level: skip
yagni_verdict: build
tags: backlog, external-tracker, team-adoption, abstraction, skills
---

# Pluggable Backlog Backend

> **Value:** Enables team and organization adoption by letting the workflow operate against external trackers (JIRA, Linear, GitHub Issues) instead of only local markdown files — without losing any existing solo-developer functionality.

## Problem

The workflow system tracks all work items in `docs/backlog.md` with custom bracket markers (`[ ]`, `[>]`, `[=]`, `[x]`) and a YAML lockfile. Every pipeline command reads and writes these files directly. This is unusable for teams that manage work in JIRA, Linear, or GitHub Issues — they won't abandon their tracker for a markdown file.

An existing branch (`feat/external-backlog`) prototyped a solution with a clean three-skill abstraction, but it also deleted `flow.md`, `settings.json` (hooks), and 5 behavioral skills (`test-driven-development`, `verification-before-completion`, `receiving-code-review`, `skill-awareness`, `subagent-driven-development`). Merging that branch would break main. We need to take the good architectural ideas and apply them fresh to main's current state.

**Trigger:** Team/org adoption analysis identified this as the #1 blocker (see `docs/team-org-adoption-analysis.md`, Phase 1).
**Current workaround:** None. Teams either use the markdown backlog (nobody will) or don't use the workflow at all.

## YAGNI Assessment

**Verdict:** BUILD IT

The pluggable backend is the minimum viable change for team adoption. The three-skill design (interface + local + external) adds no unnecessary abstraction — it's the natural split between "what commands need" and "how the backlog is stored." The local implementation preserves exact current behavior for solo developers.

## Solution

### What we're building

1. **Backlog interface skill** (`backlog/SKILL.md`) — defines abstract operations that all commands reference: `list()`, `get()`, `start()`, `complete()`, `lock()`, `push_status()`, `pull_comments()`, etc. Commands never reference format-specific details.

2. **Local implementation skill** (`backlog-local/SKILL.md`) — implements the interface using `docs/backlog.md` (bracket markers) and `docs/backlog.lock` (YAML). This IS the current behavior, codified as a skill. Default when no `backlog:` field exists in `stack.md`.

3. **External implementation skill** (`backlog-external/SKILL.md`) — implements using GitHub Issues, Linear, or JIRA via MCP/CLI. Hybrid model: external service manages item status and priority ordering; local files manage locks (for worktree coordination) and document references (spec paths, plan paths).

4. **Command updates** — 6 commands updated to load the backlog skill and use interface operations: `next.md`, `feature.md`, `implement.md`, `pr.md`, `status.md`, `flow.md`.

5. **CLAUDE-service.md update** — documents the backlog skills in the Skills table and the `backlog:` config option.

### How it works

**Selection:** Commands read `stack.md` for the `backlog:` field (default: `local`). They load `.claude/skills/backlog/SKILL.md` (the interface), then `.claude/skills/backlog-{value}/SKILL.md` (the implementation). All backlog operations go through the implementation skill.

**Local mode (default):** Behavior is identical to today. The skill reads/writes `docs/backlog.md` and `docs/backlog.lock` with the same bracket markers, same commit placement (lock on main, status on feature branch), same stale lock cleanup.

**External mode:** The skill translates operations into the appropriate tool calls for the configured service (GitHub Issues via `gh` CLI, Linear/JIRA via MCP). A lightweight local index file (`docs/backlog-index.md`) maps story IDs to external issue IDs. Locks remain local for worktree coordination. Sync operations (`push_status`, `push_stories`, `pull_comments`, `pull_priorities`) bridge the two systems.

**Configuration in `stack.md`:**

```yaml
backlog: external

backlog_config:
  service: github-issues     # github-issues | linear | jira
  project: my-org/my-repo    # GitHub: owner/repo, Linear: project slug, Jira: project key
  states:
    ready: "Backlog"
    doing: "In Progress"
    implemented: "In Review"
    done: "Done"
  labels:
    feature_prefix: "feat:"
    service_prefix: "svc:"
    group_prefix: "group:"
```

## Boundaries

### Explicitly NOT building
- **Drift detection / `requirement-sync` skill** — separate feature, depends on this one
- **`/feature --ticket=PROJ-123` external pull** — separate feature
- **`/sync` command for publishing docs** — separate feature
- **Team roles / permissions** — separate feature
- **Human code review integration** — separate feature
- **Local→external migration tool** — teams that configure `backlog: external` start fresh

### Rabbit holes to avoid
- **Merging the branch** — too many unrelated deletions. Write skills fresh using branch as reference, apply command changes to main's current versions.
- **Making the external skill prescribe exact CLI commands** — the skill describes intent (WHAT to do), the AI maps to available tools at runtime. This keeps it service-agnostic.
- **Over-specifying the backlog-index.md format** — it's a lightweight reference table, not a full mirror of external state.

## Definition of Done

**The feature is complete when:**

1. A project with `backlog: local` (or no `backlog:` field) behaves exactly as it does today — all commands work unchanged
2. A project with `backlog: external` and a `backlog_config` section can use `/next`, `/feature`, `/implement`, `/pr`, `/status`, and `/flow` with the external tracker as the backlog source
3. All 13 existing skills on main are preserved (zero deletions)
4. `flow.md` is preserved and updated to use backlog interface operations
5. `settings.json` (hooks) is preserved unchanged
6. `CLAUDE-service.md` documents the backlog skill options in the Skills table

**Verification:**

Automated:
- [ ] All 3 new backlog skill files exist with correct frontmatter
- [ ] All 13 pre-existing skills still exist
- [ ] `flow.md` exists and references backlog operations (not raw markdown parsing)
- [ ] `settings.json` exists with SessionStart and PreToolUse hooks
- [ ] `grep -r "docs/backlog.md" .claude/commands/` returns zero matches in command logic (only in backlog-local skill and CLAUDE-service.md documentation)

Manual:
- [ ] Read each updated command — confirms it references backlog operations, not markdown details
- [ ] Read `backlog-local/SKILL.md` — confirms it matches current behavior exactly
- [ ] Read `backlog-external/SKILL.md` — confirms it covers GitHub Issues, Linear, and JIRA patterns

## Success Metrics

**Leading (immediate):**
- Zero hardcoded `docs/backlog.md` references in command files — verifiable by grep

**Lagging (when tested with an external tracker):**
- A developer can configure `backlog: external` with GitHub Issues and run `/next` → `/implement` → `/pr` without `docs/backlog.md` existing

**Failure signal:**
- If commands still contain format-specific backlog logic (bracket markers, section parsing) after the update, the abstraction leaked

## Founder Context

The `feat/external-backlog` branch is the reference implementation but must NOT be merged. Its backlog skill content is the starting point — the command updates need to be re-applied to main's current versions which include `flow.md`, hooks, and behavioral skills the branch deleted. The branch should be dismissed after this feature is complete.

The source-of-truth model (external tool owns requirements pre-implementation, local repo is the permanent record post-ship) is documented in `docs/team-org-adoption-analysis.md` but is NOT part of this feature's scope. This feature is purely the backlog abstraction layer — the foundation that future features (drift detection, external pull, doc sync) build on.

## Implementation Hints

### Existing patterns to follow
- The branch's three-skill architecture is the blueprint: `backlog/SKILL.md` (interface), `backlog-local/SKILL.md`, `backlog-external/SKILL.md`
- Skill frontmatter pattern: see any existing skill in `.claude/skills/*/SKILL.md` for format
- Command "Required Reading" pattern: commands like `next.md` already have a section for loading skills before doing work

### Integration points
- **`stack.md`** — needs `backlog:` field (default: `local`) and optional `backlog_config:` section
- **Every pipeline command** — loads backlog skill in Required Reading, uses interface operations
- **`CLAUDE-service.md`** — Skills table gets 3 new entries

### API Contracts

No API contracts — this feature modifies workflow definitions (markdown command/skill files), not application code.

### Data model considerations
- `docs/backlog-index.md` — new file for external backends mapping story IDs to external issue IDs
- `docs/backlog.lock` — unchanged format, still local even for external backends
- `docs/backlog.md` — unchanged format, only used by local backend

### Technical risks
- **Command updates touching `flow.md`** — `flow.md` is the most complex command (547 lines). The backlog references are scattered throughout gate logic and step execution. Careful, surgical edits needed.
- **Skill loading adds context** — each command now reads 2 skill files (interface + implementation) before doing work. This adds to the prompt but is consistent with how other skills (git-practices, knowledge-check) are already loaded.

## Research Summary

Research skipped — follows established patterns from the `feat/external-backlog` branch prototype.

## Stories

### Group 1: Backlog skills + pipeline commands (sequential, single branch)

**1. Create backlog interface and implementation skills**
Create the three-skill abstraction layer: interface, local implementation, external implementation.
- Files: `skills/backlog/SKILL.md`, `skills/backlog-local/SKILL.md`, `skills/backlog-external/SKILL.md`
- Acceptance:
  - All 3 skills exist with correct frontmatter
  - Interface defines all operations (list, get, start, complete, lock, release_lock, clean_stale_locks, push_status, pull_comments, etc.)
  - Local implementation matches current `docs/backlog.md` + `docs/backlog.lock` behavior exactly
  - External implementation covers GitHub Issues, Linear, and JIRA patterns
- Demo: Read the skills — full operation set defined, both implementations complete

**2. Update `/next` to use backlog interface**
The most backlog-heavy command. Validates the abstraction works for the hardest case (locking, group flow, stale lock cleanup).
- Files: `commands/next.md`
- Acceptance:
  - `/next` references backlog operations (`list()`, `check_lock()`, `start()`, `start_group()`, `advance_in_group()`, `clean_stale_locks()`)
  - Zero raw `docs/backlog.md` parsing in command logic
  - Required Reading section loads the backlog skill
- Demo: Read `next.md` — all backlog operations use interface

**3. Update remaining pipeline commands and documentation**
Complete the abstraction across all commands and update project documentation.
- Files: `commands/feature.md`, `commands/implement.md`, `commands/pr.md`, `commands/status.md`, `commands/flow.md`, `CLAUDE-service.md`
- Acceptance:
  - All 6 files reference backlog interface operations
  - `CLAUDE-service.md` Skills table has 3 new entries (backlog, backlog-local, backlog-external)
  - Zero `docs/backlog.md` references in command logic (only in `backlog-local` skill and `CLAUDE-service.md` documentation)
  - `flow.md`, `settings.json`, and all 13 existing skills are preserved
- Demo: `grep -r "docs/backlog.md" .claude/commands/` returns no matches in operational logic

### Milestones

- After Story 1: Abstraction layer exists — skills are loadable, operations defined
- After Story 2: Hardest command (`/next`) works with abstraction — proof it holds
- After Story 3: Full pipeline works — any command can use either backend

### Execution

- Group 1 → single branch, stories worked sequentially, one PR at the end
- Story 2 depends on Story 1 (needs the skills to reference)
- Story 3 follows the pattern proven in Story 2

## References

- Analysis document: `docs/team-org-adoption-analysis.md` (Phase 1: Foundation)
- Branch reference: `feat/external-backlog` (prototype, do not merge)
- Branch skills: `backlog/SKILL.md`, `backlog-local/SKILL.md`, `backlog-external/SKILL.md`
- Branch command diffs: `next.md`, `feature.md`, `implement.md`, `pr.md`, `status.md`

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Pluggable backlog backend — cherry-pick the backlog abstraction from feat/external-backlog onto main without losing existing skills, commands, or hooks."
