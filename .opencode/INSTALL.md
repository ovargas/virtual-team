# Installing virtual-team for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add virtual-team to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["virtual-team@git+https://github.com/ovargas/virtual-team.git"]
}
```

Restart OpenCode. That's it — the plugin auto-installs and registers all skills.

Verify by asking: "Tell me about your virtual team skills"

## Usage

Use OpenCode's native `skill` tool:

```
use skill tool to list skills
use skill tool to load virtual-team/skill-awareness
```

## Updating

Virtual-team updates automatically when you restart OpenCode.

To pin a specific version:

```json
{
  "plugin": ["virtual-team@git+https://github.com/ovargas/virtual-team.git#v1.0.0"]
}
```

## Troubleshooting

### Plugin not loading

1. Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i virtual-team`
2. Verify the plugin line in your `opencode.json`
3. Make sure you're running a recent version of OpenCode

### Skills not found

1. Use `skill` tool to list what's discovered
2. Check that the plugin is loading (see above)

### Tool mapping

When skills reference Claude Code tools:
- `TodoWrite` → `todowrite`
- `Task` with subagents → `@mention` syntax
- `Skill` tool → OpenCode's native `skill` tool
- File operations → your native tools

## Getting Help

- Report issues: https://github.com/ovargas/virtual-team/issues
