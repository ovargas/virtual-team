---
name: knowledge-check
description: Protocol for validating developer understanding of AI-generated technical decisions. Loaded by /plan, /pr, and the standalone /check command.
---

# Knowledge Check Skill

Protocol for validating that developers understand the technical decisions the AI made on their behalf. The AI acts as a tutor — it quizzes, evaluates, explains, and logs results.

## When This Skill Is Loaded

- **After `/plan` approval** — quiz on architectural decisions and technical approach
- **Before `/pr` submission** — quiz on implementation patterns and code decisions
- **Standalone `/check`** — developer-initiated quiz on any current work

## Developer Settings

The knowledge check triggers automatically based on the developer's home settings.

**File:** `~/.claude/settings.json`

**Setting:**
```json
{
  "knowledgeCheck": "on"
}
```

**Values:**
- `"on"` — run knowledge checks at plan and PR checkpoints (soft block: warn on gaps, always proceed)
- `"strict"` — run knowledge checks as hard blocks (must pass to proceed)
- `"off"` or absent — skip knowledge checks entirely

**How commands use this setting:**
1. Read `~/.claude/settings.json` at the start of the check step
2. If `knowledgeCheck` is `"on"` or `"strict"`, run the check
3. If `knowledgeCheck` is `"off"`, absent, or the file doesn't exist, skip silently
4. The standalone `/check` command always runs regardless of settings (developer chose to invoke it)
5. `--auto` mode on `/plan` and `/pr` always skips the check (nobody is there to answer)

---

## Question Generation

### Post-Plan Questions (Architectural Focus)

Read the approved plan and generate questions targeting:

1. **Tech choices** — Why was this library/pattern/approach chosen?
2. **Tradeoffs** — What are the downsides of the chosen approach? What was considered and rejected?
3. **Ordering** — Why are the phases in this sequence? What breaks if you reorder them?
4. **Integration** — How does this change fit into the existing system architecture?
5. **Risks** — What are the identified risks and how does the plan mitigate them?

**Source material:** The plan document, the feature spec, `stack.md`, any referenced decision records.

### Pre-PR Questions (Implementation Focus)

Read the branch diff and the implementation plan, then generate questions targeting:

1. **Patterns** — Why was this code pattern used? What existing code does it follow?
2. **Data flow** — How does data move through the new/modified code?
3. **Edge cases** — What edge cases are handled? How?
4. **Error handling** — What happens when things fail? What's the recovery path?
5. **Testing** — Why were these specific test scenarios chosen? What's covered and what isn't?

**Source material:** `git diff <base>...HEAD`, the implementation plan, the feature spec, the test files.

### Standalone /check Questions

Determine what the developer is currently working on:
1. Read `docs/backlog.md` for items in Doing (`[>]`) or Implemented (`[=]`)
2. Find the associated plan and feature spec
3. Check the current branch diff
4. Generate questions appropriate to the current stage:
   - If pre-implementation (plan exists, no code yet) → architectural questions
   - If mid-implementation (code in progress) → mix of both
   - If post-implementation (code done, pre-PR) → implementation questions

---

## Question Format (Mix)

Generate **3-5 questions** per checkpoint.

### Multiple Choice (2-3 per checkpoint)
For factual/recall questions where there's a clear correct answer.

**Structure:**
```
**Q1:** [Question about a specific decision from the plan/code]

A) [Correct answer]
B) [Plausible but incorrect alternative]
C) [Plausible but incorrect alternative]
D) [Plausible but incorrect alternative]
```

