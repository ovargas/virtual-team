# Claude Code Virtual Team

A Claude Code plugin that turns Claude Code into a virtual development team. It provides a deliberate pipeline from idea to shipped code — with agents, commands, and skills that enforce TDD, contract-first development, and quality gates at every step.

## Getting Started

### 1. Install the plugin

In a Claude Code session, run:

```
/plugin marketplace add ovargas/virtual-team-marketplace
/plugin install virtual-team@virtual-team-marketplace
```

### 2. Initialize your project

Start a Claude Code session and run:

```
/virtual-team:start
```

This walks you through an interactive interview to define your tech stack, project structure, and conventions. It creates `stack.md` (the source of truth for your project) and sets up the `docs/` directory structure.

Anything you haven't decided yet gets marked as TBD — the architect agent will catch it later when a feature actually needs it.

> **Working on multiple repositories?** You can create a hub repo to coordinate across services — shared decisions, epics, and API contracts in one place. Run `/virtual-team:start --hub` in a new repo to set it up. See the [command reference](docs/command-reference.md#multi-repo-setup) for details.

### 3. Start building

You only need **5 commands** for daily work:

| Command | What it does |
|---------|-------------|
| `/virtual-team:status` | Start your day — shows what's in progress, what's next |
| `/virtual-team:flow <description>` | Build a feature end-to-end (spec → plan → code → review → PR) |
| `/virtual-team:flow --fix <description>` | Fix a bug end-to-end (report → investigate → fix → review → PR) |
| `/virtual-team:commit` | Create a clean, atomic commit |
| `/virtual-team:handoff` | End a session — captures state for the next one |

That's it. Everything else is optional.

## Daily Workflow

### Start your day

```
/virtual-team:status
```

Shows what's in progress, what's blocked, and suggests the right command to run next.

### Build a feature

```
/virtual-team:flow Add password reset via email
```

This runs the full pipeline in one session:

```
/feature → /contracts → /plan → /implement → /review + /validate → /pr
```

Interactive gates between each step resolve decisions and TBDs without leaving the session. If the session is interrupted, just run `/virtual-team:flow` again — it auto-detects where you left off.

### Fix a bug

```
/virtual-team:flow --fix "users can't log in after password reset"
```

Runs the bug fix pipeline with a mandatory pattern sweep to catch all occurrences:

```
/bug → /debug → fix → /review + /validate → /pr
```

### Common variations

```bash
/virtual-team:flow --deep Add search capability        # agent-powered analysis (thorough)
/virtual-team:flow --auto Add simple utility           # minimal gates, stops only on failures
/virtual-team:flow --to=plan Add notifications         # stop after planning
/virtual-team:flow --from=implement                     # resume from implementation
/virtual-team:flow --fix BUG-003                       # bug already documented, start at debug
/virtual-team:flow --fix --quick "typo in header"      # skip bug report, go straight to debug
```

---

## Want More Control?

`/flow` chains the pipeline automatically. You can run each step individually when you want to pause, review, or iterate between steps.

### The Pipeline Steps

These are the commands that `/flow` runs under the hood. Use them directly when you want granular control:

```
/feature → /contracts → /plan → /implement → /review + /validate → /pr
```

| Step | Command | What it produces |
|------|---------|-----------------|
| **Spec** | `/virtual-team:feature Add password reset` | Feature spec with acceptance criteria + backlog stories |
| **Contracts** | `/virtual-team:contracts extract docs/features/...` | API schemas in `contracts/` — locks down payload shapes before code |
| **Plan** | `/virtual-team:plan FEAT-001` | Phased implementation plan with file references and patterns |
| **Build** | `/virtual-team:implement FEAT-001` | Working code — picks up stories, executes plan, runs TDD |
| **Review** | `/virtual-team:review` | Code review (quality + security + domain) against the diff |
| **Validate** | `/virtual-team:validate FEAT-001` | Gap analysis — compares spec requirements vs actual implementation |
| **Ship** | `/virtual-team:pr` | PR with summary, testing notes, and backlog updates |

#### Example: manual step-by-step

```bash
/virtual-team:feature Add password reset via email     # spec + stories
/virtual-team:contracts extract docs/features/...      # lock down API shapes
/virtual-team:plan FEAT-001                            # technical plan
/virtual-team:implement FEAT-001                       # write code (TDD enforced)
/virtual-team:review                                   # code review
/virtual-team:validate FEAT-001                        # spec coverage check
/virtual-team:commit                                   # atomic commit
/virtual-team:pr                                       # create PR
```

### Pipeline Flags

These flags work with both `/flow` and the individual pipeline commands:

| Flag | Effect | Available in |
|------|--------|-------------|
| `--deep` | Spawn specialized agents for thorough analysis | `/feature`, `/plan`, `/implement`, `/debug`, `/flow` |
| `--auto` | Skip confirmations, stop only on failures | `/feature`, `/plan`, `/implement`, `/flow` |
| `--sdd` | Subagent-driven development — parallel implementation | `/implement`, `/flow` |
| `--fresh` | Delete checkpoint, start from scratch | `/feature`, `/plan`, `/implement`, `/debug`, `/flow` |
| `--phase=N` | Resume from a specific phase | `/implement` |

---

## Support Commands

These commands complement the pipeline. They're grouped by when you'd reach for them.

### Discovery and Research

Use these **before** the pipeline — when you're still exploring what to build.

| Command | What it does |
|---------|-------------|
| `/virtual-team:idea Build a task management app` | Structured interview to capture a product concept. Spawns product-owner agent for market/risk analysis with `--deep`. |
| `/virtual-team:research WebSocket libraries for Go` | Deep-dive research (market, technical, or codebase). Produces a sourced research document. |
| `/virtual-team:proposal FEAT-001` | Business proposal with scope, timeline, and cost estimates. |
| `/virtual-team:epic Add multilingual support` | Cross-team initiative for multi-repo products. Defines shared agreements and routes work across repos. Requires a [hub repo](docs/command-reference.md#multi-repo-setup). |

### Bug Investigation

Use these to investigate bugs independently of `/flow --fix`.

| Command | What it does |
|---------|-------------|
| `/virtual-team:bug Users can't reset password` | Document a bug report with reproduction steps and severity. |
| `/virtual-team:debug BUG-003` | Investigate: reproduce → trace → root cause → **mandatory pattern sweep** across the entire codebase. |

### Quality and Review

Use these **after** implementation — to verify and improve.

| Command | What it does |
|---------|-------------|
| `/virtual-team:review` | Code review of staged/recent changes (quality + security + domain). |
| `/virtual-team:validate FEAT-001` | Compare spec vs implementation — finds gaps, deviations, scope creep. |
| `/virtual-team:tech-review` | Architecture health check — debt, patterns, dependencies, risks. |
| `/virtual-team:check` | Quiz yourself on technical decisions in the current work. |
| `/virtual-team:decisions testing` | Quick lookup: "what did we decide about X?" with source references. |

### Git and Delivery

| Command | What it does |
|---------|-------------|
| `/virtual-team:commit` | Clean, atomic commit following project conventions. |
| `/virtual-team:pr` | Create PR with summary, testing notes, and backlog updates. Supports `--draft`, `--rebase`, `--base=develop`. |
| `/virtual-team:worktree` | Create, remove, or clean up git worktrees. |

### Session and Project Management

| Command | What it does |
|---------|-------------|
| `/virtual-team:status` | Morning standup — project state, backlog health, what to work on next. |
| `/virtual-team:handoff` | End a session cleanly — captures exact state for the next session. |
| `/virtual-team:refine docs/features/...` | Iterate on an existing spec, plan, or document with new context. |
| `/virtual-team:docs` | Generate project documentation — setup guides, config references, runbooks. |

### Maintenance

| Command | What it does |
|---------|-------------|
| `/virtual-team:start` | Initialize or re-initialize project structure and `stack.md`. |
| `/virtual-team:update-workflow` | Pull latest commands, skills, and agents from the template repo. |

---

## How It Works

### Skills (coding standards)

Skills are domain-specific coding standards that load automatically based on what you're working on:

- **Behavioral skills** (always active): TDD enforcement, verification-before-completion, code review reception
- **Domain skills** (loaded by context): API design, UI design, data layer, service layer
- **Stack skills** (you create these): Project-specific patterns matched via `stack.md`

### Agents (specialized sub-agents)

8 read-only agents that analyze and recommend — they never write code:

| Agent | Role | Spawned by |
|-------|------|-----------|
| `product-owner` | Market analysis, YAGNI checks | `/idea`, `/feature`, `/epic` |
| `software-architect` | Architecture decisions, dependency gatekeeper | `/plan`, `/epic` |
| `security-reviewer` | Security vulnerability scanning | `/review` |
| `pattern-finder` | Find existing code patterns as templates | `/plan`, `/implement` |
| `codebase-analyzer` | Trace data flow and system behavior | `/debug`, `/plan` |
| `codebase-locator` | Find relevant files by area/concern | `/feature`, `/plan` |
| `docs-locator` | Find docs, plans, decisions by topic | `/feature`, `/plan` |
| `web-researcher` | External research with source attribution | `/research`, `/idea` |

Agents are spawned with the `--deep` flag. Without it, commands use direct tools (faster, cheaper).

### Hooks (automatic enforcement)

Two hooks run automatically — no setup needed:

- **SessionStart**: Loads skill-awareness so behavioral skills activate based on context
- **PreToolUse** (on Edit/Write): Checks TDD discipline and verification discipline before code changes

---

## Further Reading

- **[Command Reference](docs/command-reference.md)** — Full flag reference, story groups, knowledge checks, backlog lifecycle, multi-repo setup, skill customization, and design principles
- **[Workflow Review](docs/workflow-review-report.md)** — Independent assessment of the plugin's strengths, friction points, and token efficiency

## File Structure

```
commands/       — 26 workflow commands (slash commands)
skills/         — 15 coding standards (domain, behavioral, backlog)
agents/         — 8 specialized sub-agents (read-only)
hooks/          — Automatic enforcement (SessionStart, PreToolUse)
examples/       — CLAUDE.md templates for hub and service repos
tests/          — Structural validation (frontmatter, references)
```
