# Service Repository

This is a **service repository** — an implementation repo. It has its own codebase, backlog, features, plans, and decisions. It builds software.

## How This Repo Works

Work flows through a deliberate pipeline. Each step produces a specific artifact. No step is skipped.

```
/virtual-team:feature → /virtual-team:contracts → /virtual-team:plan → /virtual-team:implement → /virtual-team:review + /virtual-team:validate  → /vt-pr
```

Or run the full pipeline in one command with `/vt-flow`, which chains all steps and resolves gaps interactively at gates between each step.

- `/vt-feature` captures WHAT to build (with YAGNI challenge and API contract definition)
- `/vt-contracts` extracts and validates API contracts as concrete schema files
- `/vt-plan` creates HOW to build it (with architectural gate and payload completeness check)
- `/vt-implement` accepts a FEAT/BUG ID, picks the next story, and executes the plan phase by phase — backlog: `[ ]` → `[>]` → `[=]` (branch) or `[x]` (main)
- `/vt-pr` auto-commits and creates the PR — backlog: `[=]` → `[x]`
- `/vt-flow` orchestrates the entire pipeline with interactive gates — patch TBDs, resolve decisions, and continue without leaving the session

If this service is part of a multi-repo product, features can be driven by hub epics (`/virtual-team:feature --epic=EPIC-NNN`), which brings in cross-team decisions as constraints.

## Key Files

- **`stack.md`** — Tech stack definition. Read this first on every session. Contains language, framework, folder structure, database, API style, config approach, and all TBD items. If a `Hub` reference exists, this repo is part of a multi-repo product.
- **`docs/features/`** — Feature specs. Each one describes a feature, its YAGNI assessment, scope, definition of done, and story breakdown.
- **`docs/plans/`** — Implementation plans. Step-by-step technical instructions with file references, patterns to follow, and verification commands.
- **`docs/decisions/`** — Local architectural decision records. Non-obvious technical choices made for this repo.
- **`contracts/`** — API contract files (endpoints, models, events) as JSON Schema. Authoritative source of truth for payload shapes. `/vt-plan` and `/vt-implement` hard-stop if contracts are missing for endpoints they touch.
- **`docs/backlog.md`** — Service backlog with four states: `[ ]` Ready, `[>]` Doing, `[=]` Implemented, `[x]` Done. Only exists when `backlog: local` (default for solo mode). Managed by the `backlog-local` skill — commands use abstract operations from the `backlog` interface, not direct file manipulation. When `backlog: external`, the external service (GitHub Issues, Linear, JIRA) is the backlog and this file does not exist.
- **`docs/proposals/`** — Business proposals generated from ideas or features.
- **`docs/research/`** — Research outputs.
- **`docs/checkpoints/`** — Progress checkpoints for long-running commands. Auto-created during execution, auto-deleted on completion. If a file exists here, the command was interrupted mid-work.
- **`docs/handoffs/`** — Session handoff notes for continuity across sessions.
- **`docs/bugs/`** — Bug reports.

## Agents

Eight specialized agents live in `agents/`. They are sub-agents spawned by commands — they analyze and recommend, they don't make final decisions.

| Agent | Role | When Used |
|---|---|---|
| **software-architect** | Gatekeeper (halts on missing decisions) + architectural recommendations | `/vt-plan` Phase 0 (mandatory), `/vt-feature` |
| **product-owner** | YAGNI sanity check for repo-level features | `/vt-feature` Phase 2 (light check) |
| **codebase-locator** | Finds files by area or concern | `/vt-feature`, `/vt-plan` |
| **codebase-analyzer** | Traces data flow and system behavior | `/vt-plan`, `/vt-implement` |
| **pattern-finder** | Finds existing implementation patterns to follow | `/vt-plan`, `/vt-feature`, `/vt-implement` |
| **docs-locator** | Finds relevant docs, plans, decisions | `/vt-feature`, `/vt-plan` |
| **web-researcher** | External research — libraries, APIs, patterns | `/vt-research`, `/vt-feature` |
| **security-reviewer** | Reviews code for security concerns | `/vt-review`, `/vt-tech-review` |

### The Architect as Gatekeeper

The software-architect agent has a special role: it runs a **dependency check** before any plan is written. It reads `stack.md`, identifies TBD items, and cross-references them against the feature's requirements. If the feature needs something that hasn't been decided (e.g., database is TBD but the feature needs queries), it **halts** the entire planning process with options and recommendations. This is not optional — it prevents building on unresolved foundations.

