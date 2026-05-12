---
date: 2026-04-29
feature: FEAT-021
spec: docs/features/2026-04-29-standalone-grilling-command.md
status: approved
---

# Implementation Plan: Standalone Grilling Command (vt-grill)

## Overview

We're implementing a `/vt-grill` command that stress-tests feature specs and plans by walking their decision trees, challenging assumptions, providing recommended answers, and maintaining CONTEXT.md terminology inline. The command follows the same invocation pattern as `vt-validate` (document-in, findings-out) and uses the hypothesis-generation pattern from `vt-debug` for recommended answers. Implementation is three phases: create the command, add cross-references, then verify.

## Reference Implementation

The closest existing pattern is `vt-validate`, implemented in:
- `commands/vt-validate.md:1-5` — frontmatter with name, description, model
- `commands/vt-validate.md:14-27` — invocation patterns with FEAT-NNN lookup, path, --auto, --deep flags
- `commands/vt-validate.md:40-65` — document loading and section-by-section analysis
- `commands/vt-debug.md:128-158` — ranked hypothesis generation with falsifiable predictions (model for "recommended answers")

This plan follows vt-validate's structure (load document → walk sections → produce findings) with the adaptation that findings are prospective (assumptions and gaps) rather than retrospective (spec-vs-implementation comparison).

## Pre-conditions

Before starting implementation:
- [x] Feature spec is approved: `docs/features/2026-04-29-standalone-grilling-command.md`
- [x] Domain glossary convention is live (FEAT-020, ADR-002) — prerequisite for CONTEXT.md integration
- [x] Skill authoring guide is live (FEAT-019, ADR-001) — informs size constraints

---

## Phase 1: Create the vt-grill command

### Overview
Create the complete `/vt-grill` command file. After this phase, a user can run `/vt-grill FEAT-NNN` or `/vt-grill path/to/doc.md` and receive structured findings.

**After this phase:** The command is functional end-to-end — document loading, decision-tree walking, recommended answers, CONTEXT.md integration, and --auto/--deep support all work.

### Step 1.1: Create command file with frontmatter and invocation
**File:** `commands/vt-grill.md` ([create])
**Pattern:** Follow `commands/vt-validate.md:1-27`

**What to do:**
Create the command file with:
- Frontmatter: `name: vt-grill`, `description` (under 1024 chars, third person, "Use when" trigger), `model: opus`
- Role paragraph: senior engineer stress-testing a document for untested assumptions
- CRITICAL directive: skip preamble, jump directly into processing
- Invocation section with usage patterns:
  - `/vt-grill FEAT-NNN` — grill a feature spec by ID
  - `/vt-grill docs/features/YYYY-MM-DD-name.md` — grill a specific document
  - `/vt-grill docs/plans/YYYY-MM-DD-name.md` — grill a plan
  - `/vt-grill --auto FEAT-NNN` — accept all recommendations automatically
  - `/vt-grill --deep FEAT-NNN` — spawn codebase agents for deeper verification
  - `/vt-grill` — interactive mode, list specs/plans and ask which to grill
- Flags: `--auto` (accept recommendations, apply CONTEXT.md updates without prompting), `--deep` (spawn agents for codebase verification)

### Step 1.2: Initial response and document loading
**File:** `commands/vt-grill.md` ([continue])
**Pattern:** Follow `commands/vt-validate.md:40-58`

**What to do:**
Add the Initial Response section:
1. Parse arguments for spec path, feature ID, or plan path
2. Read supporting context:
   - The target document (feature spec or plan)
   - `stack.md` if it exists — tech stack context
   - `CONTEXT.md` if it exists — domain vocabulary for terminology challenges
   - Any decision records referenced in the document's frontmatter
3. Verify the document has enough structure to grill (has sections, makes claims). If the document is too thin, say so and suggest what to add before grilling.

### Step 1.3: Decision-tree walking process
**File:** `commands/vt-grill.md` ([continue])
**Pattern:** Combine `commands/vt-validate.md:59-100` (section-by-section analysis) with `commands/vt-debug.md:128-158` (ranked hypotheses with predictions)

**What to do:**
Add the Process section with these phases:

**Phase 1: Build the decision tree.**
Read the document section by section. For each section, extract:
- **Claims** — statements about what will be built, how it works, what it depends on
- **Dependencies** — what must be true for each claim to hold (other claims, codebase state, external factors)
- **Assumptions** — things taken for granted but not explicitly verified

Present the tree summary:
```
Found N claims with M dependencies across K sections.
[N] dependencies resolved, [M] unresolved, [K] assumptions untested.
```

**Phase 2: Walk each branch.**
Process branches depth-first (resolve foundations before surfaces). For each unresolved dependency or untested assumption:

