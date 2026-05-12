---
name: tdd-test-quality
description: Good vs bad test quality comparison table — use when reviewing test quality or writing new tests
disable-model-invocation: true
---

# Good Tests vs Bad Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior being tested | `test('test1')`, `test('it works')` |
| **Real** | Tests actual code behavior | Tests mock behavior instead of real code |
| **Focused** | Tests through the public interface | Tests private implementation details |
| **Intent** | Shows the API you wish existed | Obscures what the code should do |
