---
name: tdd-rationalizations
description: Rationalization prevention table for strict TDD mode — thoughts that signal you're about to skip TDD discipline
disable-model-invocation: true
---

# Rationalization Prevention (strict mode only)

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
