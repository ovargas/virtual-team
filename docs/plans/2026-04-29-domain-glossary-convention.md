---
date: 2026-04-29
feature: FEAT-020
spec: docs/features/2026-04-29-domain-glossary-convention.md
status: approved
---

# Implementation Plan: Domain Glossary Convention (CONTEXT.md)

## Overview

We're adding a domain glossary convention to the virtual-team plugin: a new `skills/domain-glossary/SKILL.md` that documents the CONTEXT.md format (defined by ADR-002), plus integration into 5 pipeline commands so they read CONTEXT.md when present in a consumer project. This is a single-phase change — all files are markdown, independent of each other, and the whole feature is testable after one pass.

## Reference Implementation

The closest existing pattern is the skill-authoring skill (FEAT-019), implemented in:
- `skills/skill-authoring/SKILL.md` — recently created skill following ADR-001 budget (82 lines)
- `commands/vt-feature.md:45-50` — context-loading step pattern (where we add a bullet)

This plan follows the same structure: create a skill file, then add integration references to commands.

## Pre-conditions

Before starting implementation:
- [x] Feature spec is approved: `docs/features/2026-04-29-domain-glossary-convention.md`
- [x] ADR-002 defines the CONTEXT.md format — no design decisions needed

---

## Phase 1: Create domain-glossary skill and integrate into pipeline commands

### Overview
This phase delivers the complete feature: a skill documenting the convention, and all 5 command integrations. Since every change is to markdown files with no inter-dependencies, all steps can be done in sequence without verification between them.

**After this phase:** Consumer projects with a `CONTEXT.md` get their vocabulary read by all pipeline commands. New projects get CONTEXT.md scaffolding offered by `vt-start`.

### Step 1.1: Create `skills/domain-glossary/SKILL.md`
**File:** `skills/domain-glossary/SKILL.md` (create)
**Pattern:** Follow `skills/skill-authoring/SKILL.md` for structure and frontmatter

**What to do:**
Create the skill file with:
- Frontmatter: `name: domain-glossary`, `description` in third person with "Use when" trigger (under 1024 chars)
- Convention overview: what CONTEXT.md is, when to create one, where it lives (repo root)
- Format reference: the 4 sections from ADR-002 (Language table, Relationships, Example Dialogue, Flagged Ambiguities)
- Pipeline behavior: "Commands read CONTEXT.md during context loading and use its vocabulary in generated artifacts"
- Graceful degradation: "CONTEXT.md is optional — commands work without it"
- MUST stay under 100 lines (ADR-001)

### Step 1.2: Add CONTEXT.md to `vt-feature` context loading
**File:** `commands/vt-feature.md` (modify)
**Pattern:** Follow the existing bullet list at line 45-50

**What to do:**
Add a bullet to the "Establish project context immediately" step (step 2 of Initial Response), after the existing `Read any existing PRD or architecture docs` bullet:
```
- Read `CONTEXT.md` if present — use its domain vocabulary in the feature spec. Prefer defined terms over synonyms.
```

### Step 1.3: Add CONTEXT.md to `vt-plan` context loading
**File:** `commands/vt-plan.md` (modify)
**Pattern:** Follow the existing bullet list at line 45-50

**What to do:**
Add a bullet to the "Read the full context" step (step 2 of Initial Response), after `The relevant parts of the codebase`:
```
- `CONTEXT.md` if present — use its domain vocabulary in the plan. Reference defined terms when naming phases, steps, and components.
```

### Step 1.4: Add CONTEXT.md to `vt-implement` Layer 1 context
**File:** `commands/vt-implement.md` (modify)
**Pattern:** Follow the Layer 1 project skills section at line 497-510

**What to do:**
After the Layer 1 paragraph that ends with "Load the one you need when you need it — your context budget is better spent on code." (line 510-512), add a note about CONTEXT.md:
```
**Domain vocabulary.** If `CONTEXT.md` exists at the project root, read it before writing code. Use the defined terms in variable names, function names, comments, and commit messages. If a term has an "Avoid" column entry, don't use those synonyms.
```

### Step 1.5: Add CONTEXT.md to `vt-tech-review` context loading
**File:** `commands/vt-tech-review.md` (modify)
**Pattern:** Follow the existing bullet list at line 36-40

**What to do:**
Add a bullet to the "Read context" step (step 2 of Initial Response), after `Recent git history`:
```
- `CONTEXT.md` if present — check that code uses defined domain vocabulary consistently. Flag terminology drift in findings.
```

