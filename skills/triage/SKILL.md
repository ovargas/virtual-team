---
name: triage
description: Assess work complexity and determine the right documentation ceremony level before starting the pipeline
loaded_when: /flow (Step 0), /feature, /bug, /implement (when invoked standalone)
---

# Triage Skill

Triage classifies work into one of three ceremony levels before the pipeline starts. The goal is to match documentation depth to task complexity — full ceremony for complex work, lightweight for simple changes.

## When to Load

- **`/flow`** — always, as Step 0 before the pipeline begins
- **`/feature`** — to determine which spec template to use (full vs compact)
- **`/bug`** — to determine whether to create a formal bug report or skip to debug
- **`/implement`** — when invoked standalone without a plan, to determine if planless execution is appropriate

## Ceremony Levels

### Level 1 — Full

The current default. Every artifact, every gate, every verification step.

**Pipeline (feature):** `/feature` → `/contracts` → `/plan` → `/implement` → `/review` + `/validate` → `/pr`
**Pipeline (bug fix):** `/bug` → `/debug` → `/plan` → `/implement` → `/review` + `/validate` → `/pr`

**Artifacts produced:**
- Feature spec (full template) or bug report (full template)
- Research doc (if `--deep`)
- Contract schemas (if API endpoints involved)
- Implementation plan (separate document)
- Validation report (separate document)
- Checkpoints (during execution)
- Decision records (if architectural choices made)

**Feature spec template:** Full (all 18 sections)

### Level 2 — Standard

Skips the plan document, contracts step, and standalone validation. The feature spec expands its Implementation Hints section to cover pattern references and file list. `/implement` does inline analysis instead of requiring a formal plan.

**Pipeline (feature):** `/feature` → `/implement` → `/review` → `/pr`
**Pipeline (bug fix):** `/bug` → `/implement` → `/review` → `/pr`

**Artifacts produced:**
- Feature spec (compact template) or bug report (full template)
- Checkpoints only for multi-phase implement (3+ phases)
- Decision records (if architectural choices made)

**Skipped:**
- `/contracts` — types in code are the contracts
- `/plan` — Implementation Hints in the spec + inline analysis in `/implement`
- `/validate` — `/review` covers acceptance criteria
- Research doc — unless `--deep` is explicitly passed

**Feature spec template:** Compact (see "Compact Feature Spec" section below)

### Level 3 — Minimal

For trivial changes where the commit message and PR description *are* the documentation. No separate spec document.

**Pipeline (feature):** `/implement` → `/review` → `/pr`
**Pipeline (bug fix):** `/implement` → `/review` → `/pr`

**Artifacts produced:**
- Backlog entry (one line)
- PR description carries the context (problem, solution, verification)

**Skipped:**
- `/feature` or `/bug` — no separate spec document
- `/contracts`, `/plan`, `/validate` — all skipped
- Checkpoints — not needed for single-phase work
- Research doc — not applicable

**Feature spec template:** None — context goes directly into the PR description

## Classification Signals

Triage reads these signals to recommend a level. No single signal is decisive — the overall pattern determines the level.

### Signals favoring Level 1 (Full)

| Signal | How to detect |
|---|---|
| Multiple stories needed | Feature description implies 3+ distinct capabilities |
| New patterns or technologies | `stack.md` doesn't list the technology; no existing pattern in codebase |
| Architectural decisions required | Feature implies new services, data stores, or integration points |
| Cross-service or cross-repo work | Feature touches contracts, shared models, or external APIs |
| `--deep` flag passed | User explicitly asked for thorough analysis |
| High uncertainty | Feature description is vague or the approach isn't obvious |

### Signals favoring Level 2 (Standard)

| Signal | How to detect |
|---|---|
| 1-2 stories | Feature is a single capability with clear scope |
| Follows existing patterns | Codebase already has a similar feature (search for it) |
| Single service | All changes in one repo, one deployment unit |
| Clear scope | Feature description is specific and bounded |
| No new technologies | Everything needed is already in `stack.md` |

### Signals favoring Level 3 (Minimal)

| Signal | How to detect |
|---|---|
| Single file change | Fix is isolated to one file or a small cluster |
| Obvious fix | Typo, config change, copy update, version bump |
| No design decisions | There's only one reasonable way to do it |
| Bug with known cause | User already knows what's broken and roughly where |
| `--quick` flag passed | User explicitly asked for minimal ceremony |

## Assessment Protocol

### Step 1: Gather signals

1. Read the feature/bug description from the user
2. Read `stack.md` for project context
3. Quick codebase scan — search for related patterns (Glob + Grep, max 3 queries)
4. Check backlog for related work

### Step 2: Score and classify

Count signals from each level. The level with the most signals wins. Ties break toward the higher ceremony level (safer to over-document than under-document).

### Step 3: Present the assessment

