---
name: update-workflow
description: Check for plugin updates and show the current virtual-team plugin version
model: sonnet
---

# Plugin Update Check

You are checking the current version of the virtual-team plugin and helping the user update it if needed.

## Invocation

**Usage patterns:**
- `/virtual-team:update-workflow` — check current version and show update instructions
- `/virtual-team:update-workflow --check` — check if updates are available (compare local vs remote)

## Process

### Step 1: Identify Current Version

Read the plugin manifest to determine the current version. Use the Read tool on `.claude-plugin/plugin.json` (relative to the plugin root). If the file is not found, report "Plugin manifest not found" and stop.

Also use Read on `package.json` for the version field.

### Step 2: Show Current State

```
**Virtual Team Plugin**
Version: [version from manifest]
Install location: [plugin root path]
```

### Step 3: Check for Updates (if `--check`)

If `--check` was passed, compare the local version against the remote:

```bash
git -C [plugin-root] fetch origin main --dry-run 2>&1
git -C [plugin-root] log HEAD..origin/main --oneline 2>/dev/null
```

Report:
- If up to date: "Plugin is up to date."
- If behind: "N new commits available. Run the update command below to update."

### Step 4: Show Update Instructions

```
**To update the virtual-team plugin:**

# Claude Code
claude plugin update virtual-team

# Or manually (any platform)
cd [plugin-install-path]
git pull origin main

After updating, restart your session to load the new version.
```

## Important Guidelines

1. This command only CHECKS and REPORTS — it does NOT auto-update
2. The user decides when to update
3. Show clear instructions for both plugin-manager and manual update paths