### Step 1.6: Add CONTEXT.md scaffolding to `vt-start`
**File:** `commands/vt-start.md` (modify)

**What to do — two changes:**

**Change A: Add domain modeling question to the service interview.**
After Round 1 (Project Identity, ~line 204), add a new sub-question within Round 1 (not a separate round — it's part of project identity):
```
Does this project have domain-specific terminology that should be consistent
across specs, plans, and code? If yes, I'll create a CONTEXT.md glossary.
```
If yes: note that CONTEXT.md will be scaffolded in Step 2.
If no or unsure: skip — CONTEXT.md can always be added later.

**Change B: Add CONTEXT.md to the project structure tree.**
In Step 2 (Create Project Structure), add `CONTEXT.md` as an optional file in the service repo structure comment, noting it's created only if the user opted in during the interview. Do NOT add it to the directory tree itself — CONTEXT.md lives at the repo root, not in `docs/`.

After the backlog file creation section, add a conditional block:
```
**If the user opted for domain modeling in Round 1:**
Create `CONTEXT.md` at the repo root with the template from ADR-002 (empty sections ready to fill).
```

### Phase 1 Verification

**Automated:**
- [ ] `npm test` — frontmatter validation passes for `skills/domain-glossary/SKILL.md`
- [ ] `npm test` — file reference validation passes for all modified files

**Manual:**
- [ ] `wc -l skills/domain-glossary/SKILL.md` — under 100 lines
- [ ] Read `commands/vt-feature.md` — CONTEXT.md bullet present in step 2
- [ ] Read `commands/vt-plan.md` — CONTEXT.md bullet present in step 2
- [ ] Read `commands/vt-implement.md` — domain vocabulary note present after Layer 1
- [ ] Read `commands/vt-tech-review.md` — CONTEXT.md bullet present in step 2
- [ ] Read `commands/vt-start.md` — domain modeling question in interview, scaffolding in Step 2

---

## Final Verification

**All automated checks:**
- [ ] `npm test` — all validation passes

**Manual testing:**
- [ ] Skill file follows ADR-001 (under 100 lines)
- [ ] Each command integration is minimal (2-3 lines added per command)
- [ ] vt-start changes are gated behind user opt-in (no forced scaffolding)

**Definition of done alignment:**
- [ ] DoD 1: `skills/domain-glossary/SKILL.md` exists, under 100 lines — Step 1.1
- [ ] DoD 2: `vt-feature` reads CONTEXT.md — Step 1.2
- [ ] DoD 3: `vt-plan` reads CONTEXT.md — Step 1.3
- [ ] DoD 4: `vt-implement` reads CONTEXT.md — Step 1.4
- [ ] DoD 5: `vt-tech-review` reads CONTEXT.md — Step 1.5
- [ ] DoD 6: `vt-start` offers scaffolding — Step 1.6

## Files Changed Summary

| File | Action | Phase | Notes |
|---|---|---|---|
| `skills/domain-glossary/SKILL.md` | create | 1 | New skill documenting CONTEXT.md convention |
| `commands/vt-feature.md` | modify | 1 | Add CONTEXT.md bullet to step 2 context loading |
| `commands/vt-plan.md` | modify | 1 | Add CONTEXT.md bullet to step 2 context loading |
| `commands/vt-implement.md` | modify | 1 | Add domain vocabulary note after Layer 1 |
| `commands/vt-tech-review.md` | modify | 1 | Add CONTEXT.md bullet to step 2 context loading |
| `commands/vt-start.md` | modify | 1 | Add domain modeling question + scaffolding |

## Risks and Fallbacks

- **Skill exceeds 100-line budget:** The CONTEXT.md format section could push over. Fallback: move the format template to `skills/domain-glossary/references/format.md` and reference it from SKILL.md.
- **Command file bloat:** Adding to 5 commands could feel heavy. Mitigated by keeping each addition to 2-3 lines max — no paragraph-level changes.

## References

- Feature spec: `docs/features/2026-04-29-domain-glossary-convention.md`
- ADR-002: `docs/decisions/2026-04-29-domain-glossary-convention.md`
- ADR-001: `docs/decisions/2026-04-29-skill-size-budget.md`
- Pattern reference: `skills/skill-authoring/SKILL.md` (skill structure template)
