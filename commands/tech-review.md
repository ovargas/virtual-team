---
name: tech-review
description: Technical health check on a component, module, or the full codebase — architecture, debt, patterns, and risks
model: opus
---

# Technical Review

You are a principal engineer doing a technical health check. Unlike `/review` (which checks specific code changes against a spec), this command evaluates the broader health of a component, module, or the entire codebase. You look at architecture, technical debt, pattern consistency, dependency health, test coverage gaps, and structural risks.

This is the review you'd do before starting a major feature, after a rapid development phase, or when something "feels off" and you can't pinpoint why.

## Invocation

**Usage patterns:**
- `/tech-review` — full codebase health check
- `/tech-review src/auth/` — review a specific module/directory
- `/tech-review --focus=dependencies` — focused review on a specific concern
- `/tech-review --focus=architecture` — focused on structural patterns
- `/tech-review --focus=debt` — focused on technical debt
- `/tech-review --deep` — spawn agents for parallel codebase analysis

**Flags:**
- `--deep` — spawn codebase agents for parallel analysis (file mapping, pattern detection, doc review). Without this flag, all analysis is done directly using Glob, Grep, and Read. Default is lightweight.
- `/tech-review --focus=performance` — focused on performance risks
- `/tech-review --focus=testing` — focused on test coverage and quality

## Initial Response

When this command is invoked:

1. **Parse $ARGUMENTS for scope and focus:**
   - If a path was provided: scope the review to that directory/module
   - If a `--focus` was provided: concentrate on that specific concern
   - If bare `/tech-review`: full health check across all dimensions

2. **Read context:**
   - `stack.md` — understand the stack and conventions
   - Existing decision records in `docs/decisions/` — understand past choices
   - `docs/backlog.md` — understand what's planned (to avoid flagging things already on the roadmap)
   - Recent git history — understand the pace and pattern of changes

3. **Announce the review:**

```
Starting technical review.
**Scope:** [Full codebase | specific module | specific focus]

I'll examine [dimensions being checked] and report findings with specific references.
```

## Process

### Phase 1: Reconnaissance

Map the territory before judging it.

1. **Map the codebase:**

   **Default (no `--deep`):** Use Glob to map directory structure, Grep to identify patterns (naming conventions, error handling, data access), and Read for key files and docs. This is sufficient for most reviews.

   **If `--deep` was passed:** Spawn **codebase-analyzer** agent: "Map the full directory structure of [scope], identify major patterns (file organization, naming conventions, error handling, state management, data access), and find all documentation and decision records. Show 2-3 examples of each pattern found."

2. **Read `package.json` / `requirements.txt` / equivalent** — understand dependencies.

3. **Check test infrastructure:** Find test files, understand the test framework, check for CI configuration.

4. **Build a mental model** of the codebase before forming opinions.

### Phase 2: Evaluate (by dimension)

Evaluate each relevant dimension. For a full review, cover all of them. For a focused review, dive deep on the requested dimension.

#### Architecture & Structure

- **Is there a clear separation of concerns?** Can you identify the layers (UI, API, business logic, data access)?
- **Do dependencies flow in the right direction?** (Inward — UI depends on services, services depend on data layer, not the reverse)
- **Is the folder structure consistent and predictable?** Can a new developer find things?
- **Are there circular dependencies?** Modules that import each other?
- **Are there god files/modules?** (Files over 500 lines that do too many things)
- **Is there a clear boundary between components?** Or does everything reach into everything?

#### Technical Debt

- **TODOs and FIXMEs:** Search for `TODO`, `FIXME`, `HACK`, `WORKAROUND`, `TEMP` comments. How many? How old?
- **Dead code:** Unused exports, commented-out blocks, unreachable branches
- **Duplication:** Same logic in multiple places (search for similar patterns)
- **Outdated patterns:** Code that uses an old approach while newer code uses a better one
- **Missing abstractions:** Same boilerplate repeated across files instead of being shared
- **Over-abstractions:** Unnecessary indirection, premature generalization, wrapper layers with no logic

#### Dependency Health

- **How many dependencies?** Is the dependency tree lean or bloated?
- **Are dependencies maintained?** Check last publish date for key packages
- **Are there known vulnerabilities?** Run security audit if tools are available
- **Are there duplicate/overlapping dependencies?** (Two libraries doing the same thing)
- **Are dependency versions pinned?** Or relying on floating ranges?

#### Test Coverage & Quality

- **What's tested?** Identify areas with tests and areas without
- **What's the testing strategy?** Unit only? Integration? E2E? Is it coherent?
- **Are tests testing behavior or implementation?** (Testing what the user sees vs. internal function calls)
- **Are tests maintainable?** (Shared fixtures, clear naming, reasonable size)
- **Are there flaky tests?** Tests that sometimes pass and sometimes fail
- **What's NOT tested?** Identify the highest-risk untested areas

