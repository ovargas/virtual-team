---
id: FEAT-021
date: 2026-04-29
status: implemented
type: feature
triage: full
epic: EPIC-001
plan: docs/plans/2026-04-29-standalone-grilling-command.md
hub_decisions: [ADR-001, ADR-002]
research_level: light
yagni_verdict: build
tags: [grilling, stress-testing, assumptions, domain-vocabulary]
---

# Standalone Grilling Command (vt-grill)

> **Value:** Catch untested assumptions and terminology drift in specs and plans before they become implementation bugs.

## Problem

The AI fills gaps in specs and plans by guessing instead of asking. Feature specs may contain vague requirements ("handle errors appropriately"), unstated assumptions ("users will always provide valid input"), or terminology that hasn't been pinned down. These gaps survive into implementation, where they become bugs, scope creep, or rework.

**Trigger:** Comparative review against mattpocock/skills identified that vt-feature has interview phases, but there's no composable, standalone way to pressure-test any document after it's written. The domain-glossary convention (FEAT-020/ADR-002) is now live and explicitly references grilling as the mechanism for maintaining CONTEXT.md inline.

**Current workaround:** Users re-read specs manually or discover gaps during implementation. vt-feature's Phase 1/Phase 4 have interview elements, but they're embedded in the feature intake flow — you can't apply them to a plan or to a spec you wrote last week.

## YAGNI Assessment

**Verdict:** BUILD IT

