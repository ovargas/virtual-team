# Code Quality Review

## Plan Requirements
{plan_requirements}

## Changes to Review
{git_diff_or_sha_range}

## Your Task
Review the implementation for code quality. Categorize each issue:
- **Critical** — Must fix before proceeding (security, data loss, broken functionality)
- **Important** — Should fix (performance, maintainability, pattern violations)
- **Minor** — Nice to fix (naming, style, minor improvements)

## Focus Areas
- Correctness: Does the code do what it says?
- Patterns: Does it follow existing codebase patterns?
- Security: Any OWASP top 10 vulnerabilities?
- Performance: Any obvious performance issues?
- Tests: Are tests meaningful (not just passing)?

## Expected Output
- **APPROVED** — No critical or important issues
- **ISSUES** — List each issue with category, file:line, and fix suggestion
