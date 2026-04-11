# Command Reference

Complete reference for the Virtual Team plugin — flags, workflows, skills, agents, and design principles.

For the quickstart guide, see the [README](../README.md).

---

## Table of Contents

- [Command Flags](#command-flags)
- [Multi-Repo Setup](#multi-repo-setup)
- [Backlog Lifecycle](#backlog-lifecycle)
- [Story Groups](#story-groups)
- [Knowledge Checks](#knowledge-checks)
- [Bug Investigation and Pattern Sweep](#bug-investigation-and-pattern-sweep)
- [Workflow Examples](#workflow-examples)
- [Skill Reference](#skill-reference)
- [Customizing Skills](#customizing-skills)
- [Agents](#agents)
- [Hooks](#hooks)
- [Key Design Principles](#key-design-principles)
- [Document Outputs by Command](#document-outputs-by-command)
- [Keeping the Library in Sync](#keeping-the-library-in-sync)

---

## Command Flags

### Global Flags

#### `--auto` — Autonomous Mode
Skip confirmations and manual pause points. Still runs all automated verification — only skips "pause for human" gates.

Available in: `/virtual-team:feature`, `/virtual-team:plan`, `/virtual-team:implement`, `/virtual-team:epic`, `/virtual-team:flow`

#### `--deep` — Agent-Powered Mode
Spawn specialized research agents for thorough analysis. Without this flag, commands use direct tools (Glob, Grep, Read) — faster and cheaper.

Available in: `/virtual-team:idea`, `/virtual-team:epic`, `/virtual-team:feature`, `/virtual-team:research`, `/virtual-team:plan`, `/virtual-team:implement`, `/virtual-team:debug`, `/virtual-team:flow`

When to use: complex features touching multiple modules, introducing new dependencies, or requiring deep codebase tracing.

#### `--fresh` — Start from Scratch
Delete any existing checkpoint and restart. Useful when prior progress is stale or context has changed.

Available in: `/virtual-team:feature`, `/virtual-team:plan`, `/virtual-team:implement`, `/virtual-team:debug`, `/virtual-team:flow`

### Command-Specific Flags

#### `/virtual-team:start`
- `--hub` — initialize as a hub repository (product brain)
- `--service` — initialize as a service repository (implementation)
- `--from=../path` — bootstrap from another repo's stack.md
- `--minimal` — create structure only, skip the interview

#### `/virtual-team:feature`
- `--epic=EPIC-NNN` — create feature driven by a hub epic
- `--ticket=PROJ-123` — pull context from an external tracker ticket

#### `/virtual-team:flow`
- `--fix` — run the bug fix pipeline instead of the feature pipeline
- `--fix --quick` — skip bug documentation, start directly at debug
- `--to=STEP` — stop after this step completes (e.g., `--to=plan`)
- `--from=STEP` — start from this step (e.g., `--from=implement`)
- `--resume` — pick up where the last flow left off (note: bare `/virtual-team:flow` does this automatically)
- `--sdd` — subagent-driven development for `/virtual-team:implement` (best for 5+ tasks)

#### `/virtual-team:plan`
- `--story=S-003` — plan a specific story instead of full feature

#### `/virtual-team:implement`
- `--sdd` — subagent-driven development: orchestrator dispatches fresh subagent per task with two-stage review
- `--phase=N` — resume from a specific phase after a session break
- Accepts: `FEAT-NNN`, `BUG-NNN`, or a plan file path

#### `/virtual-team:pr`
- `--draft` — create a draft PR
- `--manual` — ask for confirmation before committing/submitting
- `--no-commit` — skip auto-committing pending changes
- `--rebase` — rebase onto latest target branch
- `--base=develop` — target specific base branch

#### `/virtual-team:debug`
- Accepts: bug ID (`BUG-003`), file path, or symptom description

#### `/virtual-team:check`
- `--plan` — focus questions on architectural decisions
- `--pr` — focus questions on implementation patterns
- `--verbose` — study mode with hints before answering
- Accepts: `FEAT-NNN` or plan path

#### `/virtual-team:decisions`
- `--verbose` — include short code examples from source files
- `--diff` — show customized vs default conventions
- Accepts: topic, language, layer, or concept

#### `/virtual-team:contracts`
- `extract <source>` — extract contracts from a spec
- `validate` — check all contract files for completeness
- `sync` — compare contracts against implementation, flag drift
- `list` — show all defined contracts
- `--format=json|go|typescript|proto` — output format (default: JSON Schema)
- `--hub` — also check hub decisions for cross-team contracts

#### `/virtual-team:research`
- `--scope=market|technical|codebase` — limit research domain

#### `/virtual-team:docs`
- `--update <path>` — update an existing doc to match current codebase

### Flag Combinations

```bash
/virtual-team:flow --deep --to=plan Add search          # agent-powered, stop after plan
/virtual-team:flow --auto --sdd Add notifications       # autonomous + subagent implementation
/virtual-team:implement --auto --deep --phase=2         # resume phase 2, autonomous, with agents
/virtual-team:feature --auto --deep Add auth             # autonomous spec with agent research
```

---

## Multi-Repo Setup

Most teams start with a single repo — `/virtual-team:start` is all you need. If your product spans multiple repositories (e.g., separate API and frontend repos), you can add a **hub repo** to coordinate across them.

- **Hub** — Product brain. Holds epics, cross-team decisions, and shared API contracts. No application code lives here.
- **Service** — Any implementation repo. Each has its own codebase, backlog, and development cycle. This is the default — a standalone repo without a hub works fine.

### Setting Up a Hub Repo

Install the plugin (if not already installed), then run:

```
/virtual-team:start --hub
```

This creates `stack.md` with product identity and teams registry.

### Setting Up a Service Repo

Install the plugin (if not already installed), then run:

```
/virtual-team:start --service
```

This walks through language, framework, database, and all tech stack decisions.

### Multi-Repo Feature Flow

```
Hub:
  /virtual-team:epic Add multilingual support
    → EPIC-001 + shared decision records (ADR-001, ADR-002)

API repo:
  /virtual-team:feature --epic=EPIC-001           # reads epic constraints
  /virtual-team:plan FEAT-001 → /virtual-team:implement → /virtual-team:pr

Frontend repo:
  /virtual-team:feature --epic=EPIC-001           # reads same constraints
  /virtual-team:plan FEAT-001 → /virtual-team:implement → /virtual-team:pr
```

Both repos work independently but respect shared agreements from the hub.

---

## Backlog Lifecycle

Stories move through four states. Commands use abstract operations (`list()`, `start()`, `complete()`) — never file formats directly.

### Local Backlog (default)

States tracked in `docs/backlog.md` using bracket markers:

```
[ ] Ready       → specced and available for pickup
[>] Doing       → being worked on
[=] Implemented → code done, pending PR
[x] Done        → PR merged
```

Each entry includes metadata:

```markdown
- [ ] S-010: Create user model | feature:FEAT-005 | group:1 | order:1 | service:be
```

### External Backlog

Set `backlog: external` in `stack.md` with a `backlog_config` section. Supports GitHub Issues (via `gh`), Linear, and JIRA (via MCP connectors).

### Workflow Modes

- **`mode: solo`** (default) — one developer, local or external backlog
- **`mode: team`** — multiple developers, requires external backlog for coordination

---

## Story Groups

Features break into multiple stories. Story groups define which stories belong together on a single branch.

```markdown
- [ ] S-010: Create user model      | feature:FEAT-005 | group:1 | order:1 | service:be
- [ ] S-011: Add user API endpoints | feature:FEAT-005 | group:1 | order:2 | service:be
- [ ] S-012: Add user validation    | feature:FEAT-005 | group:1 | order:3 | service:be
- [ ] S-013: User profile page      | feature:FEAT-005 | group:2 | order:1 | service:fe
```

Stories in the same group are sequential on one branch. Different groups can run in parallel on separate branches.

```
/virtual-team:implement FEAT-005
  → Picks first Ready story (S-010)
  → Implements, advances to S-011, then S-012
  → All stories done → ready for /pr
```

---

## Knowledge Checks

The knowledge check system validates that developers understand technical decisions made during planning and implementation.

### How It Works

At key checkpoints (after `/virtual-team:plan` and before `/virtual-team:pr`), the system generates 3-5 questions about the work. Pass threshold is 60%. Every question gets a tutoring explanation regardless of score.

### Settings

Controlled per-developer via `~/.claude/settings.json`:

```json
{ "knowledgeCheck": "on" }
```

- `"on"` — soft block: warns on gaps but proceeds
- `"strict"` — hard block: must pass before continuing
- `"off"` or absent — skip at automated checkpoints

### Standalone

```bash
/virtual-team:check                    # auto-detect context
/virtual-team:check --verbose          # study mode with hints
/virtual-team:check --plan FEAT-007    # quiz on architecture
```

---

## Bug Investigation and Pattern Sweep

`/virtual-team:debug` investigates through four phases: Reproduce, Trace, Root Cause, Document.

The **mandatory pattern sweep** in Phase 3 is critical: when the root cause is found at one location, the command searches the entire codebase for every instance of the same pattern. Each occurrence is classified:

- 🔴 Confirmed bug
- 🟡 Likely bug
- 🟢 Safe

If 10+ occurrences are found, the issue is flagged as systemic — requiring a full feature pipeline instead of a quick fix.

---

## Workflow Examples

### Morning startup

```bash
/virtual-team:status                        # what's in progress, what's next
/virtual-team:implement FEAT-007            # continue existing work
/virtual-team:implement --phase=3           # resume from specific phase
```

### Full pipeline variations

```bash
# Automated feature flow
/virtual-team:flow Add password reset via email

# Agent-powered with subagent implementation
/virtual-team:flow --deep --sdd Add real-time notifications

# Stop after planning
/virtual-team:flow --to=plan Add search capability

# Resume interrupted flow
/virtual-team:flow --resume
```

### Bug fix variations

```bash
/virtual-team:flow --fix "login broken after reset"   # full bug fix pipeline
/virtual-team:flow --fix BUG-003                       # bug already documented
/virtual-team:flow --fix --quick "typo in header"      # skip documentation
```

### Manual feature (step by step)

```bash
/virtual-team:feature Add password reset via email
/virtual-team:contracts extract docs/features/...
/virtual-team:plan FEAT-001
/virtual-team:implement FEAT-001
/virtual-team:commit
/virtual-team:pr
```

### Parallel work with worktrees

```bash
# Terminal 1 (worktree A):
/virtual-team:implement FEAT-005

# Terminal 2 (worktree B):
/virtual-team:implement FEAT-006
```

### Ending a session

```
/virtual-team:handoff
```

---

## Skill Reference

### Behavioral Skills (auto-loaded — always active)

| Skill | Purpose |
|-------|---------|
| `virtual-team:skill-awareness` | Maps contexts to behavioral skills at session start |
| `virtual-team:test-driven-development` | Red-green-refactor: no production code without a failing test first |
| `virtual-team:verification-before-completion` | No completion claims without fresh verification evidence |
| `virtual-team:receiving-code-review` | Verify feedback before implementing, push back when wrong |
| `virtual-team:subagent-driven-development` | Orchestrator protocol for `--sdd` mode |

### Domain Skills (loaded by `/virtual-team:implement` based on file type)

| Skill | When Loaded |
|-------|-------------|
| `virtual-team:api-design` | Routes, controllers, API code |
| `virtual-team:ui-design` | Frontend components, styling |
| `virtual-team:data-layer` | Migrations, models, queries |
| `virtual-team:service-layer` | Business logic, services |
| `virtual-team:git-practices` | Commits, branches, PRs |

### Operational Skills

| Skill | When Loaded |
|-------|-------------|
| `virtual-team:checkpoints` | Multi-phase commands (implement, debug, feature, plan) |
| `virtual-team:knowledge-check` | Plan approval, PR creation, standalone check |
| `virtual-team:backlog` | Any backlog operation (abstract interface) |
| `virtual-team:backlog-local` | Default file-based implementation |
| `virtual-team:backlog-external` | GitHub Issues, Linear, JIRA integration |

---

## Customizing Skills

### Two-Layer System

**Layer 1 — Generic skills** (included): Framework-agnostic conventions with `<!-- CUSTOMIZE -->` markers.

**Layer 2 — Stack skills** (you create): Matched via `stack:` frontmatter against `stack.md`. Example: a `go-gin` skill with `stack: go, gin` auto-loads alongside `virtual-team:api-design`.

### Where to Put What

| Content | Where |
|---------|-------|
| Universal principles ("all dependencies must be interfaces") | Generic skill |
| Stack-specific patterns ("use Gin's ShouldBindJSON") | Stack skill |
| One-liner rules ("never import from internal/legacy") | `CLAUDE.md` |
| Factual stack definitions (what framework, what ORM) | `stack.md` |

---

## Agents

8 read-only sub-agents that analyze and recommend. Spawned with `--deep`.

| Agent | Model | Purpose |
|-------|-------|---------|
| `product-owner` | opus | Market analysis, YAGNI checks, risk assessment |
| `software-architect` | opus | Architecture decisions, TBD dependency gatekeeper |
| `web-researcher` | sonnet | External research with source attribution |
| `codebase-locator` | sonnet | Find relevant files by area or concern |
| `codebase-analyzer` | sonnet | Trace data flow, dependencies, patterns |
| `pattern-finder` | sonnet | Find existing code as templates for new work |
| `docs-locator` | sonnet | Find docs, plans, decisions by topic |
| `security-reviewer` | sonnet | Security vulnerability scanning |

---

## Hooks

### SessionStart
Runs at every session start. Loads `skills/skill-awareness/SKILL.md` so behavioral skills activate based on context, even without explicit slash commands.

### PreToolUse (on Edit/Write)
Before any `Edit` or `Write` tool call, checks:
1. **TDD** — writing production code? Is there a failing test first?
2. **Verification** — about to claim completion without fresh evidence?

---

## Key Design Principles

**Vertical slicing.** Every story delivers one complete capability through all layers. Never "all migrations first." After the first story, something must be testable.

**Deliberate pipeline.** Every command produces a specific artifact and stops. `/virtual-team:feature` writes specs, never code. Only `/virtual-team:implement` writes code.

**YAGNI enforcement.** The product-owner agent challenges every "what if." Three lines of duplicated code beats a premature abstraction.

**Architect as gatekeeper.** If `stack.md` has TBD items the feature needs, planning halts until you decide.

**TBD is valid.** Mark unknowns as TBD during `/virtual-team:start`. The architect catches them at the right time.

**Documents as source of truth.** Epics, features, plans, and decisions are markdown files in `docs/`, versioned in git.

**Mandatory pattern sweep.** Bug investigations scan the entire codebase. A report covering one location is incomplete.

**Founder decides.** Agents recommend, the founder chooses. No agent makes final calls.

---

## Document Outputs by Command

**Hub repos:** `/virtual-team:idea` → `docs/features/`, `/virtual-team:epic` → `docs/epics/` + `docs/decisions/`, `/virtual-team:research` → `docs/research/`

**Service repos:** `/virtual-team:feature` → `docs/features/` + `docs/backlog.md`, `/virtual-team:plan` → `docs/plans/`, `/virtual-team:implement` → code + `docs/backlog.md`, `/virtual-team:bug` → `docs/bugs/`, `/virtual-team:debug` → `docs/bugs/` (updated), `/virtual-team:check` → `docs/knowledge-checks/`

---

## Keeping the Library in Sync

The plugin is installed via the marketplace and updates are managed through it:

```
/virtual-team:update-workflow
```

This checks for the latest version and pulls updates. Since the plugin is installed as a marketplace package, all repos sharing the same plugin installation get updates automatically.
