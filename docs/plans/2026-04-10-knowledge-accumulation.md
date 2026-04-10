---
date: 2026-04-10
feature: FEAT-011
spec: docs/features/2026-04-10-knowledge-accumulation.md
status: approved
---

# Implementation Plan: Knowledge Accumulation

## Overview

We're adding a knowledge persistence system that captures implementation patterns and error fixes after PRs, then injects relevant entries into future planning sessions. Phase 1 creates the knowledge directory, file formats, and a capture step in `/pr`. Phase 2 adds a knowledge injection step to `/plan` Phase 1 with bounded, domain-tag-matched retrieval.

## Reference Implementation

The closest existing pattern is the Wave-Based Parallel SDD (FEAT-010), which also modified command files and skill files:
- `docs/plans/2026-04-10-wave-based-parallel-sdd.md` — plan structure for modifying `.claude/commands/` and `.claude/skills/`
- `.claude/commands/pr.md:236-258` — Step 7 (backlog update after PR) is the insertion point for the capture step
- `.claude/commands/plan.md:125-185` — Phase 1 (Codebase Analysis) is the insertion point for knowledge injection

## Pre-conditions

Before starting implementation:
- [ ] Feature spec is approved: `docs/features/2026-04-10-knowledge-accumulation.md`
- [ ] FEAT-010 is complete (no direct dependency, but both modify command files — avoid concurrent edits)

---

## Phase 1: Knowledge Directory and Capture Step (S-009)

### Overview
After this phase, `docs/knowledge/` exists with `patterns.md` and `errors.md` (empty templates with documented format), and `/pr` offers to capture patterns and errors after a successful PR submission.

**After this phase:** After running `/pr`, the session presents a knowledge capture prompt. Captured patterns/errors are appended to the knowledge files and committed.

### Step 1.1: Create knowledge directory with template files
**File:** `docs/knowledge/patterns.md` (create)
**Pattern:** Follow the format documented in the feature spec at `docs/features/2026-04-10-knowledge-accumulation.md:64-84`

**What to do:**

Create `docs/knowledge/patterns.md` with the following structure:
- A top-level heading `# Implementation Patterns`
- A brief comment explaining the file's purpose and format
- Empty domain sections as examples (commented out or minimal), showing the expected format:
  - `## domain-tag` heading
  - `### Pattern title (YYYY-MM-DD)` subheading
  - Description paragraph explaining the pattern, when it applies, and what feature it was discovered during

### Step 1.2: Create errors knowledge file
**File:** `docs/knowledge/errors.md` (create)
**Pattern:** Follow the format documented in the feature spec at `docs/features/2026-04-10-knowledge-accumulation.md:86-102`

**What to do:**

Create `docs/knowledge/errors.md` with the following structure:
- A top-level heading `# Error Fixes`
- A brief comment explaining the file's purpose and format
- An example showing the expected format (commented or minimal):
  - `## Error: "error message or symptom"` heading
  - `- **When:** context when this occurs`
  - `- **Root cause:** what was actually wrong`
  - `- **Fix:** what resolved it`
  - `- **Domain:** domain-tag-1, domain-tag-2`
  - `- **Date:** YYYY-MM-DD`

### Step 1.3: Add knowledge capture step to `/pr`
**File:** `.claude/commands/pr.md` (modify)
**Pattern:** Follow the existing Step 7 structure at `pr.md:236-258` for how steps are documented. The capture step goes AFTER Step 7 (backlog update) and BEFORE Step 8 (report), becoming the new Step 7.5.

**What to do:**

Add a new section `### Step 7.5: Knowledge Capture (optional)` between Step 7 and Step 8. This section should:

1. **Gate condition:** Only run if `docs/knowledge/` exists. If the directory doesn't exist, skip silently — this makes the feature opt-in and backward-compatible.

2. **Capture prompt:** After the PR is submitted and backlog is updated, present a knowledge capture prompt:
   ```
   **Knowledge capture** (optional — press Enter to skip)

   Review the implementation you just completed. Were there any:

   1. **Patterns** worth remembering? (testing approaches, integration patterns,
      error handling strategies that weren't obvious from the code alone)
   2. **Errors** you hit and fixed? (symptoms, root causes, and fixes that
      future sessions should know about)

   If yes, I'll extract them and add to docs/knowledge/.
   If nothing notable, just say "skip" or press Enter.
   ```