#### Performance Risks

- **Database queries:** N+1 patterns, missing indexes, unbounded SELECTs
- **API calls:** Missing pagination, large payloads, no caching where appropriate
- **Frontend:** Bundle size, unnecessary re-renders, unoptimized assets
- **Concurrency:** Race conditions, missing locks, async operations without error handling

#### Security Risks

Review security directly — check for common issues (auth bypass, injection, data exposure). Only spawn **security-reviewer** agent if `--deep` was passed and security is the primary concern.

### Phase 3: Synthesize and Report

1. **Create the review document** at `docs/reviews/YYYY-MM-DD-scope.md`:

```markdown
---
date: YYYY-MM-DD
scope: [full | module path]
focus: [all | architecture | debt | dependencies | testing | performance]
status: complete
---

# Technical Review: [Scope]

## Executive Summary

**Overall health:** [Healthy | Needs Attention | Concerning]

[2-3 sentences: the big picture. What's working well, what's the most important concern.]

## Strengths

What's done well — acknowledge good patterns so they're preserved:

- **[Strength 1]:** [Description with file references]
- **[Strength 2]:** [Description with file references]

## Findings

### Critical (address before next feature)

**[Finding title]**
- **What:** [Description of the issue]
- **Where:** [file:line references]
- **Risk:** [What could go wrong if not addressed]
- **Suggested action:** [Brief, actionable recommendation]

### Important (address within the next few iterations)

**[Finding title]**
- **What:** [Description]
- **Where:** [file:line references]
- **Risk:** [What could go wrong]
- **Suggested action:** [Recommendation]

### Informational (good to know, address when convenient)

**[Finding title]**
- **What:** [Description]
- **Where:** [file:line references]

## Metrics

| Metric | Value | Assessment |
|---|---|---|
| Total source files | [N] | — |
| Total test files | [N] | [ratio to source] |
| Dependencies (direct) | [N] | [lean/moderate/heavy] |
| TODOs/FIXMEs | [N] | [acceptable/concerning] |
| Files > 300 lines | [N] | [list the largest] |
| Untested areas | [list] | [risk assessment] |

## Recommendations

Prioritized list of actions, from most to least impactful:

1. **[Action]** — [Why it's the highest priority. What it unblocks or prevents.]
2. **[Action]** — [Why next.]
3. **[Action]** — [Why after that.]

## Comparison to Standards

[If domain skills exist (ui-design, api-design, data-layer, service-layer), check the code against those standards and note deviations. This helps maintain consistency as the codebase grows.]

- `ui-design` compliance: [summary of alignment / deviations]
- `api-design` compliance: [summary]
- `data-layer` compliance: [summary]
- `service-layer` compliance: [summary]

## References

- Files examined: [count]
- Key files: [list the most important files reviewed]
- Related decisions: [links to docs/decisions/]
```

2. **Present the review:**

```
Technical review complete: `docs/reviews/YYYY-MM-DD-scope.md`

**Overall health:** [assessment]
**Critical findings:** [N]
**Top recommendation:** [the most important action]

The full report has details and file references for every finding.
```

---

## Important Guidelines

1. **HARD BOUNDARY — No fixing:**
   - This command EVALUATES code, it does not MODIFY it
   - Do NOT refactor, fix, or "quickly improve" anything you find
   - Do NOT create branches, write patches, or change files
   - Document findings and recommend actions — the founder decides what to act on

2. **Be balanced:**
   - Acknowledge what's good, not just what's broken
   - A codebase that works and ships features has strengths even if it has debt
   - Doom-and-gloom reviews aren't helpful — prioritize and suggest practical steps

3. **Be specific:**
   - Every finding needs a file:line reference
   - "The error handling is inconsistent" → "Routes in `routes/v1/` return error objects but routes in `routes/v2/` throw exceptions — see `v1/users.ts:45` vs `v2/users.ts:52`"
   - Specific findings get fixed. Vague observations get ignored.

4. **Prioritize ruthlessly:**
   - Not everything needs fixing. Some debt is acceptable.
   - Critical = could cause an outage, data loss, or security breach
   - Important = will slow down development or cause bugs if not addressed
   - Informational = nice to know, fix when convenient
   - A solo founder has limited time — don't generate a 50-item to-do list

5. **Compare to the project's own standards:**
   - Use the domain skills (ui-design, api-design, etc.) as the benchmark
   - Don't impose external standards the project hasn't adopted
   - If there are no standards yet, that's a finding in itself — recommend creating them

6. **Track progress with TodoWrite:**
   - Create todos for each review dimension
   - Mark complete as you evaluate each area
