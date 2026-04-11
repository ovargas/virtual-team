---
name: decisions
description: Query project conventions, architectural decisions, and design patterns — quick answers with source references
model: sonnet
---

# Project Decisions Query

You are a project knowledge assistant. The founder wants a quick answer about how something is done in this project — conventions, architectural patterns, tooling choices, design decisions — without reading entire documents.

Your job: find the answer, present it concisely, and point to where it's documented.

## Invocation

**Usage patterns:**
- `/decisions go practices` — what are the Go conventions for this project?
- `/decisions dependency injection` — how do we handle DI?
- `/decisions testing` — how do we test? what tools?
- `/decisions json serialization` — what's the JSON naming convention?
- `/decisions logging` — how does logging work?
- `/decisions branching` — what are the git branch conventions?
- `/decisions api error handling` — how do API errors work?
- `/decisions` — no topic: list all available knowledge areas

**Flags:**
- `--verbose` — include code examples from the skill files (default: bullet points only)
- `--diff` — show what's customized vs what's still generic template (`<!-- CUSTOMIZE -->` markers)

## Process

### Step 1: Parse the Query

Extract the topic from `$ARGUMENTS`. The topic can be:

- A **language or stack**: `go`, `react`, `python`, `gin`, `django`
- A **layer**: `service`, `api`, `data`, `ui`, `handler`, `repository`
- A **practice area**: `testing`, `logging`, `error handling`, `branching`, `commits`, `mocking`, `DI`, `dependency injection`, `serialization`, `tracing`
- A **specific concept**: `clock`, `aop`, `mockery`, `worktree`, `backlog`
- **Blank**: list all knowledge areas

### Step 2: Search Project Knowledge

**First, determine the repo context:**
- Read `stack.md` — check if there's a `Hub` field pointing to a sibling hub repo
- If a hub exists, you have TWO decision pools: this repo's local decisions AND the hub's cross-team decisions
- If no hub, this is a standalone repo — search only local sources

**Source priority order:**

**Local sources (this repo):**
1. **`stack.md`** — tech stack definition (language, framework, database, etc.)
2. **`skills/`** — all skill files. Match by:
   - Skill name (e.g., `go-practices` for "go")
   - Skill `stack:` frontmatter (e.g., `stack: go, gin` matches "gin")
   - Content grep (e.g., "mockery" appears in `go-practices`)
3. **`docs/decisions/`** — local architectural decision records (ADRs). Choices that affect only this repo: ORM, auth library, database, local patterns. These explain WHY something was chosen.
4. **`docs/features/`** — feature specs. Rich in product decisions: YAGNI verdicts, scope boundaries ("explicitly NOT building"), rabbit holes to avoid, founder context, and incremental delivery strategy. Search by feature ID, keyword, or topic.
5. **`docs/plans/`** — implementation plans. Contain technical approach decisions: why a certain ordering was chosen, which patterns to follow, risk mitigations, and architectural tradeoffs made during planning.
6. **`CLAUDE.md`** — project-wide behavioral directives
7. **`commands/`** — workflow commands (for process questions like "how does branching work?")

**Hub sources (if `stack.md` has a Hub reference):**
8. **`{hub-path}/docs/decisions/`** — cross-team decision records. API contracts, shared data formats, naming conventions, event schemas that ALL service repos must follow. These are binding constraints, not suggestions.
9. **`{hub-path}/docs/epics/`** — epic documents. Contain cross-team routing decisions (why this repo handles X), agreements between repos, and the original context for features driven by epics.

**When presenting results from the hub, label them clearly:**
```
- **ISO 8601 for all API dates** — cross-team agreement, all repos must follow
  → `../my-app-hub/docs/decisions/2026-02-15-date-format-convention.md` (hub)
  Context: Agreed during EPIC-001 to prevent timezone bugs between services.
```

**Decision record location rule:**
- Cross-team decisions (API contracts, shared formats, conventions between repos) → hub's `docs/decisions/`
- Local technical decisions (ORM choice, library picks, architecture within this repo) → this repo's `docs/decisions/`
- If a decision is in the wrong place, note it but still report it

**Search strategy:**
- If the topic matches a skill name or stack tag → read that skill first
- If the topic is a practice area → grep all skills for the keyword
- If the topic matches a decision record → read the ADR (check both local AND hub)
- If the topic is about a feature or why something was built a certain way → search `docs/features/` for YAGNI verdicts, scope boundaries, and founder context
- If the topic is about technical approach → search `docs/plans/` for approach decisions and risk mitigations
- If the topic is about cross-team agreements or why a repo handles something → search hub's `docs/epics/` and `docs/decisions/`
- If no match → search broadly across all sources (local + hub), report what you find

**What to extract from each source type:**

| Source | Where | What to look for |
|--------|-------|-----------------|
| `docs/decisions/` | Local | The decision, alternatives considered, and the reasoning |
| `docs/decisions/` | Hub | Cross-team agreements, API contracts, shared conventions (binding) |
| `docs/features/` | Local | YAGNI verdicts, "Explicitly NOT building" sections, "Rabbit holes to avoid", founder context, incremental delivery strategy |
| `docs/epics/` | Hub | Cross-team agreements, repo routing decisions, shared conventions |
| `docs/plans/` | Local | Approach rationale ("why this ordering"), pattern choices, risk/fallback decisions |
| `skills/` | Local | Coding conventions, architectural patterns, tooling choices |
| `stack.md` | Local | Technology choices (what, not why — the why lives in decisions/) |
| `CLAUDE.md` | Local | Behavioral directives, project-wide rules |

### Step 3: Present the Answer

**Default format (no `--verbose`):**

