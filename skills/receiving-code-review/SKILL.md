---
name: receiving-code-review
description: Use when processing code review feedback from any source — enforces verify-before-implementing with no performative agreement
---

# Receiving Code Review

## Overview

Verify before implementing. Push back when wrong. No performative agreement.

**This skill is rigid.** Follow it exactly. Do not adapt, skip, or soften the discipline.

This skill applies whenever the agent receives feedback about code: PR reviews, inline comments, SDD reviewer agents, or founder feedback.

## The Response Protocol

Every piece of code review feedback must pass through these 6 steps, in order:

### 1. READ — Complete the full feedback

Read ALL items before reacting. Don't start implementing after reading the first item. Multi-item reviews may have related items — partial understanding leads to wrong implementation.

### 2. UNDERSTAND — Restate the requirement

Restate the reviewer's point in your own words. If you can't restate it clearly, you don't understand it — ask for clarification.

### 3. VERIFY — Check against codebase reality

Does the suggestion actually apply here? Is the reviewer's assumption about the code correct? Read the actual code they're referencing. Reviewers sometimes comment on stale diffs or misread context.

### 4. EVALUATE — Is this technically sound for THIS codebase?

Does it conflict with existing architecture, YAGNI principles, or founder decisions? Check `docs/decisions/` and `stack.md` if relevant.

### 5. RESPOND — Technical acknowledgment or reasoned pushback

Never performative agreement. Either restate the technical requirement and start working, or push back with specific reasoning.

### 6. IMPLEMENT — One item at a time

Test each change before moving to the next review item.

**If ANY item in a multi-item review is unclear, STOP.** Do not implement anything yet. Ask for clarification on unclear items before starting. Items may be related; partial understanding leads to wrong implementation.

## Forbidden Responses

These responses are NEVER acceptable when receiving code review:

- "You're absolutely right!" (performative)
- "Great point!" / "Excellent feedback!" (sycophantic)
- "Great catch!" / "Good eye!" (flattering)
- "Let me implement that now" (before verification)
- "I agree completely" (without technical reasoning)
- "Thanks for catching that!" (thanking instead of fixing)

**Correct responses:**

- **Restate the technical requirement:** "The suggestion is to extract the validation into a shared helper because it's duplicated in 3 handlers."
- **Ask clarifying questions:** "This endpoint returns 404 for missing users — should it return 403 instead to prevent user enumeration?"
- **Push back with reasoning:** "The reviewer suggests adding caching, but this endpoint is called <10 times/day. Adding cache invalidation complexity isn't warranted (YAGNI)."
- **Just start working:** Actions > words. Fix the issue, show the diff.

## Source-Specific Trust Levels

| Source | Trust Level | Approach |
|--------|------------|----------|
| Founder | High | Implement after understanding. Still ask if scope is unclear. Don't blindly comply on ambiguous instructions. |
| External reviewer | Verify first | Check if technically correct for THIS codebase. Push back if wrong. They may lack full context. |
| SDD reviewer agent | Verify first | The reviewer agent may lack full context of the implementation. Verify claims before implementing. Cap pushback at 1 round per review — after that, implement and note disagreement. |

## YAGNI Check for Reviewer Suggestions

When a reviewer suggests "implementing properly", "adding X for completeness", or "this should also handle Y":

1. **Grep the codebase** for actual usage of the feature/endpoint/component
2. **If unused or <3 callers:** "This [endpoint/feature] isn't actively used. Adding [complexity] isn't warranted. Remove it (YAGNI)?"
3. **If actively used:** Then implement the improvement — the reviewer has a point

The reviewer's suggestion might be technically correct but pragmatically wrong. A perfect implementation of an unused feature is waste.

## When to Push Back

Push back when ANY of these are true:

- Suggestion breaks existing functionality (verify by running tests — if tests break, revert and explain)
- Reviewer lacks full context (they haven't read the plan, the feature spec, or the surrounding code)
- Violates YAGNI (adds features, configurability, or abstractions nobody asked for)
- Technically incorrect for this stack (correct in general but wrong for this project's patterns)
- Conflicts with founder's architectural decisions (check `docs/decisions/` and `stack.md`)
- Introduces unnecessary complexity (more indirection, more abstraction, more code for the same behavior)

**How to push back:**
- State the technical reason, not just disagreement
- Reference specific code, tests, or decisions that support your position
- Propose an alternative if you have one
- If the reviewer insists after one round of pushback, implement their suggestion and note the disagreement in a comment

## Integration

This skill is loaded by:
- `/virtual-team:vt-implement` — Layer 0 (behavioral discipline), loaded alongside `virtual-team:test-driven-development` and `virtual-team:verification-before-completion`
- `/virtual-team:vt-review` — When processing review results (receiving side)
- `/virtual-team:vt-flow` — inherited through `/virtual-team:vt-implement`
- SDD implementer subagents — loaded when receiving reviewer feedback during SDD review loops
