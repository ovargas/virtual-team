# Codex host adaptation

The files under `commands/` are the canonical Virtual Team workflow specifications. They use Claude Code command names because Claude slash commands remain a supported installation surface. When a Codex skill loads one of those specifications, translate only the host mechanics described below.

## Invocation

- Treat a Claude `virtual-team:<name>` slash-command invocation as the corresponding `virtual-team:workflow-<name>` Codex skill with the same arguments.
- When one workflow invokes another, read and execute `commands/<name>.md` inline unless independent delegation materially helps.
- Preserve flags such as `--deep`, `--auto`, `--from`, `--to`, and `--fix` as workflow inputs rather than shell flags.

## Tools

- Translate `Read`, `Glob`, and `Grep` to Codex filesystem inspection, preferring `rg` and `rg --files` for searches.
- Translate `Edit` and `Write` to Codex file-editing capabilities and preserve existing user changes.
- Translate `Bash` to scoped terminal commands under the active repository sandbox.
- Translate `WebSearch` and `WebFetch` to Codex web access and cite sources when external research is used.
- Translate `AskUserQuestion` to a concise user question only when a consequential choice cannot be inferred safely.
- Translate plan-mode instructions to a tracked implementation plan when the Codex environment exposes one; otherwise maintain the same phases explicitly.

## Worktrees

- Codex has no `EnterWorktree` or `ExitWorktree`. Create worktrees with `git worktree add .claude/worktrees/<dir> -b <branch> origin/<default-branch>` (after `git fetch origin`), or without `-b` and the base ref when the branch already exists.
- Since the session cannot move into the worktree, run later commands with `git -C <worktree>` or from that directory, and tell the founder to open a new Codex session there.
- Remove worktrees with `git worktree remove .claude/worktrees/<dir>`.

## Specialized agents

- Claude agent files under `agents/` are role specifications, not directly executable Codex configuration.
- When the workflow requests a named agent, read that agent file and delegate to a Codex subagent only when subagents are available and the user or active environment permits delegation.
- If delegation is unavailable, perform the role inline with the same read-only or write constraints.
- Never translate a read-only review agent into an implementation agent.

## Parallel work

- Parallelize independent research, review, or validation passes only when Codex subagents are permitted.
- Never have multiple agents edit the same files concurrently.
- Combine review and validation results before evaluating the quality gate.

## Hooks and skill discovery

- Codex discovers the shared skills and the `workflow-*` adapters under the plugin's `skills/` directory.
- Do not assume Claude hook environment variables or Claude hook response payloads exist in Codex.
- The TDD, verification, and skill-awareness behavior must be enforced by the loaded skills and workflow instructions when a compatible Codex hook is unavailable.

## Completion

- Follow Codex permission and sandbox boundaries.
- Run current verification commands and report actual output before claiming success.
- Use Codex-native Git and pull-request capabilities when available; otherwise provide the exact remaining handoff.
