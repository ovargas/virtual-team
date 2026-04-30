# Hub Repository

This is a **hub repository** — the product brain. It holds epics, cross-team decisions, and coordinates service repos. No application code lives here.

## How This Repo Works

The hub captures WHAT to build and WHY. Service repos figure out HOW. Work flows like this:

```
/virtual-team:idea → /virtual-team:epic --idea=IDEA-NNN (repeat until all MVP items covered) → service repos run /virtual-team:feature --epic=EPIC-NNN → /virtual-team:plan → /virtual-team:implement → /virtual-team:review + /virtual-team:validate  → /vt-pr
```

For bug fixes, service repos use `/virtual-team:flow --fix` which runs a compressed pipeline: `/vt-bug` → `/vt-debug` → implement fix → `/vt-review` + `/vt-validate` → `/vt-pr`.

An idea's MVP scope usually requires multiple epics. Run `/virtual-team:epic --idea=IDEA-NNN` repeatedly — each run reads the idea, checks which MVP items already have epics, and proposes the next one. The idea status tracks progress: `draft` → `active` (first epic) → `fulfilled` (all items covered).

The hub's job is done when an epic is documented and agreements are written. Each service repo takes it from there independently.

## Key Files

- **`stack.md`** — Product definition and teams registry. Read this first on every session. It lists all service repos with their roles, responsibilities, and stack summaries.
- **`docs/epics/`** — Product-level initiatives. Each epic describes what to build, which repos are affected, and links to cross-team agreements.
- **`docs/decisions/`** — Cross-team agreements (API contracts, conventions, data formats) and architectural decision records. These are binding — service repos treat them as constraints.
- **`docs/research/`** — Research outputs from `/vt-idea` and `/vt-epic` deep research phases.
- **`docs/backlog.md`** — Product backlog: Active, Next, Inbox.
- **`docs/checkpoints/`** — Progress checkpoints for long-running commands. Auto-created during execution, auto-deleted on completion.

## Agents

Eight specialized agents live in `agents/`. They are read-only sub-agents spawned by commands — they analyze and recommend, they don't write code or make final decisions. The founder decides.

| Agent | Role | When Used |
|---|---|---|
| **product-owner** | Product analysis — market, users, risk, value | `/vt-idea` (deep), `/vt-epic` (medium) |
| **software-architect** | Technical routing and dependency gatekeeper | `/vt-epic` (routing), `/vt-plan` (gate) |
| **web-researcher** | External research — market, competitors, users | `/vt-idea`, `/vt-epic`, `/vt-research` |
| **codebase-locator** | Finds files by area or concern | `/vt-feature`, `/vt-plan` |
| **codebase-analyzer** | Traces data flow and system behavior | `/vt-plan`, `/vt-implement` |
| **pattern-finder** | Finds existing implementation patterns | `/vt-plan`, `/vt-feature` |
| **docs-locator** | Finds relevant docs, plans, decisions | `/vt-feature`, `/vt-plan` |
| **security-reviewer** | Reviews code for security concerns | `/vt-review`, `/vt-tech-review` |

## Quick Start

Most of the time, you only need three commands:
- **`/virtual-team:idea <concept>`** — capture and shape a new product concept
- **`/virtual-team:epic --idea=IDEA-NNN`** — break an idea into epics for service repos
- **`/vt-status`** — see what's happening and what to do next

Everything else is available when you need it. See the full command reference below.

## Commands

Commands are the workflow. Each one has a specific job and a hard boundary: pre-implementation commands produce documents, never code.

### Product Discovery
- `/vt-idea` — Capture and shape a new product concept through structured interview
- `/vt-research` — Deep-dive research on a specific topic
- `/vt-proposal` — Business proposal from an idea or feature — scope, timeline, infrastructure, costs

