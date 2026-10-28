---
name: policy-risk
description: Use when an idea, proposal, feature spec, plan, or code change touches payments, money flow, app-store distribution, authentication, personal data, tracking, user-generated content, regulated domains, or third-party APIs — detects platform-policy, terms-of-service, and regulatory risks early, records them as spec items with a verified source, and HALTs on unresolved Blockers
loaded_when: /idea Round 3, /proposal Phase 4, /feature Phase 3, /plan Phase 0, /flow gate after /feature, /review Pass 4
---

# Policy Risk

Catch the rejection, account freeze, or legal problem **while the feature is still a paragraph**, not after the store review or the payout hold. This is a risk alert, never legal advice — say so in every report.

## 1. Decide Whether to Scan

Read the `## Compliance Profile` section of `stack.md` (hub `stack.md` first if one exists). Then check the work against these triggers:

| Trigger | Examples |
|---|---|
| Money | charging users, subscriptions, paying out or splitting with third parties, refunds, wallets, credits |
| Store distribution | iOS / Android app, digital goods, in-app unlocks, external purchase links |
| Identity | login walls, social login, account creation and deletion |
| Data | PII, location, health, financial, children's data, tracking, analytics SDKs, ads |
| Content | user-generated content, messaging, marketplaces, AI-generated content |
| Third parties | scraping, reselling or caching third-party data, LLM or other API usage terms |
| Regulated domain | health, finance, lending, insurance, gambling, crypto, alcohol, firearms |

- **No trigger hit:** write `Policy scan: no triggers` and stop.
- **Trigger hit, but a profile field it depends on is missing or `TBD`:** HALT with that field as a decision (example: "Money flow: TBD" when the feature charges users). You cannot assess Stripe risk without knowing whether the money is yours.

## 2. Scan

1. List the concrete behaviors the work introduces (example: "user pays, provider receives 80%").
2. For each one, read `skills/policy-risk/references/known-pitfalls.md` for leads. **Leads are not evidence.** Policies change.
3. **Verify every risk against the current official source** with WebSearch/WebFetch: the provider's terms, the store's guidelines, or the regulator's text. Record the URL and the section or clause number.
4. When you cannot fetch a confirming source, keep the risk but mark it `Unverified`. Never drop it silently, and never cite a section you did not read.

## 3. Classify

| Severity | Meaning | Gate effect |
|---|---|---|
| **Blocker** | Ships as specified → store rejection, account termination, frozen funds, or clear legal exposure | HALT |
| **Must-address** | Allowed only with a specific implementation (consent screen, deletion flow, disclosure) | Becomes a DoD item |
| **Watch** | Gray area, or depends on future scope or market | Recorded only |

An `Unverified` risk keeps its severity, but the HALT message must say the source is unconfirmed.

## 4. Record

Add or update this section in the artifact being produced (idea brief, proposal Dependencies, or feature spec):

```markdown
## Policy & Compliance Risks

> Risk alert generated from public policy text — not legal advice. Confirm Blockers with counsel when money or personal data is at stake.

| ID | Risk | Source | Severity | Mitigation | Status |
|----|------|--------|----------|------------|--------|
| PR-1 | [behavior → policy conflict] | [URL §section] (fetched YYYY-MM-DD) | Blocker | [compliant alternative] | Open |
```

- **Status** is one of `Open`, `Mitigated` (the spec now uses the compliant alternative), or `Accepted` (the founder takes the risk; link the ADR).
- Every **Must-address** item also gets a matching Definition of Done line.
- When a mitigation changes the stack (example: Stripe Connect replaces direct charges), list it as a stack decision for the architect gate.

## 5. Gate

**From `/feature` onward, any `Open` Blocker HALTs**, the same way a missing stack decision does. `--auto` does not skip it. In `/idea` and `/proposal`, the business model is still moving, so present Blockers prominently and record them without halting. Present them like this:

```
⛔ Policy risk — decision required

PR-1: [risk]
Source: [URL §section]  [Unverified, if applicable]
Options:
  A) [Compliant alternative] — [cost/effort impact]
  B) [Change or drop the behavior]
  C) Accept the risk — recorded as an ADR in docs/decisions/
Recommendation: [A/B/C] because [reason]
```

- **A or B:** update the spec and set the status to `Mitigated`.
- **C:** create an ADR using `skills/adr-convention/SKILL.md`, then set the status to `Accepted` with a link to the ADR. Stating what could happen and why the risk is accepted makes the decision explicit.

## Code Review Mode

When this skill is loaded by `/review`, read `skills/policy-risk/references/code-signals.md` and check the changed files for implementations that violate a recorded risk's mitigation, or that introduce a trigger the spec never scanned. Report violations of a recorded Blocker as **Must Fix**, and new unscanned triggers as **Should Fix**.

## Evidence Rules

- Cite the policy's URL and section for every risk, or mark the risk `Unverified`.
- Write each risk as a concrete behavior conflicting with a specific clause. "Payments might have compliance issues" is not a finding.
- Flag only what this work introduces. Do not re-audit the whole product.
