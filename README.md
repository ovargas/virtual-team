# Claude Code Virtual Team

A Claude Code plugin that turns Claude Code into a virtual development team. It provides a deliberate pipeline from idea to shipped code — with agents, commands, and skills that enforce TDD, contract-first development, and quality gates at every step.

## Getting Started

### 1. Install the plugin

In a Claude Code session, run:

```
/plugin marketplace add ovargas/virtual-team
/plugin install virtual-team@virtual-team-marketplace
```

### 2. Initialize your project

Start a Claude Code session and run:

```
/virtual-team:vt-start
```

This walks you through an interactive interview to define your tech stack, project structure, and conventions. It creates `stack.md` (the source of truth for your project) and sets up the `docs/` directory structure.

Anything you haven't decided yet gets marked as TBD — the architect agent will catch it later when a feature actually needs it.

> **Working on multiple repositories?** You can create a hub repo to coordinate across services — shared decisions, epics, and API contracts in one place. Run `/virtual-team:vt-start --hub` in a new repo to set it up. See the [command reference](docs/command-reference.md#multi-repo-setup) for details.

### 3. Start building

You only need **5 commands** for daily work:

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-status` | Start your day — shows what's in progress, what's next |
| `/virtual-team:vt-flow <description>` | Build a feature end-to-end (spec → plan → code → review → PR) |
| `/virtual-team:vt-flow --fix <description>` | Fix a bug end-to-end (report → investigate → fix → review → PR) |
| `/virtual-team:vt-commit` | Create a clean, atomic commit |
| `/virtual-team:vt-handoff` | End a session — captures state for the next one |

That's it. Everything else is optional.

## Daily Workflow

### Start your day

```
/virtual-team:vt-status
```

Shows what's in progress, what's blocked, and suggests the right command to run next.

### Build a feature

```
/virtual-team:vt-flow Add password reset via email
```

This runs the full pipeline in one session:

```
/vt-feature → /vt-contracts → /vt-plan → /vt-implement → /vt-review + /vt-validate → /vt-pr
```

Interactive gates between each step resolve decisions and TBDs without leaving the session. If the session is interrupted, just run `/virtual-team:vt-flow` again — it auto-detects where you left off.

### Fix a bug

```
/virtual-team:vt-flow --fix "users can't log in after password reset"
```

Runs the bug fix pipeline with a mandatory pattern sweep to catch all occurrences:

```
/vt-bug → /vt-debug → fix → /vt-review + /vt-validate → /vt-pr
```

### Common variations

```bash
/virtual-team:vt-flow --deep Add search capability        # agent-powered analysis (thorough)
/virtual-team:vt-flow --auto Add simple utility           # minimal gates, stops only on failures
/virtual-team:vt-flow --to=plan Add notifications         # stop after planning
/virtual-team:vt-flow --from=implement                     # resume from implementation
/virtual-team:vt-flow --fix BUG-003                       # bug already documented, start at debug
/virtual-team:vt-flow --fix --quick "typo in header"      # skip bug report, go straight to debug
```

---

## Want More Control?

`/vt-flow` chains the pipeline automatically. You can run each step individually when you want to pause, review, or iterate between steps.

### The Pipeline Steps

These are the commands that `/vt-flow` runs under the hood. Use them directly when you want granular control:

```
/vt-feature → /vt-contracts → /vt-plan → /vt-implement → /vt-review + /vt-validate → /vt-pr
```

| Step | Command | What it produces |
|------|---------|-----------------|
| **Spec** | `/virtual-team:vt-feature Add password reset` | Feature spec with acceptance criteria + backlog stories |
| **Contracts** | `/virtual-team:vt-contracts extract docs/features/...` | API schemas in `contracts/` — locks down payload shapes before code |
| **Plan** | `/virtual-team:vt-plan FEAT-001` | Phased implementation plan with file references and patterns |
| **Build** | `/virtual-team:vt-implement FEAT-001` | Working code — picks up stories, executes plan, runs TDD |
| **Review** | `/virtual-team:vt-review` | Code review (quality + security + domain) against the diff |
| **Validate** | `/virtual-team:vt-validate FEAT-001` | Gap analysis — compares spec requirements vs actual implementation |
| **Ship** | `/virtual-team:vt-pr` | PR with summary, testing notes, and backlog updates |

#### Example: manual step-by-step

```bash
/virtual-team:vt-feature Add password reset via email     # spec + stories
/virtual-team:vt-contracts extract docs/features/...      # lock down API shapes
/virtual-team:vt-plan FEAT-001                            # technical plan
/virtual-team:vt-implement FEAT-001                       # write code (TDD enforced)
/virtual-team:vt-review                                   # code review
/virtual-team:vt-validate FEAT-001                        # spec coverage check
/virtual-team:vt-commit                                   # atomic commit
/virtual-team:vt-pr                                       # create PR
```

### Pipeline Flags

These flags work with both `/vt-flow` and the individual pipeline commands:

| Flag | Effect | Available in |
|------|--------|-------------|
| `--deep` | Spawn specialized agents for thorough analysis | `/vt-feature`, `/vt-plan`, `/vt-implement`, `/vt-debug`, `/vt-flow` |
| `--auto` | Skip confirmations, stop only on failures | `/vt-feature`, `/vt-plan`, `/vt-implement`, `/vt-flow` |
| `--sdd` | Subagent-driven development — parallel implementation | `/vt-implement` |
| `--fresh` | Delete checkpoint, start from scratch | `/vt-feature`, `/vt-plan`, `/vt-implement`, `/vt-debug`, `/vt-flow` |
| `--phase=N` | Resume from a specific phase | `/vt-implement` |

---

## Support Commands

These commands complement the pipeline. They're grouped by when you'd reach for them.

### Discovery and Research

Use these **before** the pipeline — when you're still exploring what to build.

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-idea Build a task management app` | Structured interview to capture a product concept. Spawns product-owner agent for market/risk analysis with `--deep`. |
| `/virtual-team:vt-research WebSocket libraries for Go` | Deep-dive research (market, technical, or codebase). Produces a sourced research document. |
| `/virtual-team:vt-proposal FEAT-001` | Business proposal with scope, timeline, and cost estimates. |
| `/virtual-team:vt-epic Add multilingual support` | Cross-team initiative for multi-repo products. Defines shared agreements and routes work across repos. Requires a [hub repo](docs/command-reference.md#multi-repo-setup). |

### Bug Investigation

Use these to investigate bugs independently of `/vt-flow --fix`.

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-bug Users can't reset password` | Document a bug report with reproduction steps and severity. |
| `/virtual-team:vt-debug BUG-003` | Investigate: reproduce → trace → root cause → **mandatory pattern sweep** across the entire codebase. |

### Quality and Review

Use these **after** implementation — to verify and improve.

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-review` | Code review of staged/recent changes (quality + security + domain). |
| `/virtual-team:vt-validate FEAT-001` | Compare spec vs implementation — finds gaps, deviations, scope creep. |
| `/virtual-team:vt-tech-review` | Architecture health check — debt, patterns, dependencies, risks. |
| `/virtual-team:vt-check` | Quiz yourself on technical decisions in the current work. |
| `/virtual-team:vt-decisions testing` | Quick lookup: "what did we decide about X?" with source references. |

### Git and Delivery

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-commit` | Clean, atomic commit following project conventions. |
| `/virtual-team:vt-pr` | Create PR with summary, testing notes, and backlog updates. Supports `--draft`, `--rebase`, `--base=develop`. |
| `/virtual-team:vt-worktree` | Create, remove, or clean up git worktrees. |

### Session and Project Management

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-status` | Morning standup — project state, backlog health, what to work on next. |
| `/virtual-team:vt-handoff` | End a session cleanly — captures exact state for the next session. |
| `/virtual-team:vt-refine docs/features/...` | Iterate on an existing spec, plan, or document with new context. |
| `/virtual-team:vt-docs` | Generate project documentation — setup guides, config references, runbooks. |

### Maintenance

| Command | What it does |
|---------|-------------|
| `/virtual-team:vt-start` | Initialize or re-initialize project structure and `stack.md`. |
| `/virtual-team:vt-update-workflow` | Pull latest commands, skills, and agents from the template repo. |

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
| `product-owner` | Market analysis, YAGNI checks | `/vt-idea`, `/vt-feature`, `/vt-epic` |
| `software-architect` | Architecture decisions, dependency gatekeeper | `/vt-plan`, `/vt-epic` |
| `security-reviewer` | Security vulnerability scanning | `/vt-review` |
| `pattern-finder` | Find existing code patterns as templates | `/vt-plan`, `/vt-implement` |
| `codebase-analyzer` | Trace data flow and system behavior | `/vt-debug`, `/vt-plan` |
| `codebase-locator` | Find relevant files by area/concern | `/vt-feature`, `/vt-plan` |
| `docs-locator` | Find docs, plans, decisions by topic | `/vt-feature`, `/vt-plan` |
| `web-researcher` | External research with source attribution | `/vt-research`, `/vt-idea` |

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
