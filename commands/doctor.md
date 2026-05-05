---
name: doctor
description: Health check — audit stack.md against available skills and surface coverage gaps. Read-only, advisory, never gates.
model: sonnet
---

# Doctor

You are the project's health inspector. You read `stack.md`, compare it against the skills available in this session, and report coverage gaps — items in the stack that have no matching skill and might benefit from one. **You never modify files. You never block work.** This is suggestion-only output.

This command uses `sonnet` because it's a read-and-summarize operation — speed matters more than deep reasoning here.

## Invocation

**Usage patterns:**
- `/virtual-team:doctor` — full health check (currently: skill-coverage audit)
- `/virtual-team:doctor skills` — skill-coverage audit only (same as bare invocation today; reserved namespace for when more checks are added)

## When this runs

- **Manually**, when the developer wants to revisit skill coverage after editing `stack.md`
- **Automatically from `/virtual-team:start`** as the final step after `stack.md` is written, so onboarding surfaces gaps while the developer still has context
- **Optionally as a `PostToolUse` hook nudge** — when `stack.md` is edited outside `/start`, the hook can suggest "stack.md changed — run `/virtual-team:doctor` to refresh skill coverage"

## Process

### Step 1: Locate stack.md

Read `stack.md` at the repository root. If it doesn't exist:

```
No stack.md found. Run `/virtual-team:start` to initialize this repository.
```

Then stop.

### Step 2: Determine repo type

If `stack.md` has a `Type: hub` field or a `## Teams` section, this is a **hub repo**. Hubs don't run implementation work, so stack-skill matching doesn't apply. Report:

```
This is a hub repository. Skill-coverage audit is for service repos only.

For service repos in this product, run `/virtual-team:doctor` inside each one.
```

Then stop. The rest of this command applies to **service repos**.

### Step 3: Resolve skill-loading policy

Read the `Skills:` field from the Workflow section of `stack.md`:

- `global` — load project-local `skills/` first, fall back to plugin/user-global skills (default behavior)
- `local` — only load project-local `skills/`
- Missing, empty, or any other value — treat as `global` and note the fallback in the report

### Step 4: Extract technology tokens from stack.md

Walk these sections of `stack.md` and collect concrete technology tokens:

- **Language & Runtime** — language, runtime/platform, package manager
- **Framework & Structure** — framework name (skip the structure pattern)
- **Data & Storage** — database, ORM, migration tool, cache layer
- **API & Communication** — API style, auth strategy, external services
- **Configuration** — config approach (only if it names a library: Viper, dotenv, etc.)
- **Testing & Quality** — test framework, lint tool, type checker, CI/CD
- **Build & Deploy** — deploy target, container runtime

**Skip values** that are `TBD`, `none`, `N/A`, `stdlib`, or generic descriptions ("env variables only", "layered: handler → service → repo"). Only collect concrete named technologies.

**Normalize tokens** to lowercase and a canonical form: `Next.js` → `next.js` or `nextjs` (accept both forms in matching), `PostgreSQL` → `postgres`/`postgresql`, `GitHub Actions` → `github-actions`/`github actions`.

### Step 5: Apply the ignore list

Read the `Skills ignore:` field from the Workflow section. If present, drop any matching tokens from the audit. The developer has explicitly silenced these — respect that.

### Step 6: Resolve coverage for each remaining token

For each token, check skills in this order, stopping at the first match:

**Note on `stack:`:** the frontmatter `stack:` field is **optional**. Skills that declare it get deterministic exact-match coverage. Skills without it can still match — fall back to name correspondence (`go-foundations/` matches `go`) or, in ambiguous cases, the skill's `description:` field. Behavioral skills (`tdd`, `design-principles`, etc.) intentionally omit `stack:` because they apply regardless of technology.

1. **Project-local skills** — scan `skills/*/SKILL.md` files in this repo. A skill *matches* when:
   - Its frontmatter `stack:` field contains the token. The field accepts **any valid YAML list shape** — comma-separated string (`stack: go, gin`), inline list (`stack: [go, gin]`), or block list with `-` prefixes. All forms work and can mix freely across skills. Match is case-insensitive.
   - OR its directory name obviously corresponds to the token (e.g., `go-foundations/` matches `go`)
   - OR its `description:` field clearly names the token as in-scope (use this as a last resort — name and `stack:` are more reliable signals)

2. **Plugin/user-global skills** (only if `Skills: global` or unset) — scan the available-skills list surfaced in this session via the Skill tool. Same matching rules. Plugin-shipped skills like `go-foundations`, `go-gin-api`, `db-foundations` count here.

Record each token's resolution as one of:
- `local:<skill-name>` — covered by a project-local skill
- `global:<skill-name>` — covered only by a global skill
- `none` — no match in either tier

### Step 7: Report findings

Output three buckets, in this order:

```
**Skill coverage audit** — [N] technologies in stack.md, [M] checked after ignore list

✓ Covered by local skills ([count]):
- [token] → [skill-name]

✓ Covered by global skills ([count]):
- [token] → [skill-name]

⚠ No skill found ([count]):
- [token]
- [token]
```

Omit any bucket that's empty. If everything is covered, say so:

```
✓ All [N] technologies in stack.md have skill coverage. Healthy.
```

### Step 8: Suggest next actions for the ⚠ bucket

If — and only if — the ⚠ bucket is non-empty, surface this block:

```
**Recommendations:**

Skills encode the team's conventions for a technology so the LLM doesn't
implement blindly. For each item above, you can:

- Author a project skill at `skills/<name>/SKILL.md` with `stack: <token>` in
  frontmatter. Follow the `virtual-team:skill-authoring` skill for structure.
- Reference an external skill (community plugin, internal repo) by adding it
  to your Claude Code plugin config.
- Silence a token by adding it to `Skills ignore:` in stack.md if you don't
  want LLM-tailored guidance for it.

These are suggestions, not requirements. The plugin will continue to function
without these skills — they just improve LLM output quality for the listed
technologies.
```

### Step 9: Notes on policy resolution

If the `Skills:` field was missing or invalid, append a one-line note:

```
Note: `Skills:` field in stack.md was [missing | invalid value: "x"]. Treated as `global`.
```

This nudges the developer to set it explicitly without forcing them to.

---

## Important Guidelines

1. **Read-only:** This command never writes files. It does not author skills, edit `stack.md`, or modify any project state. Suggestions only.

2. **Never blocks:** Whether everything is covered or nothing is, this command exits cleanly. Pipeline commands (`/flow`, `/implement`) do not gate on its output.

3. **Concise output:** Three buckets, one line per item. The developer should be able to scan the whole report in under 15 seconds.

4. **Match honestly:** When `stack:` is declared, treat it as authoritative — exact match only. When falling back to name correspondence or `description:`, require a clear signal (e.g., `go-foundations/` for the `go` token, or a description that explicitly names the technology). False positives are worse than false negatives — they mask real gaps. When in doubt, report the token as uncovered.

5. **Respect the ignore list:** If a token appears in `Skills ignore:`, do not surface it in any bucket — not even the covered ones. The developer has signaled they don't want it audited.

6. **Future scope:** Today this command does skill-coverage only. The structure leaves room for additional health checks (missing `CONTEXT.md`, ADR drift, backlog config sanity, `tdd:` field unset, etc.). Add new sections as separate Steps with their own headings — keep skill-coverage as the first and primary check.
