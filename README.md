# Claude Code Virtual Team

A `.claude/` configuration library that turns Claude Code into a virtual development team for solo founders. It provides agents (specialized sub-agents), commands (workflow steps), and skills (coding standards) that enforce a deliberate pipeline from idea to shipped code.

This library is designed to be copied into your repositories. It supports two repo types: a **hub** (product brain) and **service** repos (implementation hands).

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- Git configured with worktree aliases (see Git Setup below)

### Git Setup

The library expects two global aliases for worktree management. Add them to your `~/.gitconfig`:

```gitconfig
[alias]
    wt = "!f() { \
        REPO_NAME=$(basename $(git rev-parse --show-toplevel)); \
        WORKTREE_DIR=\"../$(echo $REPO_NAME)-worktrees/$1\"; \
        if git show-ref --verify --quiet refs/heads/$1 2>/dev/null; then \
            git worktree add \"$WORKTREE_DIR\" $1; \
        else \
            git worktree add -b $1 \"$WORKTREE_DIR\"; \
        fi \
    }; f"
    wtr = "!f() { \
        REPO_NAME=$(basename $(git rev-parse --show-toplevel)); \
        git worktree remove \"../$(echo $REPO_NAME)-worktrees/$1\"; \
    }; f"
```

This creates worktrees in a sibling directory:

```
my-app-api/                  ← main branch (your repo)
my-app-api-worktrees/        ← worktrees live here
  feat/CTR-12/
  fix/CTR-45/
```

## File Structure

```
.claude/
├── CLAUDE-hub.md            ← CLAUDE.md template for hub repos
├── CLAUDE-service.md        ← CLAUDE.md template for service repos
├── agents/                  ← 8 specialized sub-agents
│   ├── product-owner.md     ← Market, users, risk, value analysis
│   ├── software-architect.md ← Architecture + dependency gatekeeper
│   ├── web-researcher.md    ← External research (market, tech, users)
│   ├── codebase-locator.md  ← Finds files by area or concern
│   ├── codebase-analyzer.md ← Traces data flow and system behavior
│   ├── pattern-finder.md    ← Finds existing implementation patterns
│   ├── docs-locator.md      ← Finds relevant docs, plans, decisions
│   └── security-reviewer.md ← Security review of code changes
├── commands/                ← 25 workflow commands
│   ├── idea.md              ← Capture a new product concept
│   ├── epic.md              ← Hub-level initiative with cross-team agreements
│   ├── feature.md           ← Spec a feature with YAGNI challenge + story groups
│   ├── research.md          ← Deep-dive research
│   ├── plan.md              ← Technical implementation plan + knowledge check
│   ├── next.md              ← Pick up work, lock it, create worktree (supports story groups)
│   ├── implement.md         ← Execute plan phase by phase
│   ├── commit.md            ← Git commit following conventions
│   ├── pr.md                ← Pull request + release lock + knowledge check
│   ├── init.md              ← Initialize repo (hub or service)
│   ├── worktree.md          ← Manage git worktrees
│   ├── review.md            ← Code review
│   ├── tech-review.md       ← Architecture review
│   ├── validate.md          ← Compare spec vs implementation, find gaps
│   ├── refine.md            ← Iterate on existing documents
│   ├── bug.md               ← Document a bug report
│   ├── debug.md             ← Investigate issues with mandatory pattern sweep
│   ├── check.md             ← Knowledge check: quiz on technical decisions
│   ├── proposal.md          ← Business proposal (scope, timeline, costs)
│   ├── decisions.md         ← Query project conventions and design patterns
│   ├── docs.md              ← Generate project documentation
│   ├── status.md            ← Project status briefing
│   ├── handoff.md           ← Session continuity notes
│   ├── contracts.md         ← Extract, define, validate API contracts
│   └── update-workflow.md   ← Sync workflow files from template repo
└── skills/                  ← 11 domain-specific standards
    ├── git-practices/       ← Branch, commit, PR, worktree, backlog lock conventions
    ├── api-design/          ← API endpoint and route handler standards
    ├── ui-design/           ← Frontend component and styling standards
    ├── data-layer/          ← Database, migration, query standards
    ├── service-layer/       ← Business logic, interfaces, dependency injection standards
    ├── go-practices/        ← Go-specific: DI pattern, mockery, project structure (stack: go)
    ├── checkpoints/         ← Checkpoint protocol for resuming multi-phase commands
    ├── knowledge-check/     ← Developer understanding validation protocol
    ├── backlog/             ← Abstract backlog interface (operations all commands use)
    ├── backlog-local/       ← Backlog via local docs/backlog.md (default)
    └── backlog-external/    ← Backlog via external services (Linear, Jira, GitHub Issues)
```

## Setting Up a Hub Repo

The hub is the product brain. It holds epics, cross-team decisions, and coordinates service repos. No application code lives here.

