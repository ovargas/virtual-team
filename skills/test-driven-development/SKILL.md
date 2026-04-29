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

**If `tdd: off`** — stop reading. Do not enforce any TDD discipline.

## Anti-Pattern: Horizontal Slicing

<Bad>
Horizontal slicing — write all tests first, then all implementation:
  test1, test2, test3, test4, test5 → impl1, impl2, impl3, impl4, impl5
  Tests describe imagined behavior. Discovery comes too late.
</Bad>

<Good>
Vertical slicing (tracer bullets) — one test, one impl, repeat:
  test1 → impl1 → test2 → impl2 → test3 → impl3
  Each test responds to what the previous cycle taught you.
</Good>

**The rule:** ONE test, ONE implementation, then the next test. Never batch. Each RED-GREEN cycle is a learning step — the next test is informed by what you just discovered.

## The Cycle

### RED — Write one failing test

- One behavior per test, clear name (e.g., `'rejects empty email with validation error'`)
- Real code preferred over mocks (mocks only if unavoidable)
- Run the test. Confirm it **fails** for the expected reason (feature missing, not typo/error)

### GREEN — Write minimal code to pass

Write the simplest code to make the test pass. Nothing more.

<Good>
// Just enough to pass
async function retryOperation(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) { if (i === maxRetries - 1) throw e; }
  }
}
</Good>

<Bad>
// YAGNI — over-engineered beyond what the test requires
async function retryOperation(fn, options?: {
  maxRetries?: number; backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number) => void; timeout?: number;
}) { ... }
</Bad>

Run the test. Confirm it passes. Confirm all other tests still pass.

### REFACTOR — Then repeat

Only after green: remove duplication, improve names, extract helpers. Keep tests green. Don't add behavior. Then write the next failing test for the next behavior.

## When TDD Is Skipped (recommended mode only)

In `recommended` mode, if you write production code before a test:
1. **Log the skip** — note which function/method was written without test-first
2. **Write the test immediately after** — cover the code before moving on
3. **Flag it** in phase verification as a TDD skip with a brief reason

**In `strict` mode**, skips are not allowed. Delete the code and start over.

## Reference Material

- **Test quality:** See [skills/test-driven-development/references/test-quality.md](references/test-quality.md) — load when reviewing test quality
- **Rationalization prevention:** See [skills/test-driven-development/references/rationalizations.md](references/rationalizations.md) — load in strict mode when tempted to skip TDD

## Verification Checklist

Before marking any implementation step complete:
- [ ] All tests pass, output clean (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and error paths covered
- [ ] Every new function/method has a test (strict + recommended)
- [ ] Tests written before implementation, or skip logged (recommended) / code deleted (strict)
- [ ] Each test failed for the expected reason before implementation (strict)

## Debugging Integration

Bug found? Write a failing test reproducing it first. In `recommended` mode, strongly encouraged. In `strict` mode, mandatory.
