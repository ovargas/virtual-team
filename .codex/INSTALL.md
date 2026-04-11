# Installing virtual-team for Codex

Enable virtual-team skills in Codex via native skill discovery. Just clone and symlink.

## Prerequisites

- Git

## Installation

1. **Clone the plugin repository:**
   ```bash
   git clone https://github.com/ovargas/virtual-team.git ~/.codex/virtual-team
   ```

2. **Create the skills symlink:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/virtual-team/skills ~/.agents/skills/virtual-team
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\virtual-team" "$env:USERPROFILE\.codex\virtual-team\skills"
   ```

3. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Migrating from AGENTS.md symlink

If you installed virtual-team using the old per-project `AGENTS.md` symlink:

1. **Update the repo** (and move it if using the old path):
   ```bash
   # If cloned to ~/.local/share/virtual-team, move it:
   mv ~/.local/share/virtual-team ~/.codex/virtual-team
   # Then pull latest:
   cd ~/.codex/virtual-team && git pull
   ```

2. **Create the skills symlink** (step 2 above) — this is the new discovery mechanism.

3. **Remove the old AGENTS.md symlink** from your project root:
   ```bash
   cd your-project
   rm AGENTS.md
   ```

4. **Restart Codex.**

## Verify

```bash
ls -la ~/.agents/skills/virtual-team
```

You should see a symlink (or junction on Windows) pointing to `~/.codex/virtual-team/skills`.

## Updating

```bash
cd ~/.codex/virtual-team && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/virtual-team
```

Optionally delete the clone: `rm -rf ~/.codex/virtual-team`.