## Quick Start

Most of the time, you only need three commands:
- **`/virtual-team:flow <description>`** — build a feature end-to-end (spec → contracts → plan → implement → review → PR)
- **`/virtual-team:flow --fix "description"`** — fix a bug end-to-end (report → investigate → fix → review → PR)
- **`/vt-status`** — see what's happening and what to do next

Everything else is available when you need it. See the full command reference below.

## Commands

Commands are the workflow. Pre-implementation commands produce documents, never code. Only `/vt-implement` writes code.

### Pipeline Orchestrator
- `/virtual-team:flow <description>` — Run the full pipeline (feature → contracts → plan → next → implement → review + validate → pr) with interactive gates. Use `--fix` for the bug fix pipeline (bug → debug → next → implement fix → review + validate → pr). Use `--to=plan` to stop early, `--from=next` to resume mid-pipeline. Bare `/vt-flow` auto-detects and resumes interrupted flows.

### Feature Intake
- `/vt-idea` — Capture a new product concept (for standalone repos without a hub)
- `/vt-feature` — Spec a feature with YAGNI challenge, research, and story breakdown
- `/virtual-team:feature --epic=EPIC-NNN` — Spec a feature driven by a hub epic (reads epic + decisions as constraints)

### Planning & Analysis
- `/vt-plan` — Create a technical implementation plan. Phase 0 runs the architect gate automatically. HARD STOP if API payloads are undefined.
- `/vt-contracts` — Extract, define, and validate API contracts. Modes: `extract` (from SPEC/feature), `validate` (completeness), `sync` (drift vs implementation), `list`
- `/vt-research` — Deep-dive research on a specific topic or technical question
- `/vt-proposal` — Business proposal from an idea or feature — scope, timeline, infrastructure, costs

### Implementation Cycle
- `/vt-implement` — Execute the plan phase by phase with verification, accepts FEAT/BUG ID as argument
- `/vt-pr` — Auto-commits pending changes, creates PR, marks backlog `[x]`. Use `--manual` to review first.
- `/vt-commit` — Stage and commit following git conventions (auto by default, `--manual` to review)

### Git Workflow
- `/vt-worktree` — Manage git worktrees (create, remove, list, clean)

### Quality & Maintenance
- `/vt-check` — Knowledge check: quiz the developer on technical decisions in the current work. Auto-triggers in `/vt-plan` and `/vt-pr` based on `~/.claude/settings.json` `knowledgeCheck` setting.
- `/vt-validate` — Compare feature spec against implementation — gap report with frontmatter. Use `--remediate` to create backlog stories from gaps.
- `/vt-review` — Code review
- `/vt-tech-review` — Technical review of architecture or approach
- `/vt-refine` — Iterate on an existing document
- `/vt-bug` — Document a bug report
- `/vt-debug` — Investigate and diagnose an issue, updates backlog if tracked
- `/vt-docs` — Generate project documentation (setup guides, config references, runbooks)
- `/vt-status` — Show project status (detects `[=]` items pending PR)
- `/vt-handoff` — Create a session handoff note for continuity

### Project Knowledge
- `/vt-decisions` — Query project conventions and design patterns. `/virtual-team:decisions go practices`, `/virtual-team:decisions testing`, `/virtual-team:decisions DI`. Use `--verbose` for code examples, `--diff` to see what's customized vs template defaults.

### Setup & Sync
- `/virtual-team:start` — Initialize a new project with stack definition and structure
- `/vt-update-workflow` — Update generic workflow files (commands, agents, skills) from the template repo

## Skills

Skills are domain-specific coding standards. `/vt-implement` loads the relevant skill before writing code for each phase. Skills work in two layers: generic domain principles, then stack-specific patterns on top.

### Plugin Skills (included with the plugin)

| Skill | Domain | Loaded When |
|---|---|---|
| **git-practices** | Branch naming, commits, PRs, worktrees | `/vt-commit`, `/vt-pr`, `/vt-worktree` |
| **design-principles** | Dependency inversion, testable design, abstraction boundaries | Writing production code (Layer 0) |
| **checkpoints** | Progress checkpointing for long-running commands | `/vt-implement`, `/vt-debug`, `/vt-feature`, `/vt-plan`, `/vt-epic` |
| **knowledge-check** | Developer understanding validation — questions, evaluation, tutoring, logging | `/vt-plan` (after approval), `/vt-pr` (before submission), `/vt-check` (standalone) |
| **backlog** | Abstract backlog operations interface — defines the 20 operations all commands use | Any command that reads or writes the backlog (loaded first, delegates to implementation) |
| **backlog-local** | File-based backlog implementation using `docs/backlog.md` (bracket markers) | Default when `stack.md` has `backlog: local` or no `backlog:` field |
| **backlog-external** | External service backlog implementation (GitHub Issues, Linear, JIRA) | When `stack.md` has `backlog: external` with a `backlog_config` section |

