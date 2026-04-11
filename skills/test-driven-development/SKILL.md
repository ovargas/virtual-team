---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code — enforces red-green-refactor cycle with no exceptions
---

# Test-Driven Development

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**This skill is rigid.** Follow it exactly. Do not adapt, skip, or soften the discipline.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? Delete it. Start over. Implement fresh from tests.

**No exceptions** without the founder's explicit permission in this session.

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen.

**Requirements:**
- One behavior per test
- Clear name describing expected behavior (e.g., `'rejects empty email with validation error'`)
- Real code preferred over mocks (mocks only if unavoidable)
- Test must be runnable

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

Run the test command. Confirm:
- Test **fails** (not errors — a test error means setup is broken)
- Failure message matches what you expect
- Fails because the feature is **missing**, not because of a typo

**Test passes immediately?** You're testing existing behavior. Fix the test.
**Test errors?** Fix the error, re-run until it fails correctly.

### GREEN — Write Minimal Code

Write the simplest code to make the test pass. Nothing more.

<Good>
```
// Just enough to pass
async function retryOperation(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) { if (i === maxRetries - 1) throw e; }
  }
}
```
</Good>

<Bad>
```
// YAGNI — over-engineered
async function retryOperation(fn, options?: {
  maxRetries?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number) => void;
  timeout?: number;
}) { ... }
```
</Bad>

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN — Watch It Pass

**MANDATORY.**

Run the test command. Confirm:
- New test passes
- All other tests still pass
- Output clean (no errors, warnings)

**Test fails?** Fix code, not test.
**Other tests fail?** Fix now.

### REFACTOR — Clean Up

Only after green:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### REPEAT

Next failing test for next behavior.

## Rationalization Prevention

These thoughts mean STOP — you're about to skip TDD:

| Thought | Reality |
|---------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll write tests after" | Tests passing immediately prove nothing. |
| "Tests after achieve the same goals" | Tests-after verify what you built. Tests-first verify what's required. Different. |
| "Already manually tested all edge cases" | Ad-hoc, not systematic. No record, can't re-run. |
| "Deleting X hours of work is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep it as reference, write tests first" | You'll adapt it instead of writing fresh. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration entirely, then start with TDD. |
| "Test is hard to write = skip it" | Hard to test = hard to use. Listen to the test. Simplify the interface. |
| "TDD will slow me down" | TDD is faster than debugging. Measure start-to-production, not start-to-first-draft. |
| "This is just config/boilerplate" | If it can break in production, it needs a test. |
| "Existing code has no tests" | You're improving it. Start now. |
| "This is different because..." | No it isn't. Write the test. |

## Red Flags — STOP and Start Over

If any of these are true, delete the code and restart with TDD:

- Code written before test
- Test written after implementation
- Test passes immediately on first run
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "Keep as reference" or "adapt existing code"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "It's about spirit not ritual"

**All of these mean: Delete code. Start over with TDD.**

## Good Tests vs Bad Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior being tested | `test('test1')`, `test('it works')` |
| **Real** | Tests actual code behavior | Tests mock behavior instead of real code |
| **Focused** | Tests through the public interface | Tests private implementation details |
| **Intent** | Shows the API you wish existed | Obscures what the code should do |

## Verification Checklist

Before marking any implementation step complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for the expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output clean (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and error paths covered

Can't check all boxes? You skipped TDD. Start over.

## Debugging Integration

Bug found? Write a failing test reproducing it. Follow the TDD cycle. The test proves the fix works and prevents regression.

Never fix bugs without a test.

## Integration

This skill is loaded by:
- `/virtual-team:implement` — Layer 0 (behavioral discipline), loaded before domain skills
- `/virtual-team:debug` — Phase 4, when creating regression tests for the root cause
- `/virtual-team:flow` — inherited through `/virtual-team:implement`
- SDD implementer subagents — loaded when executing plan tasks