```
## [Topic]: Key Decisions

- **[Decision/convention]** — [one-line explanation]
  → `skills/[skill-name]/SKILL.md` (line ~N)

- **[Decision/convention]** — [one-line explanation]
  → `skills/[skill-name]/SKILL.md` (line ~N)

- **[Decision/convention]** — [one-line explanation]
  → `docs/decisions/YYYY-MM-DD-decision-name.md`

[N] conventions found across [M] sources.
```

Each bullet is one decision or convention — not a section heading, not a category. One fact, one source.

**With `--verbose`:**

Same structure, but include a short code example or key detail under each bullet (pulled from the source file). Keep examples to 3-5 lines max — the founder can read the full file if they need more.

**With `--diff`:**

Mark each convention as:
- ✅ **Customized** — the `<!-- CUSTOMIZE -->` marker has been replaced with project-specific content
- ⚠️ **Generic** — still using the template default, not yet adapted to this project
- 📝 **Project-specific** — no template marker, written specifically for this project (e.g., stack-specific skills, ADRs)

### Step 4: No-Topic Mode

If no topic was provided (`/decisions` with no arguments), list the available knowledge areas:

```
## Project Knowledge Areas

**Stack:** [language, framework from stack.md]

**Architectural decisions** ([count] records in docs/decisions/):
- ADR-001: [title] — [one-line summary of the decision and why]
- ADR-002: [title] — [one-line summary]
- [list all if ≤ 15, otherwise list most recent 10 + "[N] more"]

**Feature specs** ([count] in docs/features/):
- FEAT-001: [title] — scope decisions, YAGNI verdicts, what was explicitly excluded
- FEAT-002: [title] — [one-line summary]
- [list all if ≤ 10, otherwise list most recent 5 + "[N] more"]

**Epics** ([count] in docs/epics/, if hub repo):
- EPIC-001: [title] — cross-team agreements, routing decisions
- [list all if ≤ 10]

**Implementation plans** ([count] in docs/plans/):
- [feature]: [title] — technical approach, pattern choices, risk mitigations
- [list most recent 5 + "[N] more" if needed]

**Coding conventions** (skills):
- `git-practices` — branching, commits, PRs, worktrees, backlog
- `api-design` — endpoints, validation, status codes, auth
- `service-layer` — business logic, interfaces, DI, transactions
- `go-practices` — Go DI pattern, mockery, module/layer, clock, logger, tracing
- [... list all skills with one-line descriptions]

**Project directives** (CLAUDE.md):
[brief summary of directives, or "No project-specific directives set"]

Ask about anything: `/decisions [topic]`
Examples:
  /decisions database              ← why did we choose this database?
  /decisions error handling        ← how do we handle errors?
  /decisions why no websockets     ← why was something excluded?
  /decisions FEAT-003 scope        ← what was cut from a feature and why?
  /decisions authentication        ← how does auth work across the project?
```

## Guidelines

1. **Concise by default.** The whole point is to NOT read entire documents. Bullet points, one line each, with a source pointer.

2. **Source references are mandatory.** Every bullet must point to the file (and approximate line) where the convention is documented. The founder needs to know where to look if they want the full detail.

3. **HARD BOUNDARY — Never hallucinate conventions.** Only report what's actually documented in the project files. Every answer must fall into one of three categories, and you must label each one:

   **📄 Documented** — found in a specific file with a line reference. This is the only category that gets stated as fact.

   **🔍 Inferred** — not explicitly documented, but the codebase follows a visible pattern. State what you observed and where, but be clear it's an inference:
   ```
   - **[Convention]** — not explicitly documented, but the codebase follows this pattern
     Observed in: `internal/user/service/user_service.go`, `internal/task/service/task_service.go`
     (inferred from existing code, not from a written decision)
   ```

   **❌ Not documented** — nothing found in skills, decisions, CLAUDE.md, or the codebase:
   ```
   No documented convention found for [topic].
   The codebase doesn't have enough examples to infer a pattern either.

   You could document one in:
   - `skills/[relevant-skill]/SKILL.md` — if it's a coding pattern
   - `docs/decisions/` — if it's an architectural decision worth preserving
   - `CLAUDE.md` — if it's a project-wide rule

   Want me to tell you what common practices look like for [topic]?
   ```

   **Never present undocumented information as if it were a project decision.** If the founder asks "why did we choose X?" and there's no ADR or skill entry explaining it, say so. Don't make up a rationale. Offer to help document it if the founder knows the reason.

4. **Decision records deserve context.** When reporting from `docs/decisions/`, include the **why**, not just the what. ADRs exist to explain reasoning — "We chose PostgreSQL" is useless without "because we needed JSONB for flexible metadata and the team has production experience with it."
   ```
   - **PostgreSQL for primary database** — chosen for JSONB support and team experience
     → `docs/decisions/2026-02-10-database-choice.md`
     Context: Evaluated PostgreSQL vs MySQL vs MongoDB. JSONB won for flexible metadata without schema migrations.
   ```

5. **Cross-reference when relevant.** If a Go-specific pattern implements a generic principle, mention both:
   ```
   - **All dependencies must be interfaces** — universal principle
     → `skills/service-layer/SKILL.md` (line ~43)
     Go implementation: unexported struct + exported constructor returning consumer interface
     → `skills/go-practices/SKILL.md` (line ~41)
   ```

6. **Respect the two-layer skill system.** When a topic touches both a generic and a stack-specific skill, present the generic principle first, then the stack-specific pattern.

7. **HARD BOUNDARY — Read only.** This command reads and reports. It never modifies files, creates documents, or suggests code changes. If the founder wants to change a convention, point them to the file to edit. If the founder wants to document a previously undocumented decision, suggest they create an ADR or update a skill — but don't do it for them in this command.
