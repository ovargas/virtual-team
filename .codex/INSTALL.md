# Installing virtual-team for Codex

## Setup

1. Clone the plugin repository:
   ```bash
   git clone https://github.com/ovargas/virtual-team.git ~/.local/share/virtual-team
   ```

2. Symlink AGENTS.md into your project:
   ```bash
   cd your-project
   ln -s ~/.local/share/virtual-team/AGENTS.md AGENTS.md
   ```

Codex reads `AGENTS.md` at the project root for system-level instructions.

## Updating

```bash
cd ~/.local/share/virtual-team
git pull
```

The symlink ensures your project always uses the latest version.
