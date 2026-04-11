# Virtual Team Plugin — Contributor Guide

This is a Claude Code plugin that provides a virtual development team workflow: TDD, debugging, code review, backlog management, and proven workflow patterns.

## Repository Structure

```
commands/       — Slash commands (/flow, /implement, /commit, etc.)
skills/         — Skills loaded by commands (TDD, git-practices, etc.)
agents/         — Specialized sub-agents (pattern-finder, security-reviewer, etc.)
hooks/          — Platform hook scripts (session-start, run-hook.cmd)
examples/       — Example CLAUDE.md templates and stack-specific skills
tests/          — Static validation tests (frontmatter, refs, commands)
.claude-plugin/ — Claude Code plugin manifest
.cursor-plugin/ — Cursor plugin manifest
.opencode/      — OpenCode plugin adapter
.codex/         — Codex installation instructions
```

## Conventions

- Commands, skills, and agents use YAML frontmatter with `name` and `description` fields
- Command names match their filename (kebab-case)
- Skills live in `skills/<name>/SKILL.md`
- Cross-references use root-relative paths (e.g., `skills/git-practices/SKILL.md`, not `.claude/skills/...`)
- The bootstrap skill is `skill-awareness` — it loads via SessionStart hook

## Testing

```bash
npm test
```

Validates frontmatter, file references, and command references across all markdown files.