1. **Can it be answered from the codebase?** Use Glob, Grep, Read to check.
   - If yes: answer it directly with file:line references. Mark as "RESOLVED FROM CODEBASE."
   - If no: proceed to step 2.

2. **Pose the question with a recommended answer.** Follow the vt-debug hypothesis format:
   - State the claim and its dependency
   - State the gap (what's undefined, assumed, or ambiguous)
   - Provide a recommended answer with rationale
   - Explain what breaks if the recommendation is wrong

3. **In interactive mode:** wait for Accept/Modify/Reject on each question (or batch them at the end of each branch).
   **In --auto mode:** accept all recommendations automatically.

**Phase 3: Terminology check.**
If CONTEXT.md exists:
- Scan the document for domain terms
- Flag terms used in the document but not defined in CONTEXT.md
- Flag terms defined in CONTEXT.md but used inconsistently or with "Avoid" synonyms
- Propose additions to CONTEXT.md for new terms that crystallized during the interview
- In --auto mode: apply CONTEXT.md updates directly. In interactive mode: propose and wait for approval.

If CONTEXT.md doesn't exist: note "No CONTEXT.md found — skipping terminology check. Consider creating one with `/vt-start` or manually."

**Phase 4: Summary.**
Produce a structured summary:
```
## Grilling Summary

**Document:** [path]
**Decisions confirmed:** N (resolved from codebase or accepted)
**Gaps found:** N (required founder input)
**Assumptions tested:** N/M
**Terminology updates:** N terms added/updated in CONTEXT.md

### Findings
[List of findings with status indicators — similar to vt-validate's gap report]
```

### Step 1.4: Agent usage section
**File:** `commands/vt-grill.md` ([continue])
**Pattern:** Follow `commands/vt-validate.md:337-345`

**What to do:**
Add the Agent Usage section:
- **Default (no --deep):** Do all codebase exploration yourself with Glob, Grep, Read. Sufficient for most documents.
- **If --deep was passed:** Spawn up to 2 agents:
  - Spawn **virtual-team:codebase-analyzer** agent: "Verify these assumptions from [document]: [list of claims that reference codebase state]. For each, confirm whether the claim is true with file:line references."
  - Spawn **virtual-team:pattern-finder** agent: "Find existing implementations of [pattern claimed in document]. Verify the pattern exists and works as described."
- Wait for agents before producing findings.

### Step 1.5: Important guidelines section
**File:** `commands/vt-grill.md` ([continue])
**Pattern:** Follow `commands/vt-validate.md:290-335`

**What to do:**
Add guidelines:
1. **HARD BOUNDARY — No implementation:** This command GRILLS, it does not FIX or IMPLEMENT. Do not write code, modify source files, or scaffold anything. Report findings and let the founder decide.
2. **Codebase-first:** If a question can be answered by reading code, read the code. Don't ask the founder what's already in the repo.
3. **Recommended answers are not filler:** Every recommendation must have a rationale and a "what breaks if wrong" consequence. Generic recommendations ("add error handling") add no value.
4. **Respect the document's scope:** Challenge assumptions within the document's scope. Don't introduce new requirements or scope creep through your questions.
5. **CONTEXT.md updates are surgical:** Add terms that crystallized during the interview. Don't rewrite existing definitions unless they're demonstrably wrong.
6. **Track progress with TodoWrite:** Create todos for each phase.

### Phase 1 Verification

**Automated:**
- [ ] `npm test` passes — validates frontmatter (name, description), file references

**Manual:**
- [ ] The command file exists at `commands/vt-grill.md` with valid frontmatter
- [ ] The command follows the established structure (frontmatter → role → invocation → process → guidelines → agent usage)
- [ ] The description is under 1024 chars, third person, includes "Use when"

**Stop here.** Verify Phase 1 before moving on.

---

## Phase 2: Add cross-references

### Overview
Add lightweight references to vt-grill from vt-feature, vt-plan, and the domain-glossary skill. After this phase, users discover vt-grill through the commands they already use.

**After this phase:** vt-feature mentions vt-grill after spec creation, vt-plan mentions it after plan approval, and the domain-glossary skill's forward reference is updated.

### Step 2.1: Add vt-grill reference to vt-feature
**File:** `commands/vt-feature.md` ([modify])
**Location:** After the "Present the spec for review" block (around line 609), before Phase 6

**What to do:**
Add a brief note after the spec review presentation suggesting vt-grill as an optional quality step:

```
**Optional:** Run `/vt-grill FEAT-NNN` to stress-test the spec for untested assumptions before breaking into stories.
```

This is a suggestion, not a gate. One line, no new phases.

### Step 2.2: Add vt-grill reference to vt-plan
**File:** `commands/vt-plan.md` ([modify])
**Location:** After the plan approval block in Phase 3 (around line 435), before Phase 3.5

**What to do:**
Add a brief note after the plan is approved suggesting vt-grill:

```
**Optional:** Run `/vt-grill` on the approved plan to stress-test technical assumptions before implementation.
```

Same pattern — suggestion, not a gate. One line.

### Step 2.3: Update domain-glossary skill forward reference
**File:** `skills/domain-glossary/SKILL.md` ([modify])
**Location:** Line 64 — "The grilling skill (future) will maintain CONTEXT.md inline during interviews"

**What to do:**
Update the forward reference from future tense to present tense, pointing to the actual command:

Change: `- The grilling skill (future) will maintain CONTEXT.md inline during interviews`
To: `- The `/vt-grill` command maintains CONTEXT.md inline during grilling sessions`

### Phase 2 Verification

**Automated:**
- [ ] `npm test` passes — validates file references across all modified files

**Manual:**
- [ ] vt-feature.md mentions vt-grill after spec presentation
- [ ] vt-plan.md mentions vt-grill after plan approval
- [ ] domain-glossary SKILL.md no longer says "(future)"

**Stop here.** Verify Phase 2 before moving on.

---

## Phase 3: Final Verification

### Overview
Run all checks and confirm the feature meets the Definition of Done.

**After this phase:** Feature is complete and ready for PR.

### Step 3.1: Run automated tests
**Command:** `npm test`
**Expected:** All tests pass — frontmatter validation, file reference validation, command reference validation.

### Step 3.2: Manual verification
- [ ] Run conceptual walkthrough: read vt-grill.md and confirm it would produce meaningful findings when applied to an existing feature spec (e.g., FEAT-020)
- [ ] Confirm vt-feature and vt-plan cross-references are non-intrusive (one line each, suggestion not gate)
- [ ] Confirm domain-glossary forward reference updated

---

## Final Verification

**All automated checks:**
- [ ] `npm test` passes

**Manual testing:**
- [ ] Read `commands/vt-grill.md` — verify it's a coherent command with clear phases
- [ ] Run `/vt-grill` mentally against FEAT-020 (domain glossary) — would it find real gaps?
- [ ] Verify cross-references in vt-feature.md, vt-plan.md, domain-glossary SKILL.md
- [ ] Confirm no existing tests break

**Definition of done alignment:**
- [ ] `/vt-grill FEAT-NNN` produces structured findings — addressed in Phase 1
- [ ] Codebase-answerable questions auto-resolved — addressed in Phase 1, Step 1.3 (Phase 2 of the command)
- [ ] CONTEXT.md terminology challenged — addressed in Phase 1, Step 1.3 (Phase 3 of the command)
- [ ] CONTEXT.md updated inline — addressed in Phase 1, Step 1.3 (Phase 3 of the command)
- [ ] `--auto` mode supported — addressed in Phase 1, Steps 1.1 and 1.3
- [ ] vt-feature and vt-plan reference vt-grill — addressed in Phase 2

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `commands/vt-grill.md` | create | 1 | New command — the core of this feature |
| `commands/vt-feature.md` | modify | 2 | Add one-line vt-grill suggestion after spec review |
| `commands/vt-plan.md` | modify | 2 | Add one-line vt-grill suggestion after plan approval |
| `skills/domain-glossary/SKILL.md` | modify | 2 | Update forward reference from future to present |

## Risks and Fallbacks

- **Question quality depends on document structure:** If the target document has very little structure (e.g., a one-paragraph description), the command won't find much to grill. Fallback: the command detects thin documents and suggests adding structure before grilling (handled in Step 1.2).
- **CONTEXT.md updates could be noisy:** If the document uses many undefined terms, the terminology section could dominate the output. Fallback: cap terminology findings at 5-10 most important terms, note the rest as "N additional terms could be added."
- **Command length could exceed 500 lines:** The combination of document loading, decision-tree walking, CONTEXT.md integration, and agent usage could push past the soft limit. Fallback: if it approaches 500 lines, extract the terminology-check logic into a reference file or lean on the domain-glossary skill's existing format documentation instead of repeating it.

## References

- Feature spec: `docs/features/2026-04-29-standalone-grilling-command.md`
- Pattern reference: `commands/vt-validate.md` (document analysis workflow)
- Pattern reference: `commands/vt-debug.md:128-158` (recommended answer format)
- Decision: `docs/decisions/2026-04-29-domain-glossary-convention.md` (ADR-002, CONTEXT.md maintenance)
- Decision: `docs/decisions/2026-04-29-skill-size-budget.md` (ADR-001, size constraints)
