# Spec Compliance Review

## Feature Spec Acceptance Criteria
{acceptance_criteria}

## Changes to Review
{git_diff_or_sha_range}

## Your Task
Review the implementation against the spec. For each acceptance criterion, check:
1. **Satisfied?** — Does the implementation fulfill this criterion?
2. **Missing?** — Is anything required by the spec that isn't implemented?
3. **Extra?** — Is anything implemented that the spec doesn't ask for (over-building)?

Be precise. Reference specific files and lines when citing issues.

## Expected Output
- **APPROVED** — Implementation matches the spec. All criteria satisfied, nothing missing, nothing extra.
- **ISSUES** — List each issue:
  - **Missing:** {what the spec requires but the implementation lacks}
  - **Extra:** {what the implementation adds beyond the spec — flag as YAGNI}
  - **Wrong:** {what contradicts the spec}