The PO assessed this at the epic level (EPIC-001, feature #6 in ship order). The domain-glossary convention already references this feature as a future integration point. The problem is real and observed: assumptions survive into implementation where they cost more to fix.

## Solution

### What we're building

1. **`/vt-grill` command:** Takes a feature spec, plan, or any structured document and walks its decision tree branch by branch, challenging assumptions and surfacing gaps.
2. **Decision-tree traversal:** For each decision in the document, identify what it depends on, whether those dependencies are resolved, and what would break if the decision is wrong.
3. **Recommended answers:** For every question raised, provide a recommended answer with rationale. The founder can accept, modify, or reject — not fill in blanks from scratch.
4. **Codebase-first resolution:** If a question can be answered by exploring the codebase (checking existing patterns, verifying assumptions against real code), explore instead of asking. Only ask the founder what requires human judgment.
5. **CONTEXT.md maintenance:** Challenge terminology against CONTEXT.md when present. As terms crystallize during the interview, update CONTEXT.md inline. New terms get added, ambiguities get resolved, avoid-lists get populated.

### How it works

The user runs `/vt-grill docs/features/FEAT-021.md` (or `/vt-grill FEAT-007` by ID). The command:

1. Reads the target document and builds a decision tree — what claims does this document make, and what does each claim depend on?
2. For each branch of the tree (starting with the deepest dependencies first — resolve foundations before surfaces):
   - States the claim and its dependency
   - Checks if the dependency is satisfied (explicitly addressed, backed by codebase evidence, or left as an assumption)
   - If unsatisfied: poses a question with a recommended answer
   - If answerable from the codebase: answers it directly and reports the finding
3. Challenges terminology against CONTEXT.md (if present), flagging undefined terms, ambiguous usage, or drift from defined vocabulary
4. Produces a summary: decisions confirmed, gaps found, terminology updates made, items requiring founder input

### Visual concept

```
/vt-grill docs/features/FEAT-021.md

Reading feature spec...
Found 8 decisions with 12 dependencies.

── Branch 1: Data Model ──────────────────────────
Decision: "Users table stores notification preferences"
  Depends on: notification preference schema being defined
  Status: ❓ UNDEFINED — no schema specified in spec or contracts/
  Recommended: Store as JSON column with { email: bool, push: bool, digest: "daily"|"weekly"|"off" }
  Rationale: Follows the preferences pattern in src/models/user.ts:45

  [Accept / Modify / Reject]

── Branch 2: Error Handling ──────────────────────
Decision: "Retry failed email deliveries"
  Depends on: retry strategy (count, backoff, dead letter)
  Status: ✅ RESOLVED FROM CODEBASE — src/services/email.ts:112 uses
  exponential backoff with max 3 retries, dead letter to logs/failed-emails/
  No action needed.

── Terminology ───────────────────────────────────
⚠️  "notification" used 12 times but not in CONTEXT.md
Recommended: Add to glossary — Notification: a system-generated message
delivered to a user via their preferred channel (email, push, in-app).
Avoid: "alert" (reserved for system monitoring).
```

## Boundaries

### Explicitly NOT building
- **Grilling as a behavioral skill** — the logic lives in the command. Other commands (vt-feature, vt-plan) get lightweight references, not an embedded grilling phase.
- **Automatic invocation** — the user explicitly runs `/vt-grill` when they want stress-testing. No pipeline commands auto-trigger it.
- **Document rewriting** — vt-grill identifies gaps and proposes fixes, but doesn't rewrite the source document wholesale. It makes surgical updates (CONTEXT.md terms, specific gap resolutions) with user approval.

### Rabbit holes to avoid
- **Over-engineering the decision tree** — don't build a formal graph data structure. Read the document section by section, identify claims and dependencies as you go. The "tree" is a mental model for traversal, not a data structure.
- **Trying to grill every document type** — focus on feature specs and plans. Support arbitrary markdown documents as a bonus, but don't add format-specific logic for READMEs, ADRs, or other document types.
- **Deep semantic analysis** — the command should find structural gaps (undefined terms, unresolved dependencies, missing error handling) not philosophical weaknesses ("is this the right product direction?"). That's the PO's job in vt-feature Phase 2.

## Definition of Done

**The feature is complete when:**

1. A user can run `/vt-grill FEAT-NNN` or `/vt-grill path/to/document.md` and receive a structured list of assumptions, gaps, and questions with recommended answers
2. Questions answerable from the codebase are answered automatically with file:line references — the user only sees the finding, not a question
3. When CONTEXT.md exists, terminology is challenged against it — undefined terms flagged, ambiguities surfaced, updates proposed
4. CONTEXT.md is updated inline (with user approval in interactive mode, automatically in --auto mode) as terms crystallize
5. The command supports `--auto` mode for pipeline integration (accepts all recommended answers, applies CONTEXT.md updates)
6. vt-feature and vt-plan reference vt-grill as an optional follow-up step

**Verification:**

Automated:
- [ ] `npm test` passes — frontmatter validation, file reference validation for new command and any modified files
- [ ] Command file has valid YAML frontmatter with `name` and `description`

Manual:
- [ ] Run `/vt-grill` against an existing feature spec (e.g., FEAT-020) — verify it produces meaningful questions with recommended answers
- [ ] Run `/vt-grill` against a spec in a project with CONTEXT.md — verify terminology challenges appear
- [ ] Run `/vt-grill --auto` — verify it resolves questions automatically without prompting
- [ ] Verify vt-feature and vt-plan mention vt-grill in their output/documentation

## Success Metrics

**Leading (immediate):**
- vt-grill finds at least 2-3 actionable gaps when run against existing feature specs in this repo
- Users who run vt-grill before vt-plan report fewer mid-implementation surprises

**Lagging (2-4 weeks):**
- CONTEXT.md files in consumer repos grow richer over time due to grilling sessions
- Feature specs revised after grilling have fewer gaps discovered during implementation

**Failure signal:**
- Users run vt-grill and dismiss all findings as obvious or unhelpful — the questions are too shallow to add value
- vt-grill sessions take longer than writing the spec itself — the overhead exceeds the value

## Implementation Hints

### Existing patterns to follow
- **vt-validate** (`commands/vt-validate.md`) — closest structural analog. Takes a document, walks each section, verifies claims, produces a report. Follow its invocation pattern (ID lookup, path, `--auto`, `--deep` flags).
- **vt-debug Phase 2** (`commands/vt-debug.md`) — hypothesis generation pattern. vt-grill's "recommended answer" is similar to vt-debug's "ranked hypotheses with predictions."
- **Domain glossary skill** (`skills/domain-glossary/SKILL.md:64`) — already references this feature. The CONTEXT.md update logic should follow the format defined in ADR-002.

### Integration points
- **vt-feature** (`commands/vt-feature.md`) — add a note after Phase 5 suggesting `/vt-grill FEAT-NNN` as an optional quality step before story breakdown
- **vt-plan** (`commands/vt-plan.md`) — add a note after plan approval suggesting `/vt-grill` to stress-test the plan before implementation
- **domain-glossary skill** (`skills/domain-glossary/SKILL.md:64`) — update the "future" reference to point to the actual command
- **CONTEXT.md** (ADR-002) — vt-grill reads and writes this file per the convention

### API Contracts

No API contracts — this feature is internal to the plugin (a command markdown file and cross-references).

### Data model considerations
- No schema changes — this is a command file (markdown), not application code
- No migrations needed

### Technical risks
- **Question quality depends on model capability** — if the model generates shallow or obvious questions, the command adds overhead without value. Mitigation: provide clear heuristics in the command for what constitutes a "good" question (challenges an assumption, reveals a dependency, surfaces an undefined term).
- **CONTEXT.md conflicts** — if the user edits CONTEXT.md while vt-grill is running in --auto mode, changes could conflict. Mitigation: vt-grill reads CONTEXT.md once at start, accumulates updates, and writes them all at the end.

## Research Summary

Research: Light — follows established codebase patterns.

Key findings:
- `vt-validate` is the structural template for this command (document-in, findings-out)
- `vt-debug` Phase 2 (hypothesis generation) provides the pattern for "recommended answers"
- Domain-glossary skill already has a forward reference to this feature (line 64)
- No existing grilling/stress-testing capability exists — this is net-new
- ADR-002 Section 6 explicitly defines grilling's role in CONTEXT.md maintenance

## Stories

### Group 1: Core grilling command (sequential, single branch)

1. **Create vt-grill command with decision-tree walking and CONTEXT.md integration** — A user can run `/vt-grill FEAT-NNN` and receive structured findings: assumptions challenged, gaps identified, terminology checked against CONTEXT.md, all with recommended answers. Codebase-answerable questions are auto-resolved.
   Layers: command file + cross-references in vt-feature, vt-plan, and domain-glossary skill
   Acceptance:
   - `/vt-grill FEAT-020` produces meaningful findings with recommended answers
   - CONTEXT.md terms are challenged and updated when present
   - `--auto` mode resolves questions without prompting
   - `npm test` passes
   Demo: Run `/vt-grill` against an existing feature spec and see structured findings with recommendations

**Milestones:**
- After Story 1: The full grilling capability is available — users can stress-test any document

**Execution strategy:**
- Group 1 → `/virtual-team:vt-implement FEAT-021` implements the single story, one PR

## References

- Epic: `docs/epics/2026-04-29-skill-quality-deepening.md` (EPIC-001, feature #6)
- Decisions: `docs/decisions/2026-04-29-skill-size-budget.md` (ADR-001), `docs/decisions/2026-04-29-domain-glossary-convention.md` (ADR-002)
- Pattern reference: `commands/vt-validate.md` (structural template)
- Domain glossary forward reference: `skills/domain-glossary/SKILL.md:64`
- Related features: FEAT-020 (domain glossary — dependency, now live)

## Origin

Feature spec created on 2026-04-29 through structured intake.
Original description: "Add standalone grilling/interview skill" (EPIC-001, Feature #6: FEAT-GRILLING)
Epic-driven: EPIC-001 ship order #6, after FEAT-DOMAIN-GLOSSARY (#5).
