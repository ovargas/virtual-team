---
name: verification-before-completion
description: Use before making any completion claim — enforces evidence-before-claims with no exceptions
---

# Verification Before Completion

## Overview

No completion claims without fresh verification evidence.

**This skill is rigid.** Follow it exactly. Do not adapt, skip, or soften the discipline.

"Claiming work is complete without verification is dishonesty, not efficiency."

## The Iron Rule

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

Before the agent says ANYTHING positive about work status — "done", "tests pass", "looks good", "fixed", "complete" — it must pass the gate function below.

## The Gate Function

Every positive claim about work status must pass through these 5 steps, in order:

### 1. IDENTIFY — What command proves this claim?

Name the exact command. "Tests pass" → `npm test` or `pytest`. "Build succeeds" → `npm run build`. No vague references.

### 2. RUN — Execute the command fresh

Run it NOW. Not "I ran it earlier." Not "it passed last time." Fresh means in this message exchange.

### 3. READ — Full output, check exit code, count failures

Read the ENTIRE output. Check the exit code. Count failures, errors, warnings. Don't skim. Don't assume.

### 4. VERIFY — Does output actually confirm the claim?

Does the output ACTUALLY say what you're about to claim? "0 failures" confirms "tests pass." "exit 0" confirms "build succeeds." Partial output does not confirm total success.

### 5. ONLY THEN — Make the claim, citing the evidence

Now you may claim. Cite the evidence: "Tests pass (24 passed, 0 failed)." "Build succeeded (exit 0, no warnings)."

**If any step fails or is skipped, the claim cannot be made.**

## Claim-Evidence Table

| Claim | Required Evidence | Not Sufficient |
|-------|------------------|----------------|
| "Tests pass" | Test command output showing 0 failures in this message | Previous run, "should pass", partial suite |
| "Build succeeds" | Build command with exit code 0 | Linter passing, "compiled without errors" |
| "Bug fixed" | Reproduction test now passes (run fresh) | "Code changed, should work now" |
| "Phase complete" | All phase verification checks green (shown above) | "Code looks correct to me" |
| "PR ready" | Tests + lint + type check all run fresh | "I verified earlier in the session" |
| "Linting clean" | Lint command output showing 0 errors | "No lint rules violated" without running |
| "Type check passes" | Type checker output with 0 errors | "Types look correct" |
| "Feature works" | Demo or test proving the feature operates as specified | "I followed the spec correctly" |

## Rationalization Prevention

These thoughts mean STOP — you're about to skip verification:

| Thought | Reality |
|---------|---------|
| "I just ran it" | Was it in THIS message? If not, it's stale. Run again. |
| "The code is obviously correct" | Obvious code fails. Run the proof. |
| "Nothing changed since last run" | Something always changes. Re-run costs seconds. |
| "Tests would catch it" | Did you run them? Show the output. |
| "I'm confident this works" | Confidence is not evidence. Run the command. |
| "It's just a small change" | Small changes cause big failures. Verify. |
| "Verification will slow me down" | False completion claims waste MORE time. Verify. |
| "The founder can test it" | Your job is to deliver verified work, not unverified drafts. |
| "I verified a similar thing earlier" | Similar is not same. This claim needs this evidence. |
| "Let me just commit and we'll see" | No. Verify before commit, not after. |

## Red Flags — STOP Before Claiming

If any of these are true, you are about to make an unverified claim:

- Using "should", "probably", "seems to" about work status
- Saying "Great!", "Perfect!", "Done!" before running verification
- About to commit, push, or create a PR without fresh test output
- Claiming phase-complete based on visual code review alone
- Expressing satisfaction before checking exit codes
- Referencing a verification run from earlier in the conversation as current proof
- Saying "all tests pass" without test output visible in this message
- Claiming "no errors" without having run the checker

**Any of these mean: STOP. Run verification. Show output. Then claim.**

## What "Fresh" Means

- **Fresh evidence** = command was run AND output was read in the current message exchange
- **Stale evidence** = output from a previous message, a previous phase, or a previous session
- **Exception:** If a verification command was run 2-3 tool calls ago in the SAME message and NO code was modified since, the evidence is still fresh. The rule targets recall across message boundaries, not ritual re-runs within the same step.

## Integration

This skill is loaded by:
- `/virtual-team:vt-implement` — Layer 0 (behavioral discipline), loaded alongside `virtual-team:test-driven-development`
- `/virtual-team:vt-commit` — Before committing, verify tests pass fresh
- `/virtual-team:vt-pr` — Before creating PR, full verification suite run fresh
- `/virtual-team:vt-debug` — Before claiming "root cause found", verify hypothesis with evidence
- `/virtual-team:vt-review` — Before issuing verdict, verify claims about code behavior
- `/virtual-team:vt-flow` — inherited through `/virtual-team:vt-implement`