**Guidelines:**
- The correct answer should come from the actual plan/code decisions
- Wrong answers should be plausible alternatives that a developer might consider
- Don't make wrong answers obviously absurd — they should test real understanding
- Shuffle the position of the correct answer (don't always put it as A)

**Examples of good multiple choice questions:**
- "Which existing pattern does the plan reference for the new API endpoint?"
- "What database approach was chosen for the notification preferences?"
- "Which phase must complete before the frontend work can begin?"

### Open-Ended (1-2 per checkpoint)
For critical decisions where the developer needs to articulate reasoning.

**Structure:**
```
**Q4 (open):** [Question requiring explanation]

*Key concepts your answer should touch on:*
(hidden until after the developer answers)
```

**Guidelines:**
- Target the single most important architectural or implementation decision
- The question should require understanding the WHY, not just the WHAT
- Prepare 3-5 key concepts that a good answer should cover (used for evaluation)

**Examples of good open-ended questions:**
- "Why does the plan put the database migration in Phase 1 before the API changes in Phase 2?"
- "Explain the tradeoff the plan made by choosing [approach X] over [approach Y]."
- "How does the error handling in the new service align with the existing patterns?"

---

## Evaluation

### Multiple Choice
- Correct: 1 point
- Incorrect: 0 points

### Open-Ended
Evaluate against the prepared key concepts:

1. List the 3-5 key concepts the answer should cover
2. Check how many the developer's answer demonstrates understanding of
3. Score:
   - Covers 3+ key concepts → full credit (1 point)
   - Covers 2 key concepts → partial credit (0.5 points)
   - Covers 0-1 key concepts → no credit (0 points)

### Pass Threshold
- **Pass:** Score ≥ 60% of total points
- **Gaps detected:** Score < 60%

---

## Response Protocol

### Always (regardless of pass/fail)

After evaluating all answers, provide a **tutoring response** for every question:

```
## Results

**Score:** [X]/[Y] ([percentage]%)
**Result:** ✅ Passed | ⚠️ Gaps detected

### Q1: [Question]
**Your answer:** [what they said]
**Correct:** [A/B/C/D]
**Explanation:** [2-3 sentences explaining WHY this is the right answer,
referencing the specific plan section, code pattern, or decision that
informed it. This is the tutoring — make it educational, not just
"you got it right/wrong."]

### Q2: [Question]
...

### Q4 (open): [Question]
**Your answer:** [what they said]
**Key concepts:** [list the 3-5 concepts]
**Covered:** [which ones their answer demonstrated]
**Missing:** [which ones they missed]
**Explanation:** [Educational explanation of the full reasoning]
```

### On Pass (soft or strict mode)
```
✅ Knowledge check passed. Proceeding.
```

### On Gaps — Soft Mode (`"on"`)
```
⚠️ Knowledge gaps detected ([X]% score, 60% required).

Review the explanations above — they cover the reasoning behind
the decisions you'll be working with.

Proceeding with the workflow.
```
Log the gaps and continue.

### On Gaps — Strict Mode (`"strict"`)
```
⛔ Knowledge check not passed ([X]% score, 60% required).

Review the explanations above, then re-run the check:
- `/check` to try again
- Or ask questions about any concepts that are unclear

The workflow is paused until the check passes.
```
Do NOT proceed. The developer must run `/check` and pass.

---

## Logging

Write results to `docs/knowledge-checks/YYYY-MM-DD-<checkpoint>-<ticket>.md`:

```markdown
---
date: YYYY-MM-DD
developer: [git user.name or "unknown"]
ticket: [TICKET-ID]
checkpoint: plan | pr | standalone
score: [percentage]
result: pass | gaps-detected
feature: [FEAT-NNN]
plan: [path to plan if applicable]
---

# Knowledge Check: [checkpoint type] — [TICKET-ID]

## Context
- **Feature:** [feature name]
- **Plan:** [plan path]
- **Branch:** [branch name]
- **Mode:** [on | strict]

## Questions & Answers

### Q1: [Question]
- **Type:** multiple-choice
- **Answer:** [developer's answer]
- **Correct:** [correct answer]
- **Result:** ✅ | ❌

### Q2: [Question]
...

### Q4: [Question]
- **Type:** open-ended
- **Answer:** [developer's answer]
- **Key concepts covered:** [list]
- **Key concepts missed:** [list]
- **Result:** ✅ | ⚠️ partial | ❌

## Summary
- **Total score:** [X]/[Y] ([percentage]%)
- **Result:** pass | gaps-detected
- **Gaps:** [list of topics where understanding was weak, if any]
```

**Log file rules:**
- Create `docs/knowledge-checks/` if it doesn't exist
- One file per check (not per question)
- The log is committed with the next relevant commit (not its own standalone commit)
- These logs are useful for team leads to identify training needs across the organization