### Step 1: Create the repo and copy the library

```bash
mkdir my-app-hub && cd my-app-hub
git init

# Copy the .claude directory from this library
cp -r /path/to/this-library/.claude .

# Use the hub CLAUDE.md template
cp .claude/CLAUDE-hub.md CLAUDE.md
```

### Step 2: Initialize

Start a Claude Code session and run:

```
/init --hub
```

This walks you through: product identity (name, description, target users, stage) and teams registry (each service repo's name, path, role, responsibility, stack summary).

It creates: `stack.md` (product definition with teams registry), `docs/epics/`, `docs/decisions/`, `docs/research/`, `docs/reviews/`, and `docs/backlog.md` (product backlog with Active / Next / Inbox sections).

### Step 3: Commit the setup

```bash
git add -A
git commit -m "chore(init): initialize hub repository"
```

## Setting Up a Service Repo

A service repo is an implementation repo — API, frontend, mobile, etc. It has its own codebase, backlog, and development cycle.

### Step 1: Create the repo and copy the library

```bash
mkdir my-app-api && cd my-app-api
git init

# Copy the .claude directory from this library
cp -r /path/to/this-library/.claude .

# Use the service CLAUDE.md template
cp .claude/CLAUDE-service.md CLAUDE.md

# Remove hub-only template (optional, keeps things clean)
rm .claude/CLAUDE-hub.md
```

### Step 2: Initialize

Start a Claude Code session and run:

```
/init --service
```

This walks you through: hub reference (path to the hub repo), language, runtime, package manager, framework, project structure, database, ORM, API style, auth, external services, configuration, environments, testing, linting, CI/CD, deployment, and build/run commands.

Anything you haven't decided yet is marked TBD. The software architect will catch it later when a feature actually needs it.

It creates: `stack.md` (tech stack definition with TBD tracking), `docs/features/`, `docs/plans/`, `docs/decisions/`, `docs/research/`, `docs/handoffs/`, `docs/bugs/`, `docs/reviews/`, and `docs/backlog.md` (service backlog with Doing / Ready / Inbox sections).

### Step 3: Commit the setup

```bash
git add -A
git commit -m "chore(init): initialize service repository"
```

## Keeping the Library in Sync

If you have multiple service repos, the `.claude/` directory is the same across all of them. You can share it via:

- **Git submodule**: Point `.claude/` to this library repo. Update all repos by pulling the submodule.
- **Manual copy**: Copy `.claude/` when creating new repos. Sync manually when commands or agents change.
- **Template repo**: Use this library as a GitHub template repository.
- **Update command**: Run `/update-workflow` in a service repo to pull latest generic files from a template path.

The only repo-specific file is `CLAUDE.md` at the root (copied from the appropriate template). Everything else in `.claude/` is generic.

## The Full Workflow

Here is the complete lifecycle from product idea to shipped code, showing which repo each step runs in and what it produces.

### Phase 1: Product Discovery (Hub)

```
Hub repo:
  /idea Build a task management app for remote teams
    → Structured interview about the problem, users, risks
    → Product owner agent researches market and competition
    → Output: docs/features/2026-02-12-task-management-app.md (IDEA-001)
    → Added to docs/backlog.md in Inbox
```

### Phase 2: Epic Definition (Hub)

```
Hub repo:
  /epic Add real-time collaboration to task boards
    → Phase 1: Capture the initiative (what, why, for whom)
    → Phase 2: Product owner analyzes market context, risks, success metrics
    → Phase 3: Software architect reads teams registry, identifies affected repos
    → Phase 4: Create cross-team agreements (API contracts, conventions)
    → Phase 5: Document the epic
    → Output:
        docs/epics/2026-02-15-realtime-collaboration.md (EPIC-001)
        docs/decisions/2026-02-15-websocket-api-contract.md (ADR-001, type: contract)
        docs/decisions/2026-02-15-event-format-convention.md (ADR-002, type: convention)
```

### Phase 3: Feature Breakdown (Service Repo)

```
Service repo (my-app-api):
  /feature --epic=EPIC-001
    → Reads hub epic and its decision records (ADR-001, ADR-002) as constraints
    → Phase 1: Understand what this repo needs to implement
    → Phase 2: YAGNI check (skipped for epic-driven — PO already assessed)
    → Phase 3: Research codebase patterns and technical feasibility
    → Phase 4: Define scope, definition of done, success metrics
    → Phase 4.5: Incremental delivery conversation (thinnest slice, milestones)
    → Phase 5: Write feature spec
    → Phase 6: Break into vertically-sliced stories with execution groups
    → Output:
        docs/features/2026-02-16-websocket-backend.md (FEAT-001)
        Stories added to docs/backlog.md in Ready column (with group/order tags)
```

Stories are vertically sliced — each story delivers one complete capability through all layers, not one technical layer across all capabilities. They're organized into execution groups (see Story Groups below) that define which stories belong together on a single branch.

### Phase 4: Planning (Service Repo)

```
Service repo (my-app-api):
  /plan FEAT-001
    → Phase 0: Software architect runs dependency check against stack.md
      ✅ Pass — all TBD items resolved (or)
      ⛔ HALT — "Database: TBD, need to choose before proceeding"
    → Phase 1: Codebase analysis (locator, analyzer, pattern-finder agents)
    → Phase 2: Write plan with vertical phases (each phase = one end-to-end capability)
    → Phase 3: Review and validate
    → Phase 3.5: Knowledge check (if enabled — see Knowledge Checks)
    → Output: docs/plans/2026-02-16-websocket-backend.md
```

#### What Happens When the Architect Halts

```
Service repo (my-app-api):
  /plan FEAT-001
    → Phase 0: Architect checks stack.md
    → ⛔ HALT — WebSocket library: TBD, Caching: TBD
    → Presents options with recommendations:
        Decision 1: WebSocket library — gorilla/websocket vs nhooyr/websocket vs gobwas/ws
        Decision 2: Cache layer — Redis vs in-memory
    → You decide, update stack.md, create decision records
    → Re-run /plan FEAT-001
    → ✅ Architect passes, planning continues
```

### Phase 5: Implementation (Service Repo, in a Worktree)

```
Service repo (my-app-api), on main branch:
  /next
    → Reads backlog, finds first Ready item (S-001)
    → Checks backlog.lock — not locked by another worktree
    → Creates lock in docs/backlog.lock, commits on main
    → Creates worktree: git wt feat/CTR-12
    → Moves S-001 from Ready [ ] to Doing [>] in backlog.md on the feature branch
    → Output: "Open a new session in ../my-app-api-worktrees/feat/CTR-12"

New terminal, in the worktree:
  cd ../my-app-api-worktrees/feat/CTR-12
  claude   ← start new Claude Code session

  /implement
    → Reads the plan
    → Phase 1: Data model & migration — writes code, runs verification
    → Phase 2: Business logic & service — writes code, runs verification
    → Phase 3: API endpoint — writes code, runs verification
    → Phase 4: Integration tests — writes code, runs verification
    → Final verification: all tests pass, lint clean, build succeeds
    → Output: working code, all checks green
```

### Phase 6: Ship (Service Repo, in the Worktree)

```
Worktree session (../my-app-api-worktrees/feat/CTR-12):
  /commit
    → Reads git-practices skill
    → Extracts ticket ID from branch: feat/CTR-12 → CTR-12
    → Stages changes, writes commit message:
      feat(websocket): implement real-time task updates [CTR-12]
    → Commits

  /pr
    → Reviews ALL commits on the branch
    → Composes PR title and body (Summary, Changes, Testing, Ticket)
    → Knowledge check (if enabled — see Knowledge Checks)
    → Presents draft for review
    → After confirmation: gh pr create
    → Marks all stories on this branch as Done [x] in backlog.md
    → Removes all locks for this branch from backlog.lock
    → Output: PR URL, cleanup suggestions
```

### Phase 7: Cleanup

```
Back in main repo directory:
  /worktree clean
    → Finds worktrees where PR is merged
    → Removes them after confirmation
    → Cleans up stale locks
```

## Backlog Lifecycle

Stories move through four states tracked in `docs/backlog.md`:

```
[ ] Ready     → story is specced and available for pickup
[>] Doing     → story is locked and being worked on
[=] Implemented → code is done, pending PR/review
[x] Done      → PR merged, story complete
```

Each backlog entry includes metadata tags:

```markdown
- [ ] S-010: Create user model | feature:FEAT-005 | group:1 | order:1 | service:be
```

Tags: `feature:FEAT-NNN` (parent feature), `group:N` (execution group), `order:N` (sequence within group), `service:xx` (target repo).

### Lock vs Status Separation

The workflow separates coordination (locks) from reality tracking (status) across branches:

**Lock file (`docs/backlog.lock`)** is committed on main so all worktrees see it immediately. This prevents two worktrees from picking the same item. `/next` creates the lock; `/pr` removes it.

**Backlog status (`docs/backlog.md`)** changes happen on the feature branch. Moving `[ ]` to `[>]` to `[=]` to `[x]` is committed alongside the code. When the PR merges, main's backlog reflects the completed work. This means main's backlog is always accurate — it only shows work as done when the code actually lands.

Exception: when using `--current` mode (sequential stories on the same branch), both lock and status go on the current branch since there's no cross-worktree coordination needed.

### Pluggable Backlog Backend

The backlog system uses a two-layer skill architecture so you can swap the storage backend without changing any commands.

**Layer 1 — Interface** (`backlog/SKILL.md`): Defines abstract operations that all commands reference: `list()`, `get()`, `start()`, `complete()`, `lock()`, `release_lock()`, `push_status()`, etc. Commands never manipulate backlog files directly — they call these operations.

**Layer 2 — Implementation**: A concrete skill that fulfills the interface.

| Implementation | `stack.md` value | Storage | Sync |
|---|---|---|---|
| `backlog-local` | `backlog: local` (default) | `docs/backlog.md` + `docs/backlog.lock` | None (local only) |
| `backlog-external` | `backlog: external` | External service (Linear, Jira, GitHub Issues) + local lock files | Active (push status, pull comments/priorities) |

Commands load the right implementation by reading the `backlog:` field in `stack.md`. If the field is absent, `backlog-local` is the default.

The external backend uses a hybrid model: the external service owns status and priority, while local files own locks (for worktree coordination) and documents (specs, plans, contracts). A `docs/backlog-index.md` file maps story IDs to external issue IDs/URLs.

To switch from local to external: set `backlog: external` in `stack.md`, add a `backlog_config:` section with service type, project, and state mappings, then run the migration steps documented in the `backlog-external` skill.

## Story Groups

Features often break down into multiple stories that should be implemented sequentially on a single branch. Story groups solve this.

### How Groups Work

During `/feature` Phase 6 (story breakdown), stories are assigned to execution groups:

```markdown
- [ ] S-010: Create user model | feature:FEAT-005 | group:1 | order:1 | service:be
- [ ] S-011: Add user API endpoints | feature:FEAT-005 | group:1 | order:2 | service:be
- [ ] S-012: Add user validation | feature:FEAT-005 | group:1 | order:3 | service:be
- [ ] S-013: User profile page | feature:FEAT-005 | group:2 | order:1 | service:fe
- [ ] S-014: User settings page | feature:FEAT-005 | group:2 | order:2 | service:fe
```

Stories in the same group are sequential and go on one branch. Different groups can run in parallel on separate branches.

### Working with Groups

Pick up a feature group:

```
/next --feature=FEAT-005
  → Locks all stories in group 1 (lowest group with Ready items)
  → Creates branch feat/FEAT-005 (feature ID, not story ID)
  → Marks first story as Doing
```

Advance through stories in the group:

```
/next --current
  → Marks current story as Implemented [=]
  → Picks next story in the group by order:N
  → Marks it as Doing [>]
```

Ship the whole group as one PR:

```
/pr
  → Marks ALL stories on this branch as Done [x]
  → Removes ALL locks for this branch
  → Creates a single PR covering the entire group
```

### Branch Naming Rules

Branch names follow a strict priority order:

1. **If `--feature=FEAT-NNN` was passed** (group mode): use the feature ID → `feat/FEAT-005`. This is the only case where the feature ID becomes the branch name.
2. **If the story has an external ticket ID** (e.g., CTR-12): use that → `feat/CTR-12`
3. **If no external ticket**: use the story ID → `feat/S-006`

For single-story pickup (no `--feature` flag): never use the feature ID as the branch name. Never create hybrid names like `feat/FEAT-005-S6`.

## Knowledge Checks

The knowledge check system validates that developers understand the technical decisions made by the AI during planning and implementation. It serves as a tutoring mechanism, not a gate.

### How It Works

At key checkpoints (after `/plan` approval and before `/pr` submission), the system generates 3-5 questions about the technical work: 2-3 multiple-choice questions testing factual understanding, and 1-2 open-ended questions testing reasoning about tradeoffs and design decisions.

Post-plan questions focus on architectural choices, dependency decisions, phase ordering, integration points, and risk areas. Pre-PR questions focus on implementation patterns, data flow, edge cases, error handling, and testing strategy.

Answers are evaluated against key concepts from the plan or implementation. The pass threshold is 60% of total points. Regardless of score, every question gets a tutoring explanation so the developer learns from the process.

### Developer Settings

Knowledge checks are controlled per-developer via `~/.claude/settings.json`:

```json
{
  "knowledgeCheck": "on"
}
```

- `"on"` — Run checks at plan and PR checkpoints. Soft block: warns on gaps but always proceeds.
- `"strict"` — Hard block: developer must pass (≥60%) before the workflow continues. On failure, prompts to retry with `/check`.
- `"off"` or absent — Skip checks entirely at automated checkpoints.

### Standalone Command

Run `/check` at any time to quiz yourself on current work. This always runs regardless of the settings file since the developer explicitly invoked it.

```
/check                    ← auto-detect context from branch and backlog
/check --plan             ← focus on architectural decisions
/check --pr               ← focus on implementation patterns
/check --verbose          ← study mode: show key concepts as hints before answering
/check FEAT-007           ← check understanding of a specific feature
```

Results are logged to `docs/knowledge-checks/` for tracking developer growth over time.

## Bug Investigation and Pattern Sweep

The `/debug` command investigates bugs through four phases: Reproduce, Trace, Root Cause, and Document. A critical requirement is the **mandatory pattern sweep** in Phase 3.

When the root cause is identified at one location, `/debug` searches the entire codebase for every instance of the same pattern. Each occurrence is classified as confirmed bug (🔴), likely bug (🟡), or safe (🟢). The investigation is not complete until all occurrences are documented.

If 10+ occurrences are found, the issue is flagged as systemic — not a single bug but a codebase-wide pattern requiring a systematic fix. The bug report's suggested fix must address all confirmed and likely occurrences, not just the primary one.

This prevents the common failure mode where a bug is "fixed" in one location while identical issues remain elsewhere in the codebase.

## Quick Flows

### Solo feature (no hub, single repo)

```
/feature Add password reset via email     ← spec + stories
/plan FEAT-001                            ← technical plan (architect gates)
/next                                     ← lock + worktree
  ↓ new session in worktree
/implement                                ← write code
/commit                                   ← commit
/pr                                       ← ship + unlock
```

### Multi-story feature (sequential stories, one branch)

```
/feature Add user management              ← spec + stories with group tags
/plan FEAT-005                            ← plan covering the feature
/next --feature=FEAT-005                  ← lock group, create feat/FEAT-005 worktree
  ↓ new session in worktree
/implement                                ← implement first story
/next --current                           ← advance to next story in group
/implement                                ← implement second story
/next --current                           ← advance again
/implement                                ← implement third story
/pr                                       ← one PR, all stories marked Done
```

### Morning startup

```
/status                                   ← what's in progress, what's next
/next                                     ← or continue existing work
  ↓
/implement --phase=3                      ← resume from where you left off
```

### Ending a session

```
/handoff                                  ← captures exact state for next session
```

### Investigating a bug

```
/bug Users can't reset password if email has uppercase letters
/debug BUG-003                            ← investigate + pattern sweep
/feature --ticket=BUG-003                 ← if fix needs a spec
```

### Knowledge check (standalone)

```
/check                                    ← quiz on current work
/check --verbose                          ← study mode with hints
```

### Multi-repo feature driven by an epic

```
Hub:
  /epic Add multilingual support
    → creates EPIC-001
    → creates ADR-003 (language code convention)
    → creates ADR-004 (translation API contract)

API repo:
  /feature --epic=EPIC-001                ← reads epic + ADR-003, ADR-004
  /plan FEAT-001
  /next → /implement → /commit → /pr

Frontend repo:
  /feature --epic=EPIC-001                ← reads same epic + agreements
  /plan FEAT-001
  /next → /implement → /commit → /pr
```

Both repos work independently but respect the shared agreements from the hub.

### Parallel work with worktrees

```
Terminal 1 (main branch):
  /next                  ← picks S-001, locks it, creates worktree A

Terminal 1 (main branch, again):
  /next                  ← picks S-002 (S-001 is locked), creates worktree B

Terminal 2 (worktree A):
  /implement             ← working on S-001

Terminal 3 (worktree B):
  /implement             ← working on S-002 in parallel
```

The `backlog.lock` file on main prevents both from picking the same item.

## Command Reference

| Command | Where | What It Does | Produces | When to Use |
|---------|-------|-------------|----------|-------------|
| `/init` | Any | Initialize repo structure and stack | `stack.md`, `docs/` | Starting a new project or onboarding an existing repo to the workflow |
| `/idea` | Any | Capture and shape a product concept | Feature brief | Early-stage thinking — you have a concept but haven't committed to building it yet |
| `/epic` | Hub | Define cross-team initiative | Epic + decision records | Large initiatives that span multiple features or services |
| `/feature` | Service | Spec a feature with YAGNI check | Feature spec + stories (with groups) | Ready to commit to building something — this starts the core pipeline |
| `/research` | Any | Deep-dive research | Research document | Technology evaluation, competitive analysis, or exploring unknowns before speccing |
| `/contracts` | Service | Extract, define, validate API contracts | Schema files in `contracts/` | After `/feature`, before `/plan` — lock down API shapes so implementation can't drift |
| `/plan` | Service | Technical implementation plan | Plan with file references | After spec and contracts are stable — produces the step-by-step build plan |
| `/next` | Service | Pick work, lock, create worktree | Locked item + worktree | Starting a work session — picks the next story, locks it, sets up an isolated branch |
| `/implement` | Worktree | Execute plan phase by phase | Working code | After `/next` — the only command that writes application code |
| `/commit` | Worktree | Stage and commit | Git commit | Code is working and you've verified it manually |
| `/pr` | Worktree | Create PR, release lock | Pull request | Implementation is complete, tests pass, ready for review |
| `/worktree` | Service | Manage worktrees | Create/remove/list/clean | Housekeeping — list active branches, clean up stale worktrees |
| `/review` | Any | Code review | Review feedback | Before merging — get a second-opinion review on code changes |
| `/tech-review` | Any | Architecture review | Review document | Before or after implementation — assess architectural decisions and patterns |
| `/validate` | Service | Compare spec vs implementation | Gap analysis | After implementation — verify nothing was missed or silently changed vs. the spec |
| `/refine` | Any | Iterate on a document | Updated document | A spec, plan, or doc needs revision based on feedback or new information |
| `/bug` | Service | Document a bug | Bug report | You found a bug — document it before investigating or fixing |
| `/debug` | Service | Investigate with pattern sweep | Diagnosis + all occurrences | After `/bug` — systematic investigation with codebase-wide pattern search |
| `/check` | Any | Knowledge check quiz | Score + tutoring | Learning the codebase — quiz yourself on conventions, architecture, or decisions |
| `/decisions` | Any | Query project conventions | Bullet list + source refs | Quick lookup — "what did we decide about X?" without digging through files |
| `/proposal` | Any | Business proposal | Scope, timeline, costs doc | Client-facing or stakeholder-facing scope and cost estimation |
| `/docs` | Any | Generate project documentation | Guides, references, runbooks | Project needs user guides, API docs, setup instructions, or runbooks |
| `/status` | Any | Project status briefing | Status report | Morning startup or check-in — see what's done, in progress, and blocked |
| `/handoff` | Any | Session continuity note | Handoff document | Ending a session mid-work — capture context so the next session picks up cleanly |
| `/update-workflow` | Service | Sync workflow files from template | Updated `.claude/` files | Template has been updated and you want to pull in the latest commands and skills |

## Command Options

Many commands support flags to customize behavior.

### Global Options

#### `--auto` — Autonomous Mode
Skip confirmations and manual pause points. Use for automated workflows or repeated execution patterns.

Available in: `/plan`, `/implement`, `/next`, `/feature`, `/epic`

Flags can be combined: `/plan --auto --deep FEAT-007`

#### `--deep` — Agent-Powered Mode
Spawn specialized research agents for thorough analysis. Without this flag, commands use direct tools (Glob, Grep, Read, WebSearch) — faster and cheaper.

Available in: `/idea`, `/epic`, `/feature`, `/research`, `/plan`, `/implement`, `/debug`

When to use: complex features touching multiple modules, introducing new dependencies, or requiring deep codebase tracing.

#### `--fresh` — Start from Scratch
Delete any existing checkpoint file and restart the command from the beginning. Useful when prior progress is stale or the context has changed.

Available in: `/feature`, `/plan`, `/implement`, `/debug`

### Command-Specific Options

#### `/init`
- `--hub` — initialize as a hub repository (product brain)
- `--service` — initialize as a service repository (implementation)
- `--from=../path` — bootstrap from another repo's stack.md
- `--minimal` — create structure only, skip the interview

#### `/feature`
- `--epic=EPIC-NNN` — create feature driven by a hub epic
- `--ticket=PROJ-123` — pull context from an external tracker ticket
- `--deep` — spawn agents for research (default: direct tools)

#### `/epic`
- `--deep` — spawn product-owner and architect agents (default: direct analysis)

#### `/research`
- `--scope=market|technical|codebase` — limit research to a specific domain
- `--deep` — spawn specialized research agents (default: direct WebSearch/Grep/Read)

#### `/contracts`
- `extract <source>` — extract contracts from SPEC.md or feature spec
- `validate` — check all contract files for completeness
- `sync` — compare contracts against implementation, flag drift
- `list` — show all defined contracts and their status
- `--format=json|go|typescript|proto` — output format (default: JSON Schema)
- `--hub` — also check hub decisions for cross-team contracts

#### `/plan`
- `--auto` — skip confirmations, auto-approve the plan
- `--deep` — spawn agents for architectural gate and codebase analysis
- `--story=S-003` — plan a specific story instead of full feature

#### `/implement`
- `--auto` — skip manual pause/confirmation points (still runs all automated verification)
- `--deep` — allow agent spawning when plan doesn't provide enough context
- `--phase=N` — resume from a specific phase after a session break
- `--story=S-005` — implement a specific story

#### `/next`
- `--auto` — automatically pick highest-priority item, skip all prompts
- `--feature=FEAT-NNN` — pick up an entire story group (see Story Groups)
- `--current` — advance to next story on the current branch (for sequential group work)
- `--group=N` — pick a specific group number when using `--feature`
- Can also specify: story ID (`/next S-005`), service (`/next backend`), or feature (`/next FEAT-003`)

#### `/pr`
- `--draft` — create a draft PR
- `--manual` — ask for confirmation before committing/submitting
- `--no-commit` — skip auto-committing pending changes
- `--rebase` — rebase onto latest target branch
- `--base=develop` — target specific base branch

#### `/debug`
- `--deep` — spawn codebase agents for parallel investigation
- `--fresh` — delete existing checkpoint, start investigation from scratch
- Can specify: bug ID (`/debug BUG-003`), file path, or symptom description

#### `/check`
- `--plan` — focus questions on architectural decisions
- `--pr` — focus questions on implementation patterns
- `--verbose` — study mode showing key concepts as hints before answering
- Can specify: feature ID (`/check FEAT-007`) or plan path

#### `/decisions`
- `--verbose` — include short code examples from the source files
- `--diff` — show which conventions are customized vs still using template defaults
- Can specify: topic (`/decisions testing`), language (`/decisions go`), layer (`/decisions service`), or concept (`/decisions mockery`)

#### `/docs`
- `--update <path>` — update an existing doc to match current codebase state

### Examples with Flags

```bash
# Autonomous feature workflow
/feature --auto --deep Add user authentication
/plan --auto --deep FEAT-001
/next --auto
# In worktree:
/implement --auto --deep

# Multi-story sequential workflow
/next --feature=FEAT-005              # lock group, create branch
# In worktree:
/implement                            # first story
/next --current                       # advance to second story
/implement                            # second story
/pr                                   # ship all stories

# Epic-driven feature with lightweight research
/epic Add multilingual support        # in hub, no --deep for speed
/feature --epic=EPIC-001              # in service, reads epic constraints

# Resume interrupted implementation
/implement --phase=3                  # pick up where you left off

# Knowledge check
/check --verbose                      # study mode with hints
/check --plan FEAT-007                # quiz on specific feature's architecture
```

## Agents

All 8 agents are read-only sub-agents. They analyze and recommend — they never write code or make final decisions. Commands spawn them with the `--deep` flag.

| Agent | Model | Purpose |
|-------|-------|---------|
| `product-owner` | opus | Market analysis, user research, risk assessment, value calculation |
| `software-architect` | opus | Architectural recommendations, TBD dependency gatekeeper |
| `web-researcher` | sonnet | External research (competitors, market, user sentiment, trends) |
| `codebase-locator` | sonnet | Find relevant files by feature area or concern |
| `codebase-analyzer` | sonnet | Trace data flow, dependencies, implementation patterns |
| `pattern-finder` | sonnet | Find existing code patterns as references for new work |
| `docs-locator` | sonnet | Find relevant docs, plans, decisions by topic or keyword |
| `security-reviewer` | sonnet | Review code for security vulnerabilities and risks |

Without `--deep`, commands use direct tools (Glob, Grep, Read, WebSearch) instead of spawning agents. This is faster and cheaper — use `--deep` only when the analysis requires cross-module tracing or external research.

## Skills

Skills are domain-specific coding standards loaded by implementation commands. They establish conventions for each layer of the codebase.

### Two-Layer Skill System

Skills work in two layers:

**Layer 1 — Generic domain skills** (included in this library): `api-design`, `ui-design`, `data-layer`, `service-layer`, `git-practices`. These contain framework-agnostic conventions with `<!-- CUSTOMIZE -->` markers for project-specific details.

**Layer 2 — Stack-specific skills** (you create these): Skills matched via `stack:` frontmatter against your `stack.md`. For example, a `go-gin` skill with `stack: go, gin` would be auto-loaded alongside `api-design` when implementing API endpoints in a Go/Gin project.

The `/implement` command reads `stack.md` to identify your frameworks, then loads matching skills from `.claude/skills/`. Generic skills provide the baseline; stack-specific skills add concrete patterns for your exact stack.

### Skill Reference

| Skill | Purpose | When Loaded |
|-------|---------|-------------|
| `git-practices` | Branch naming, commit format, PR format, worktree conventions, backlog lock protocol | `/commit`, `/pr`, `/next`, `/worktree` |
| `api-design` | API endpoint structure, validation, status codes, response format, auth/authz | Implementing routes, controllers, API code |
| `ui-design` | Component structure, hooks, styling, state management, accessibility | Implementing frontend components |
| `data-layer` | Schema design, migrations, models, queries, ORM patterns, indexes | Implementing database code |
| `service-layer` | Business logic organization, domain rules, orchestration, transactions | Implementing services and use cases |
| `checkpoints` | Protocol for saving and resuming multi-phase commands | `/implement`, `/debug`, `/feature`, `/plan`, `/epic` |
| `knowledge-check` | Developer understanding validation: question generation, evaluation, tutoring | `/plan`, `/pr`, `/check` |
| `go-practices` | Go-specific: unexported struct/exported constructor pattern, mockery, project layout | Implementing `.go` files (auto-matched via `stack: go`) |
| `backlog` | Abstract interface defining all backlog operations (list, get, start, complete, lock, sync) | All commands that read or update the backlog |
| `backlog-local` | Backlog implementation using `docs/backlog.md` bracket markers and `docs/backlog.lock` | When `stack.md` has `backlog: local` (default) |
| `backlog-external` | Backlog implementation using external services with local lock files and `docs/backlog-index.md` | When `stack.md` has `backlog: external` |

### Where to Put Architectural Conventions

Not all coding knowledge goes in the same place. Here's how to decide:

**Generic skills** (e.g., `service-layer`, `api-design`) — for universal architectural principles that apply regardless of language or framework. Examples: "all dependencies must be interfaces," "services own transaction boundaries," "business rules must be independently testable." These skills ship with the template and have `<!-- CUSTOMIZE -->` markers where you fill in language-specific details.

**Stack-specific skills** (e.g., `go-gin`, `react-nextjs`) — for concrete patterns tied to your stack. Examples: "use mockery to generate mocks from interfaces," "define interfaces in the same package as the consumer," "use Gin's `ShouldBindJSON` for request validation." Create these with `stack:` frontmatter so they auto-load alongside generic skills during `/implement`.

**`CLAUDE.md`** — for short, project-wide behavioral directives that don't fit in a skill. Examples: "always run `make lint` before committing," "this repo uses a monorepo structure," "never import from `internal/legacy`." Keep this file lean — if a rule needs examples or explanation, it belongs in a skill.

**`stack.md`** — for factual stack definitions, not conventions. What framework, what ORM, what test runner — not how to use them.

The general rule: if it's a *principle*, it goes in a generic skill. If it's a *pattern with code examples*, it goes in a stack-specific skill. If it's a *one-liner rule*, it goes in `CLAUDE.md`.

### Customizing Skills

Two approaches:

1. **Edit in place** — Modify the generic skills with your project-specific conventions. Good for single-project use.
2. **Keep generic + add stack skills** — Leave generic skills as templates. Create stack-specific skills (e.g., `go-gin/SKILL.md`, `react-nextjs/SKILL.md`) with `stack:` frontmatter for auto-matching. Good if you share the library across projects with different stacks.

## Key Design Principles

**Vertical slicing.** Every story delivers one complete user-facing capability through all layers (data model → logic → API → UI). Never "all migrations first, then all services." After the first story, something must be testable or demoable. `/feature` Phase 4 forces a conversation about incremental delivery before stories are written, and `/plan` organizes phases by capability, not by layer.

**Deliberate pipeline.** Every command produces a specific artifact and stops. No command jumps ahead. `/feature` writes specs, never code. `/plan` writes plans, never code. Only `/implement` writes code.

**YAGNI enforcement.** The product owner agent and YAGNI checks in `/feature` challenge every "what if." Three lines of duplicated code beats a premature abstraction.

**Architect as gatekeeper.** The software architect agent runs a dependency check before any plan is written. If `stack.md` has TBD items the feature needs, planning halts until you decide.

**TBD is valid.** During `/init`, mark unknowns as TBD. Don't agonize over decisions you don't need yet. The architect will catch them at the right time.

**Documents as the source of truth.** Epics, features, plans, and decisions are markdown files in `docs/`. They're versioned in git, referenced by frontmatter IDs, and read by commands for context.

**Worktree isolation.** Each ticket gets its own worktree. Parallel work is possible. The backlog lock prevents conflicts. The main branch stays clean.

**Lock on main, status on branch.** Coordination (locks) happens on main so all worktrees see it. Reality tracking (backlog status) happens on the feature branch so it merges with the code.

**Mandatory pattern sweep.** Bug investigations must scan the entire codebase for all instances of the root cause pattern. A bug report that only covers one location is incomplete.

**Knowledge as a process.** The knowledge check system ensures developers understand AI-generated decisions, not just execute them. It teaches through the process of asking and explaining.

**Founder input, not just founder approval.** Every major phase in `/feature` ends with an open-ended checkpoint: "Anything I should know that I haven't asked about?" This gives the founder a structured place to add business constraints, user insights, technical preferences, or context the AI couldn't infer from the codebase. Founder observations are captured in a "Founder Context" section in the spec so they persist into planning and implementation.

**Founder decides.** Agents recommend, the founder chooses. Every agent presents reasoning and options. No agent makes final calls.

## Document Outputs by Command

Each command produces artifacts stored in the project's `docs/` directory:

**Hub repos:** `/idea` → `docs/features/`, `/epic` → `docs/epics/` + `docs/decisions/`, `/research` → `docs/research/`, `/init` → `stack.md` + `docs/backlog.md`

**Service repos:** `/feature` → `docs/features/` + `docs/backlog.md`, `/plan` → `docs/plans/`, `/implement` → code + `docs/backlog.md`, `/pr` → `docs/backlog.md`, `/bug` → `docs/bugs/`, `/debug` → `docs/bugs/` (updated), `/check` → `docs/knowledge-checks/`, `/next` → `docs/backlog.lock` + `docs/backlog.md`
