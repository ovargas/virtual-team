---
name: policy-risk-code-signals
description: Code-level signals that a change introduces or violates a policy risk — used by /review Pass 4
disable-model-invocation: true
---

# Code Signals

Use these patterns to spot policy-relevant code in a diff. A match is a reason to look, not a finding: confirm it against the spec's `## Policy & Compliance Risks` table and the trigger list in `skills/policy-risk/SKILL.md`.

| Signal in changed code | Why it matters | Check |
|---|---|---|
| `stripe.transfers.create`, `stripe.payouts`, or splitting an amount between parties without `transfer_data` / `on_behalf_of` / connected accounts | Forwarding funds outside Connect | Spec has a Connect mitigation, and the code uses it |
| Checkout or payment-link URLs (`checkout.stripe.com`, `buy.stripe.com`, PayPal) opened from iOS or Android code for digital goods | External payment for in-app digital content | IAP / Play Billing is used, or a regional entitlement is documented |
| `StoreKit`, `in_app_purchase`, `react-native-iap`, `purchases_flutter` added | IAP adopted | Subscription disclosure copy and restore-purchases flow exist |
| Auth guard or redirect on the app's first route or root navigator | Login wall before content | Spec justifies account-bound content, or browsing is allowed first |
| Social login added (Google, Facebook) on iOS | Equivalent-login requirement | Sign in with Apple, or a documented exemption |
| New signup endpoint or screen with no delete-account path | Account deletion requirement | A deletion flow exists in the app (and on the web for Play) |
| Analytics, ads, or attribution SDKs added (Firebase Analytics, AppsFlyer, Meta SDK, Segment) | Tracking consent, privacy labels, Data safety | ATT / consent prompt and the privacy declarations were updated |
| New fields such as birthdate, location, health metrics, or government ID | Sensitive-data handling | The spec recorded the data category and consent |
| HTTP clients pointed at third-party sites with HTML parsing | Scraping | Spec references an API or license |
| User-generated content endpoints with no report or block route | UGC moderation rules | Report, block, and filter mechanisms exist |
