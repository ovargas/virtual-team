---
id: FEAT-011
date: 2026-04-10
status: implemented
type: feature
research_level: light
yagni_verdict: build
tags: [knowledge, patterns, errors, learning, planning, cross-session]
plan: docs/plans/2026-04-10-knowledge-accumulation.md
---

# Knowledge Accumulation

> **Value:** Prevents teams from repeating the same mistakes across features by persisting implementation patterns and error fixes — knowledge learned by one developer in one session becomes available to every developer in every future session, compounding the workflow's effectiveness over time.

## Problem

Each session starts with zero knowledge of what worked and what failed in previous implementations. If a developer discovers that "the testing pattern for async handlers requires a specific setup/teardown sequence" or "the migration tool silently drops CHECK constraints," that knowledge dies with the session. The next developer (or the same developer next week) hits the same issue and spends the same time debugging it.

The memory system (`MEMORY.md`) captures user preferences and project context, but not implementation patterns and error fixes. These are fundamentally different: memory is about HOW the user wants to work; knowledge is about WHAT the codebase taught us.

Both GSD and SupaConductor maintain knowledge directories (`patterns.md` + `errors.json` and `knowledge/patterns.md` respectively). When planning new features, they inject relevant patterns from past work into the planner's context. This creates a compounding effect: every completed feature makes future features faster.

**Trigger:** Tech review (2026-04-10), Finding #3 (Important)
**Current workaround:** Developers manually document patterns in decision records or CLAUDE.md. This is inconsistent — patterns are captured ad-hoc, not systematically, and aren't injected into planning context.

## YAGNI Assessment

**Verdict:** BUILD IT

On a team, accumulated patterns prevent different developers from repeating each other's mistakes. On a solo workflow, they prevent you from repeating your own mistakes across sessions. The value compounds over time — each successful PR makes the system smarter. The implementation is lightweight: a `docs/knowledge/` directory with two files, a capture step in `/pr`, and a load step in `/plan`. No database, no indexing, no complex retrieval.

## Solution

### What we're building

1. **Knowledge directory:** `docs/knowledge/` with two files:
   - `patterns.md` — implementation patterns that worked well, organized by domain tag
   - `errors.md` — errors encountered and their fixes, with context for when they apply
2. **Capture hook in `/pr`:** After a successful PR, extract patterns and errors from the implementation session and append to the knowledge files.
3. **Load hook in `/plan`:** When planning a new feature, read relevant knowledge entries (matched by domain skill tags) and inject them as planning context.
4. **Bounded injection:** Cap injected knowledge at a reasonable token budget (top-N most relevant entries) to prevent context growth as the knowledge base accumulates.

### How it works

**Capture (after `/pr`):**

When `/pr` completes successfully, the flow (or the user manually) triggers a knowledge extraction step:

1. Review the implementation diff and review findings
2. Extract patterns: "What worked well that isn't obvious from the code alone?"
   - Testing patterns specific to this codebase
   - Integration patterns (how services connect)
   - Error handling patterns that prevented issues
   - Performance patterns (caching, query optimization)
3. Extract error fixes: "What broke and how was it fixed?"
   - The error symptom (what the developer saw)
   - The root cause (what was actually wrong)
   - The fix (what resolved it)
   - When it applies (under what conditions this error recurs)
4. Append to knowledge files with domain tags and date

**Knowledge file format:**

```markdown
# Implementation Patterns

## api-design

### Async handler testing requires explicit event loop drain (2026-04-10)
When testing async route handlers, call `await flushPromises()` after the
handler returns. Without this, assertion runs before the async side-effect
completes. Discovered during FEAT-009 implementation.

### Rate limiting middleware must be registered before auth (2026-04-15)
If rate limiting runs after auth, authenticated users bypass rate limits
on failed auth attempts. Order in middleware stack matters.

## data-layer

### Migration tool silently drops CHECK constraints (2026-04-10)
The ORM's migration generator doesn't support CHECK constraints. Add them
in a raw SQL migration step after the generated migration. Verify with
`SHOW CREATE TABLE` after migration runs.
```

```markdown
# Error Fixes

## Error: "Cannot read properties of undefined (reading 'id')" in test
- **When:** Testing service layer with mocked repository
- **Root cause:** Mock didn't return the full object shape — missing nested relations
- **Fix:** Use factory function that produces complete objects, not partial mocks
- **Domain:** service-layer, data-layer
- **Date:** 2026-04-10

## Error: "ECONNREFUSED" on integration test startup
- **When:** Running integration tests in CI
- **Root cause:** Database container not ready when tests start
- **Fix:** Add health check wait loop before test suite: `until pg_isready; do sleep 1; done`
- **Domain:** data-layer
- **Date:** 2026-04-12
```

**Load (during `/plan`):**

When `/plan` Phase 1 (Codebase Analysis) runs:

