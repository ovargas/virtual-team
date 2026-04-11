---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code — enforces red-green-refactor cycle with configurable strictness
---

# Test-Driven Development

## Mode Selection

Read `stack.md` and check the `tdd:` field. If the field is missing, default to **recommended**.

| `tdd:` value | Behavior |
|-------------|----------|
| `strict` | Iron law — no production code without a failing test. Delete and restart on violations. |
| `recommended` | TDD is the expected workflow. Warn when skipped, log the skip, but proceed. |
| `off` | No TDD enforcement. Tests are encouraged but not gated. Skip the rest of this skill. |

**If `tdd: off`** — stop reading. Do not enforce any TDD discipline. Write tests when appropriate but don't gate implementation on them.

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

## The Cycle

### RED — Write Failing Test

Write one minimal test showing what should happen.

**Requirements:**
- One behavior per test
- Clear name describing expected behavior (e.g., `'rejects empty email with validation error'`)
- Real code preferred over mocks (mocks only if unavoidable)
- Test must be runnable

### Verify RED — Watch It Fail

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

## When TDD Is Skipped (recommended mode only)

In `recommended` mode, if you write production code before a test, **do not delete it**. Instead:

1. **Log the skip** — note which function/method was written without a test-first approach
2. **Write the test immediately after** — cover the code you just wrote before moving on
3. **Flag it** in the phase verification:
   ```
   ⚠️ TDD skip: wrote `handleTimeout()` before test. Test added after. Reason: [brief reason].
   ```

This keeps the team aware of where discipline slipped without blocking progress. Over time, the skip log reveals patterns — if the same developer or area skips repeatedly, it's a signal to address.

**In `strict` mode**, skips are not allowed. Delete the code and start over with TDD.

## Good Tests vs Bad Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior being tested | `test('test1')`, `test('it works')` |
| **Real** | Tests actual code behavior | Tests mock behavior instead of real code |
| **Focused** | Tests through the public interface | Tests private implementation details |
| **Intent** | Shows the API you wish existed | Obscures what the code should do |

## Rationalization Prevention (strict mode only)

These thoughts mean STOP — you're about to skip TDD:

| Thought | Reality |
|---------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll write tests after" | Tests passing immediately prove nothing. |
| "Tests after achieve the same goals" | Tests-after verify what you built. Tests-first verify what's required. Different. |
| "Deleting X hours of work is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Test is hard to write = skip it" | Hard to test = hard to use. Listen to the test. Simplify the interface. |
| "TDD will slow me down" | TDD is faster than debugging. Measure start-to-production, not start-to-first-draft. |
| "This is different because..." | No it isn't. Write the test. |

**Red flags — delete code and restart (strict mode):**
- Code written before test
- Test written after implementation
- Test passes immediately on first run
- Rationalizing "just this once"

## Verification Checklist

Before marking any implementation step complete:

**All modes:**
- [ ] All tests pass
- [ ] Output clean (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and error paths covered

**Strict and recommended additionally:**
- [ ] Every new function/method has a test
- [ ] Tests were written before implementation (or skip logged in recommended mode)

**Strict only:**
- [ ] Watched each test fail before implementing
- [ ] Each test failed for the expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test

## Debugging Integration

Bug found? Write a failing test reproducing it first. The test proves the fix works and prevents regression.

In `recommended` mode, this is strongly encouraged. In `strict` mode, it's mandatory — never fix bugs without a test.

## Integration

This skill is loaded by:
- `/virtual-team:implement` — Layer 0 (behavioral discipline), loaded before domain skills
- `/virtual-team:debug` — Phase 4, when creating regression tests for the root cause
- `/virtual-team:flow` — inherited through `/virtual-team:implement`
- SDD implementer subagents — loaded when executing plan tasks

The skill self-configures by reading `stack.md`. Consumers load it the same way regardless of mode.