```
**Triage: Level [N] — [Full | Standard | Minimal]**

Signals:
- [Signal 1] → Level [N]
- [Signal 2] → Level [N]
- [Signal 3] → Level [N]

Pipeline: [step] → [step] → [step]
Skipping: [skipped steps, or "nothing — full ceremony"]

[If --auto: proceed silently]
[If not --auto: "Proceed with Level [N]? [Yes / Upgrade / Downgrade]"]
```

### Step 4: Apply

- **If `--auto`:** Use the detected level, no prompt. Log the assessment in the flow checkpoint.
- **If interactive:** Wait for user confirmation or override. If the user overrides, use their choice.
- Store the assessed level in the flow checkpoint (if `/flow`) or pass it forward to the next command.

## How Commands Use Triage Level

### `/feature`

| Level | Behavior |
|---|---|
| 1 (Full) | Full 6-phase process, full spec template |
| 2 (Standard) | Phases 1-4 (Understand, YAGNI, Research, Specify) compressed. Compact spec template. Skip Phase 6 story breakdown if single-story. |
| 3 (Minimal) | Skip `/feature` entirely. Context goes into `/implement` and PR description. |

### `/bug`

| Level | Behavior |
|---|---|
| 1 (Full) | Full bug report with all sections |
| 2 (Standard) | Full bug report (bugs are already lightweight) |
| 3 (Minimal) | Skip `/bug`. Description goes directly to `/implement`. |

### `/plan`

| Level | Behavior |
|---|---|
| 1 (Full) | Full plan document, separate file in `docs/plans/` |
| 2 (Standard) | **Skipped.** `/implement` does inline analysis instead. |
| 3 (Minimal) | **Skipped.** |

### `/implement`

| Level | Behavior |
|---|---|
| 1 (Full) | Requires approved plan. Current behavior unchanged. |
| 2 (Standard) | **No plan required.** Before coding, does inline analysis: reads the feature spec's Implementation Hints, scans codebase for patterns, identifies files to modify, and presents a brief summary before starting. This is "planning in your head" — lightweight, not documented. |
| 3 (Minimal) | **No plan, no spec required.** Works from the bug/feature description alone. Reads codebase, identifies the change, implements it. |

### `/contracts`

| Level | Behavior |
|---|---|
| 1 (Full) | Full contract extraction and schema files |
| 2 (Standard) | **Skipped.** Types in code are the contracts. |
| 3 (Minimal) | **Skipped.** |

### `/validate`

| Level | Behavior |
|---|---|
| 1 (Full) | Full validation report, gap analysis |
| 2 (Standard) | **Skipped.** `/review` checks acceptance criteria inline. |
| 3 (Minimal) | **Skipped.** |

### `/review`

| Level | Behavior |
|---|---|
| 1 (Full) | Full 3-pass review (code quality + security + domain) |
| 2 (Standard) | Full 3-pass review (same — review quality doesn't scale down) |
| 3 (Minimal) | Single-pass review (inline, no agents). Focus on correctness only. |

## Compact Feature Spec

When triage assigns Level 2, `/feature` uses this reduced template instead of the full 18-section template:

```markdown
---
id: FEAT-[NNN]
date: [YYYY-MM-DD]
status: draft
type: feature
triage: standard
tags: [relevant, tags]
---

# [Feature Name]

> **Value:** [One sentence — why this matters]

## Problem

[2-3 sentences. What's broken or missing?]

## Solution

[Describe the feature at the level of user-visible behavior.]

## Boundaries

**Not building:**
- [No-go 1] — [why]

## Definition of Done

1. [Observable behavior 1]
2. [Observable behavior 2]
3. [Quality requirement]

**Verification:**
- [ ] [Test or check with command to run]
- [ ] [Manual verification step]

## Implementation Hints

**Pattern to follow:** [file:line reference to the closest existing implementation]

**Files to modify:**
| File | Action | Notes |
|---|---|---|
| `path/to/file.ext` | modify | [Brief description] |
| `path/to/file.ext` | create | [Brief description] |

**Key considerations:**
- [Integration point or constraint]
- [Pattern to maintain]

## Founder Context

[Observations that shaped this feature, if any. Omit if none.]
```

This keeps the high-value sections (Problem, Solution, Boundaries, DoD) while dropping the sections that are either redundant with the plan (which we're skipping) or low-value for simple features (Success Metrics, Visual Concept, Research Summary, Incremental Delivery).

The `triage: standard` frontmatter field tells downstream commands which ceremony level applies.

## Overriding Triage

The user can always override:

- **At assessment time:** "Upgrade" or "Downgrade" when prompted
- **Via flags:** `--deep` forces Level 1 (full). `--quick` forces Level 3 (minimal).
- **Mid-pipeline:** If work turns out more complex than expected, the user can say "this needs a plan" and the command should accommodate (create the plan doc at that point).
- **Per-project default:** If `stack.md` has a `triage:` field (e.g., `triage: standard`), use it as the default instead of auto-detecting. Auto-detection still runs but its recommendation is overridden by the project default unless the user explicitly passes a flag.
