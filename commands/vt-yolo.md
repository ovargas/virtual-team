---
name: vt-yolo
description: Run /virtual-team:flow with --auto baked in. Same pipeline, less friction, more regret potential. All /virtual-team:flow flags pass through.
model: haiku
---

# YOLO — Flow on Autopilot

You are the `/virtual-team:yolo` command — a thin wrapper around `/virtual-team:flow --auto` that adds a moment of comedic self-awareness before letting the pipeline run fully autonomous.

## Step 1: The Joke

Before doing anything else, generate a short, funny, original cautionary quote about running code pipelines on autopilot. The tone is self-deprecating developer humor — the joke should make the user smile AND briefly wonder if they should have used `/virtual-team:flow` with manual gates instead.

**Guidelines for the joke:**
- One quote, 1-2 sentences max
- The humor should gently suggest that maybe reviewing things manually is wise
- Reference coding, shipping, pipelines, PRs, or automation — keep it domain-relevant
- Never repeat the same joke (vary the angle: famous-quote parody, fortune-cookie style, developer proverb, fictional error message, etc.)
- Keep it lighthearted — this is a nudge, not a lecture

**Format:**

```
🎲 YOLO MODE ACTIVATED

"[The joke quote]"

Proceeding with --auto. All gates will auto-resolve unless they hit a hard failure.
If you wanted manual control, you still have time: Ctrl+C and run /virtual-team:flow instead.

───────────────────────────────────────────────────
```

**Wait 0 seconds** — just print it and continue. The joke IS the speed bump.

## Step 2: Delegate to /virtual-team:flow --auto

After printing the joke, execute the full `/virtual-team:flow` command with `--auto` injected. Pass through ALL arguments and flags the user provided.

**Translation rules:**
- `/virtual-team:yolo Add search capability` → execute `/virtual-team:flow --auto Add search capability`
- `/virtual-team:yolo --deep Add notifications` → execute `/virtual-team:flow --auto --deep Add notifications`
- `/virtual-team:yolo --fix "login broken"` → execute `/virtual-team:flow --auto --fix "login broken"`
- `/virtual-team:yolo --fix --deep BUG-003` → execute `/virtual-team:flow --auto --fix --deep BUG-003`
- `/virtual-team:yolo --to=plan Add search` → execute `/virtual-team:flow --auto --to=plan Add search`
- `/virtual-team:yolo --from=implement` → execute `/virtual-team:flow --auto --from=implement`
- `/virtual-team:yolo --deep Add complex feature` → execute `/virtual-team:flow --auto --deep Add complex feature`
- `/virtual-team:yolo` (bare) → execute `/virtual-team:flow --auto` (triggers auto-detection from FEAT-013)

**Important:** `--auto` is always added. If the user somehow passed `--auto` explicitly, don't double it — just ensure it's present.

## Step 3: Execute /vt-flow

Now read `commands/vt-flow.md` and execute it fully, following every instruction in that file. You ARE the flow orchestrator now — the only difference is that `--auto` is always active.

**Do not:**
- Skip any pipeline steps
- Reduce the quality of any gate evaluation
- Change any behavior beyond what `--auto` already changes in `/virtual-team:flow`

**The joke was the contribution.** Everything after it is standard `/virtual-team:flow --auto`.
