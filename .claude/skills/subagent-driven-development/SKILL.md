---
name: subagent-driven-development
description: Use when /implement --sdd is active — defines orchestration protocol for fresh subagent per task with two-stage review
---

# Subagent-Driven Development

## Overview

The orchestrator dispatches, never implements. Fresh subagent per task. Two-stage review, every task.

When `/implement --sdd` is active, the main session becomes an **orchestrator** that never writes code itself. It dispatches implementer subagents, manages review cycles, and tracks progress.

**Use SDD when:** Plans with 5+ tasks, multi-file implementations, complex features.
**Don't use SDD when:** Small plans (< 3 tasks), quick fixes, single-file changes. Use inline `/implement` instead.

## Orchestration Protocol

For each task in the plan:

### 1. Extract Task

Pull full task text from the plan. Include the step description, file references, pattern references, and what-to-do instructions. **Never tell the subagent to "read the plan file"** — provide everything it needs in the prompt.

### 2. Build Scene-Setting Context

Every subagent starts fresh. It has no memory of previous tasks. Provide:
- Tasks completed so far and their outcomes
- Files created or modified by previous tasks
- Verification results from previous tasks
- Where this task fits in the overall plan

### 3. Select Model

Use the model selection table below. When in doubt, use Sonnet.

### 4. Dispatch Implementer Subagent

Use the implementer prompt template from `implementer-prompt.md`. Fill in:
- `{scene_setting}` — context from step 2
- `{task_text}` — full task text from step 1
- `{domain_skill_instruction}` — the relevant Layer 1 domain skill for this task

### 5. Handle Implementer Status

- **DONE** → Proceed to spec review (step 6)
- **DONE_WITH_CONCERNS** → Read concerns. If they're minor, proceed to review. If they indicate a problem, address before reviewing.
- **NEEDS_CONTEXT** → Provide the missing context and re-dispatch the implementer.
- **BLOCKED** → Assess root cause:
  - Context problem → Re-dispatch with more context
  - Reasoning problem → Upgrade model (e.g., Sonnet → Opus) and re-dispatch
  - Plan problem → Escalate to founder (stop and report)

### 6. Dispatch Spec Reviewer

Use the spec reviewer prompt template from `spec-reviewer-prompt.md`. Fill in:
- `{acceptance_criteria}` — from the feature spec for this task
- `{git_diff_or_sha_range}` — the changes from the implementer

### 7. Handle Spec Review Result

- **APPROVED** → Proceed to code quality review (step 8)
- **ISSUES** → Dispatch implementer to fix → Spec reviewer re-reviews → Loop (max 3 iterations). After 3 failed iterations, escalate to founder.

### 8. Dispatch Code Quality Reviewer

Use the code quality reviewer prompt template from `code-quality-reviewer-prompt.md`. Fill in:
- `{plan_requirements}` — what this task was supposed to do
- `{git_diff_or_sha_range}` — the changes (including any fixes from spec review)

### 9. Handle Quality Review Result

- **APPROVED** → Mark task complete (step 10)
- **ISSUES (Critical or Important)** → Dispatch implementer to fix → Quality reviewer re-reviews → Loop (max 3 iterations). Minor issues are logged but don't block.

### 10. Mark Task Complete

Log the outcome and advance to the next task.

**After all tasks:** Dispatch a final holistic code review across the entire implementation (all tasks combined). Then proceed to the standard `/implement` completion flow (verification, DoD alignment, backlog updates).

## Key Rules

- **Never dispatch multiple implementers in parallel** — They'd conflict on files
- **Never skip reviews** — Both spec compliance AND code quality, every task
- **Spec review BEFORE code quality review** — Wrong order wastes quality reviewer time on code that doesn't meet spec
- **Never let implementer read the plan file** — Provide full task text directly
- **Provide scene-setting context** — Every subagent starts fresh, needs orientation
- **Cap review loops at 3 iterations** — Escalate to founder after that
- **Implementer subagents load Layer 0 skills** — TDD, verification, review reception

## Model Selection

| Task Type | Signals | Model |
|-----------|---------|-------|
| Mechanical implementation | 1-2 files, clear spec, follows existing pattern | Haiku or Sonnet |
| Integration work | Multi-file changes, coordination between components | Sonnet |
| Architecture/design | New patterns, judgment calls, broad codebase impact | Opus |
| Spec review | Comparison task, structured checklist | Sonnet |
| Code quality review | Pattern matching, security awareness | Sonnet |

When in doubt, use Sonnet — it's the safe middle ground.

## Integration

This skill is loaded by:
- `/implement` — When `--sdd` flag is active, defines the execution model
- `/flow` — Passes `--sdd` to `/implement` when `--deep` is used