### Epic & Feature Flow
- `/vt-epic` — Define a product initiative, identify affected repos, create cross-team agreements. Use `--idea=IDEA-NNN` to create epics from MVP items (tracks coverage, updates idea status)
- `/vt-feature` — Spec out a feature (can be hub-level or driven by an epic)

### Planning & Implementation (for service repos)
- `/vt-plan` — Create a technical implementation plan from a feature spec
- `/vt-implement` — Execute the plan phase by phase, accepts FEAT/BUG ID as argument

### Code Lifecycle
- `/vt-commit` — Stage and commit following git conventions (auto by default)
- `/vt-pr` — Auto-commits, creates PR, releases backlog lock (auto by default)
- `/vt-worktree` — Manage git worktrees (create, remove, list, clean)

### Quality & Maintenance
- `/vt-check` — Knowledge check: quiz the developer on technical decisions in the current work. Auto-triggers in `/vt-plan` and `/vt-pr` based on `~/.claude/settings.json` `knowledgeCheck` setting.
- `/vt-validate` — Compare feature spec against implementation — gap report. Use `--remediate` to create stories from gaps.
- `/vt-review` — Code review
- `/vt-tech-review` — Technical review of architecture or approach
- `/vt-refine` — Iterate on an existing document
- `/vt-bug` — Document a bug report
- `/vt-debug` — Investigate and diagnose an issue
- `/vt-docs` — Generate project documentation
- `/vt-status` — Show project status (detects `[=]` items pending PR)
- `/vt-handoff` — Create a session handoff note for continuity

### Project Knowledge
- `/vt-decisions` — Query project conventions and design patterns. `/virtual-team:decisions branching`, `/virtual-team:decisions api error handling`. Use `--verbose` for code examples.

### Setup & Sync
- `/virtual-team:start` — Initialize a new project with stack definition and structure
- `/vt-update-workflow` — Update generic workflow files (commands, agents, skills) from the template repo

## Skills

Skills are domain-specific standards loaded by implementation commands. In the hub, they're mostly relevant for git operations:

- **git-practices** — Branch naming (`<type>/<ticket-id>`), commit format, PR format, worktree conventions. Loaded by `/vt-commit`, `/vt-pr`, `/vt-worktree`.
- **knowledge-check** — Protocol for validating developer understanding of AI-generated decisions. Loaded by `/vt-plan` (after approval), `/vt-pr` (before submission), and standalone `/vt-check`. Trigger controlled by `~/.claude/settings.json` `knowledgeCheck` setting (`"on"`, `"strict"`, or `"off"`).

Domain and stack skills are project-provided — each service repo defines its own conventions. They're loaded by `/vt-implement` based on `domain` and `stack` frontmatter fields.

## Behavioral Expectations

1. **No code in the hub.** This repo produces documents: epics, decisions, research, backlogs. If you're tempted to write application code here, stop.
2. **YAGNI.** Don't spec features that solve hypothetical problems. Challenge every "what if."
3. **Founder decides.** Agents recommend, the founder chooses. Present reasoning clearly so they can agree or override.
4. **One question at a time.** Don't overwhelm with question barrages. Walk through things conversationally.
5. **TBD is valid.** If something hasn't been decided, mark it TBD. The software-architect will catch it when it matters.
6. **Decisions are documents.** Every non-obvious choice gets a decision record with id, date, status, and optional epic/type/repos frontmatter. Agreements between repos are separate decision documents, not inline in epics.
7. **Teams registry is the routing table.** When identifying which repos are affected by an epic, read the teams section of `stack.md` — it has each repo's role, responsibility, and stack.

## Multi-Repo Context

This hub coordinates service repos. Each service repo:
- Has its own `stack.md` with a `Hub` reference pointing back here
- Runs `/virtual-team:feature --epic=EPIC-NNN` to break down epics into repo-specific work
- Reads decisions from this hub's `docs/decisions/` as constraints
- Has its own backlog, plans, and implementation cycle
- Is autonomous — the hub doesn't dictate HOW to build, only WHAT and the cross-team contracts