3. **If the user provides input or says "yes":**
   - Review the branch diff (`git diff <base>...HEAD`) and the implementation context
   - Extract patterns and/or errors following the format in the knowledge files
   - Present the extracted entries for confirmation:
     ```
     Here's what I'd add:

     **patterns.md** (under `## api-design`):
     ### [Pattern title] (YYYY-MM-DD)
     [Description]

     **errors.md:**
     ## Error: "[symptom]"
     - **When:** [context]
     - **Root cause:** [cause]
     - **Fix:** [fix]
     - **Domain:** [tags]
     - **Date:** YYYY-MM-DD

     Add these? (yes/edit/skip)
     ```
   - On confirmation: append to the knowledge files, commit, and push:
     ```bash
     git add docs/knowledge/patterns.md docs/knowledge/errors.md
     git commit -m "docs(knowledge): capture patterns from [TICKET-ID]"
     git push
     ```

4. **If the user says "skip" or presses Enter:** Skip silently, proceed to Step 8.

5. **If `--auto` was passed to `/pr`:** Skip knowledge capture entirely (no one to answer).

6. **Domain tag selection:** Derive domain tags from:
   - The domain skills that were loaded during implementation (api-design, data-layer, ui-design, service-layer)
   - File paths in the diff (e.g., `routes/` → api-design, `models/` → data-layer)
   - The user can override or add tags

### Phase 1 Verification

**Automated:**
- [ ] `docs/knowledge/patterns.md` exists and contains the documented format
- [ ] `docs/knowledge/errors.md` exists and contains the documented format
- [ ] `pr.md` parses as valid markdown with no broken formatting
- [ ] New Step 7.5 is properly positioned between Steps 7 and 8

**Manual:**
- [ ] Read through the capture step flow — verify it handles: capture, skip, and auto-mode paths
- [ ] Verify the gate condition (only runs if `docs/knowledge/` exists)
- [ ] Verify the commit/push flow appends entries without overwriting existing content

**Stop here.** Verify Phase 1 before proceeding.

---

## Phase 2: Knowledge Injection into /plan (S-010)

### Overview
After this phase, `/plan` Phase 1 reads relevant knowledge entries (matched by domain tags) and includes them as bounded planning context. The planner uses these to inform phase ordering, testing strategy, and risk identification.

**After this phase:** When planning a feature in a domain with existing knowledge entries, the plan's Phase 1 analysis includes a "Lessons from previous implementations" section with relevant patterns and errors.

### Step 2.1: Add knowledge loading to `/plan` Phase 1
**File:** `.claude/commands/plan.md` (modify)
**Pattern:** Follow the existing Phase 1 structure at `plan.md:125-185`. The knowledge loading goes as a new numbered item between existing step 3 (Identify vertical capabilities) and step 4 (Present your analysis).

**What to do:**

Add knowledge loading as part of Phase 1's analysis steps. Insert a new step:

**New step — "Load implementation knowledge":**

1. **Gate condition:** Only load if `docs/knowledge/patterns.md` and `docs/knowledge/errors.md` exist. If the knowledge directory doesn't exist, skip silently.

2. **Determine relevant domains:** Based on the feature being planned, identify which domain tags are relevant:
   - Check which domain skills the implementation will likely need (api-design, data-layer, ui-design, service-layer)
   - Derive from the spec's "Layers:" annotations in stories
   - Derive from the file types that will be touched (routes → api-design, migrations → data-layer, etc.)

3. **Read and filter knowledge files:**
   - Read `docs/knowledge/patterns.md` — extract entries under matching domain headings
   - Read `docs/knowledge/errors.md` — extract entries whose `Domain:` field contains matching tags
   - **Sort by date (most recent first)** — recent patterns are more likely relevant
   - **Cap at top-3 patterns + top-3 errors per domain** — prevents context bloat
   - **Total injection budget: ~500 tokens** — if the filtered entries exceed this, truncate from the oldest entries first

4. **Format for injection:** Structure the filtered entries as a planning context section:
   ```
   **Lessons from previous implementations:**

   Patterns:
   - [domain] [Pattern title] (date): [one-line summary]
   - [domain] [Pattern title] (date): [one-line summary]

   Known errors:
   - [domain] [Error symptom] (date): [root cause + fix summary]
   - [domain] [Error symptom] (date): [root cause + fix summary]
   ```

5. **Use in planning:** Include this section in the Phase 1 analysis presentation AND carry it forward into the plan document's "Risks and Fallbacks" section where relevant. Specifically:
   - If a known error applies to the planned implementation, add it as a risk with the known fix as the fallback
   - If a pattern applies, reference it in the relevant phase's step instructions

### Step 2.2: Update the Phase 1 analysis presentation
**File:** `.claude/commands/plan.md` (modify)
**Pattern:** Follow the existing analysis presentation at `plan.md:160-185`.

**What to do:**

Update the Phase 1 analysis presentation template to include a knowledge section when entries were found:

Add after "**Key findings:**" and before "**Incremental delivery plan:**":

```
**Knowledge from previous implementations:** [N patterns, N errors loaded | No knowledge directory found]
[If entries found, list the most relevant 1-2 items briefly]
```

### Phase 2 Verification

**Automated:**
- [ ] `plan.md` parses as valid markdown with no broken formatting
- [ ] Knowledge loading step is properly positioned in Phase 1

**Manual:**
- [ ] Trace through the loading flow with empty knowledge files — verify it skips gracefully
- [ ] Trace through with populated knowledge files — verify domain matching, recency sorting, and token cap
- [ ] Verify the injection format is concise enough to stay within ~500 tokens for 3+3 entries
- [ ] Verify the presentation template includes the knowledge status line

**Stop here.** Verify Phase 2 before proceeding.

---

## Final Verification

**All automated checks:**
- [ ] `docs/knowledge/patterns.md` exists with documented format
- [ ] `docs/knowledge/errors.md` exists with documented format
- [ ] `pr.md` is valid markdown with capture step properly integrated
- [ ] `plan.md` is valid markdown with knowledge injection properly integrated
- [ ] No changes to any files other than `pr.md`, `plan.md`, and new `docs/knowledge/` files

**Manual testing:**
- [ ] Complete a `/pr` flow — verify capture prompt appears, accepts input, and appends to knowledge files
- [ ] Run `/plan` for a feature in a domain with existing knowledge entries — verify entries appear in Phase 1 analysis
- [ ] Run `/plan` for a feature with no matching domain — verify graceful skip
- [ ] Verify knowledge injection doesn't exceed ~500 tokens with 6 entries (3 patterns + 3 errors)
- [ ] Verify existing `/pr` and `/plan` behavior is unchanged when `docs/knowledge/` doesn't exist

**Definition of done alignment:**
- [ ] DoD 1: `docs/knowledge/` directory exists with `patterns.md` and `errors.md` → Phase 1 (Steps 1.1, 1.2)
- [ ] DoD 2: After a successful `/pr`, the flow offers to capture patterns and errors → Phase 1 (Step 1.3)
- [ ] DoD 3: `/plan` Phase 1 reads relevant knowledge entries as planning context → Phase 2 (Step 2.1)
- [ ] DoD 4: Knowledge injection is bounded (top-N entries, capped tokens) → Phase 2 (Step 2.1, cap rules)
- [ ] DoD 5: Knowledge files can be manually edited → Phase 1 (Steps 1.1, 1.2 — plain markdown files)

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `docs/knowledge/patterns.md` | create | 1 | Template with format documentation |
| `docs/knowledge/errors.md` | create | 1 | Template with format documentation |
| `.claude/commands/pr.md` | modify | 1 | Add Step 7.5 (knowledge capture) |
| `.claude/commands/plan.md` | modify | 2 | Add knowledge loading to Phase 1 |

## Risks and Fallbacks

- **Knowledge capture is too much friction:** The capture step is optional (user can skip or press Enter). In `--auto` mode, it's skipped entirely. Fallback: if adoption is low, consider making capture automatic.
- **Knowledge entries become stale:** Entries include dates. During load, entries older than 3 months could be flagged. Fallback: manually prune old entries.
- **Domain tag matching too broad/narrow:** Start with the four Layer 1 domain skills. Fallback: allow sub-tags.
- **Token budget exceeded:** Cap at top-3 + top-3 per domain, ~500 tokens total. Fallback: reduce to top-2 + top-2.

## References

- Feature spec: `docs/features/2026-04-10-knowledge-accumulation.md`
- PR command: `.claude/commands/pr.md`
- Plan command: `.claude/commands/plan.md`
- Closest plan pattern: `docs/plans/2026-04-10-wave-based-parallel-sdd.md`
- GSD knowledge: `docs/reviews/2026-04-10-claude-workflow-system.md` (Finding #3)