### Project Skills

Stack-specific skills layer on top of generic skills. Discovery works through `stack.md` — commands read the stack definition to identify the frameworks in use, then look for matching skills in `skills/`.

Each project skill is a directory with a `SKILL.md` file:

```
skills/<skill-name>/SKILL.md
```

Expected frontmatter format:

```yaml
---
name: django-backend
description: Django views, serializers, models, management commands — concrete patterns for this project's Python backend
stack: python, django          # matched against stack.md to auto-load
loaded_when: Working on .py files in the backend   # informational — helps maintainers understand scope
---
```

The `stack` field is what connects skills to `stack.md`. When `/vt-implement` reads that the project uses Django, it finds skills with `stack: django` and loads them for the current phase.

<!-- Add stack-specific skills below as the project defines its stack.

Example:
| Skill | Domain | Loaded When |
|---|---|---|
| **django-backend** | Django views, serializers, models, management commands | Working on `.py` files in the backend |
| **react-nextjs** | Next.js pages, React components, hooks, Tailwind | Working on `.tsx` files in the frontend |
-->

Skills contain conventions — not code templates. The implementation plan points to existing codebase patterns. Skills ensure the new code follows the same standards.

## Git Conventions

These are defined in the `git-practices` skill. Summary:

- **Branches:** `<type>/<ticket-id>` — e.g., `feat/CTR-12`, `fix/CTR-45`
- **Commits:** `<type>(<scope>): <short message> [<ticket-id>]` with a mandatory description body
- **PRs:** Same title format as commits. Body has Summary, Changes, Testing, Ticket sections. Testing is mandatory.
- **Worktrees:** Sibling `{repo}-worktrees/` directory. Create with `git wt <branch>`, remove with `git wtr <branch>`. One worktree per ticket.
- **Backlog status:** Items progress through `[ ]` Ready → `[>]` Doing → `[=]` Implemented → `[x]` Done. `/vt-implement` starts work (via `start()`), `/vt-pr` completes it (via `complete()`).

## Behavioral Expectations

1. **Follow the pipeline.** Feature → Plan → Implement → PR. Don't skip steps. Don't start coding without a plan.
2. **YAGNI is not optional.** Challenge every "what if" and "while we're at it." Three lines of duplicated code beats a premature abstraction.
3. **The plan is the source of truth.** During `/vt-implement`, follow the plan. Don't add features, refactor adjacent code, or "improve" things the plan doesn't mention.
4. **Verify at every boundary.** Run the verification commands at each phase end. Don't skip them.
5. **TBD items are the architect's trigger.** If `stack.md` has TBD items that a feature needs, the architect halts. Resolve them, update `stack.md`, create decision records, then re-run.
6. **Founder decides.** Agents recommend, the founder chooses. Present reasoning and options.
7. **One question at a time.** Don't overwhelm with question barrages.
8. **Respect the backlog states.** `[ ]` Ready → `[>]` Doing → `[=]` Implemented → `[x]` Done. Never re-implement a `[=]` or `[x]` item.
9. **Skills before code.** Load the relevant domain skill before writing code in `/vt-implement`. The skill has the coding standards for that layer.
10. **Lightweight by default.** All commands run with zero agents unless `--deep` is passed. `/vt-commit` and `/vt-pr` auto-proceed without prompts unless `--manual` is passed.

## Hub Context (if applicable)

If `stack.md` has a `Hub` field pointing to a sibling hub repository:

- The hub holds epics (`docs/epics/`) and cross-team decisions (`docs/decisions/`)
- When running `/virtual-team:feature --epic=EPIC-NNN`, the command reads the hub's epic and its decision records
- Hub decisions (API contracts, data conventions) are **constraints** — they're the agreed interface, not suggestions
- This repo tracks which hub decisions affect its features via frontmatter: `epic` and `hub_decisions` fields in feature specs
- This repo's own `docs/decisions/` holds local technical decisions. Hub decisions live in the hub.