1. Read `docs/knowledge/patterns.md` and `docs/knowledge/errors.md`
2. Match entries by domain tags against the feature's affected domains (determined by which domain skills the plan will load)
3. Inject top-N most relevant entries (capped at ~500 tokens) into the planning context as "Lessons from previous implementations"
4. The planner uses these to inform phase ordering, testing strategy, and risk identification

**Bounded injection (prevents context bloat):**

As the knowledge base grows, inject only the most relevant entries:
- Match by domain tags (api-design entries for API features, data-layer entries for migration features)
- Sort by recency (recent patterns more likely relevant)
- Cap at top-3 patterns + top-3 errors per domain
- Total injection budget: ~500 tokens (following SupaConductor's approach)

## Boundaries

### Explicitly NOT building
- Automatic pattern detection — the capture step requires human judgment about what's worth saving
- Semantic search / embeddings — matching by domain tags is sufficient
- Knowledge sharing across repositories — each repo has its own knowledge directory
- Deduplication or conflict resolution — append-only is fine; entries can be manually pruned

### Rabbit holes to avoid
- Building a knowledge "database" — these are markdown files, not a retrieval system
- Auto-extracting patterns from every diff — most diffs don't contain non-obvious patterns; the capture step should be intentional
- Complex relevance scoring — domain tag matching + recency is sufficient

## Definition of Done

**The feature is complete when:**

1. `docs/knowledge/` directory exists with `patterns.md` and `errors.md`
2. After a successful `/pr`, the flow offers to capture patterns and errors from the implementation
3. `/plan` Phase 1 reads relevant knowledge entries and includes them as planning context
4. Knowledge injection is bounded (top-N entries, capped tokens) to prevent context bloat
5. Knowledge files can be manually edited (add, remove, reorganize entries)

**Verification:**

Automated:
- [ ] Knowledge files exist and follow the documented format
- [ ] `/plan` loads relevant entries based on domain tag matching

Manual:
- [ ] Complete a `/flow` cycle, capture a pattern, then verify it appears in the next `/plan` for a related feature
- [ ] Verify knowledge injection doesn't exceed token budget as entries accumulate

## Success Metrics

**Leading (immediate):**
- At least 1 pattern or error captured per completed feature
- `/plan` includes relevant knowledge context when planning features in domains with existing entries

**Lagging (2-4 weeks):**
- Reduction in "same mistake twice" incidents — debugging time decreases for recurring error classes
- Team members benefit from patterns discovered by other team members

**Failure signal:**
- Knowledge entries are never referenced during planning (irrelevant or too generic)
- Capture step is consistently skipped (too much friction)

## Implementation Hints

### Existing patterns to follow
- `.claude/skills/checkpoints/SKILL.md` — file-based persistence pattern
- `docs/decisions/` directory — similar "accumulate knowledge over time" pattern
- SupaConductor's `conductor/knowledge/` — validated the bounded injection approach

### Integration points
- `/pr` command (or `/flow` after PR step) — capture hook
- `/plan` Phase 1 (Codebase Analysis) — load hook
- Domain skill tags from plan/spec — used for relevance matching

### API Contracts

No API contracts — this feature is internal workflow knowledge management.

### Technical risks
- Knowledge entries may become stale as the codebase evolves — mitigation: include date on every entry; during load, note if an entry is >3 months old
- Over-injection could confuse the planner with irrelevant patterns — mitigation: strict token budget + domain tag matching

## Research Summary

Research: Light. GSD's `.planning/knowledge/` (patterns.md + errors.json) and SupaConductor's `conductor/knowledge/` both validate this approach. SupaConductor caps injection at 500 tokens. See `docs/reviews/2026-04-10-claude-workflow-system.md`, Finding #3.

## Stories

**Group 1: Knowledge system** (sequential, single branch)

1. **S-009: Create knowledge directory and capture step** — After this, `docs/knowledge/` exists with patterns.md and errors.md, and `/pr` (or `/flow` post-PR) offers to capture patterns and errors from the implementation.
   Layers: knowledge directory + pr.md capture logic
   Acceptance: Knowledge files created with documented format; capture step extracts at least one pattern from a completed implementation
   Demo: Complete a feature, run capture, show the knowledge entry

2. **S-010: Add knowledge injection to `/plan`** — After this, `/plan` Phase 1 reads relevant knowledge entries (matched by domain tags) and includes them as bounded planning context.
   Layers: plan.md Phase 1 logic + domain tag matching
   Acceptance: Planning context includes relevant patterns; injection is capped at ~500 tokens; irrelevant domains are excluded
   Demo: Plan a feature in a domain with existing knowledge entries, show the injected context

## References

- Tech review: `docs/reviews/2026-04-10-claude-workflow-system.md` (Finding #3)
- Comparison: GSD `.planning/knowledge/`, SupaConductor `conductor/knowledge/`
- Related: Memory system (`.claude/memory/MEMORY.md`) — complementary, not overlapping

## Origin

Feature spec created on 2026-04-10 through structured intake.
Original description: "Tech review finding #3 (Important): No knowledge accumulation across sessions"
