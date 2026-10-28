---
name: policy-risk-known-pitfalls
description: Seed catalog of known platform-policy, terms-of-service, and regulatory pitfalls — leads to verify, not evidence
disable-model-invocation: true
---

# Known Pitfalls (leads, not evidence)

Every entry is a **lead to verify**. Policies, section numbers, and fees change, and regional rulings (EU DMA, US court orders, Japan, Korea) create exceptions. Before citing an entry, fetch the current source and confirm the clause. Add new entries when a project gets burned by something that isn't listed here.

## Payments: Stripe and other processors

| Behavior | Likely conflict | Compliant direction | Where to verify |
|---|---|---|---|
| Collect money from customers and pay part of it to a provider, seller, or driver | Processor terms forbid acting as an unlicensed payment facilitator / money transmitter by forwarding funds | Stripe Connect (or the processor's marketplace product), where the platform never holds the provider's funds | Stripe Services Agreement; Stripe Connect docs |
| Holding user balances, wallets, or stored value | Money transmission and e-money licensing | Use the processor's balances/Connect or a licensed partner | Processor terms; local regulator |
| Selling something on the processor's restricted/prohibited list | Account termination, frozen funds | Check the list before building; choose a specialized processor | Stripe Restricted Businesses list |
| Charging in the name of another business | Merchant-of-record mismatch | Connect with the correct charge type, or the seller as merchant of record | Stripe Connect charge types docs |

## Mobile stores: Apple App Store

| Behavior | Likely conflict | Compliant direction | Where to verify |
|---|---|---|---|
| Selling digital content, subscriptions, or feature unlocks consumed in the app through an external payment | In-App Purchase requirement | Use IAP (StoreKit); check the reader-app and regional external-link entitlements | App Review Guidelines §3.1.1, §3.1.3 |
| Forcing login before showing content that doesn't need an account | Guideline on not requiring registration without significant account-based features | Let users browse first; require an account only for account-bound features | App Review Guidelines §5.1.1 |
| Offering third-party social login only | Requirement to offer an equivalent privacy-focused login option | Add Sign in with Apple or an equivalent compliant option | App Review Guidelines §4.8 |
| Supporting account creation without in-app account deletion | Account deletion requirement | In-app deletion flow | App Review Guidelines §5.1.1(v) |
| Tracking across apps or sites without consent | App Tracking Transparency | ATT prompt before tracking; privacy nutrition label | App Review Guidelines §5.1.2; ATT docs |
| Physical goods or real-world services bought in the app | Usually NOT subject to IAP — avoid over-correcting | Regular processor (Stripe, etc.) | App Review Guidelines §3.1.5 |
| Undisclosed or misleading subscription terms | Subscription disclosure rules | Clear price, period, and renewal terms before purchase | App Review Guidelines §3.1.2 |
| Using required-reason APIs without a privacy manifest | Privacy manifest requirement | Declare reasons in PrivacyInfo.xcprivacy | Apple privacy manifest docs |

## Mobile stores: Google Play

| Behavior | Likely conflict | Compliant direction | Where to verify |
|---|---|---|---|
| Digital goods or subscriptions sold through an external payment | Payments policy / Play Billing requirement | Google Play Billing, or an approved alternative-billing program where available | Play Console Payments policy |
| Accounts without a deletion path | Account deletion requirement (in-app and web) | In-app and web deletion | Play Console User Data policy |
| Undeclared data collection | Data safety section | Accurate Data safety form | Play Console Data safety docs |

## Privacy and data

| Behavior | Likely conflict | Compliant direction | Where to verify |
|---|---|---|---|
| Serving users under 13 (US) or under 16 (some EU states) | COPPA / GDPR-K parental consent | Age gate and parental consent, or exclude minors | FTC COPPA rule; GDPR Art. 8 |
| Processing EU personal data | GDPR lawful basis, data-subject rights, transfers | Privacy policy, consent where required, DPA with vendors | GDPR text; local DPA guidance |
| Non-essential cookies or trackers on the web | ePrivacy consent | Consent banner before loading trackers | ePrivacy Directive; local DPA |
| Storing health data for a covered entity (US) | HIPAA | BAA-capable vendors, safeguards | HHS HIPAA guidance |
| Selling or sharing personal data (California) | CCPA/CPRA opt-out | "Do Not Sell or Share" mechanism | CPPA regulations |

## Third-party APIs and content

| Behavior | Likely conflict | Compliant direction | Where to verify |
|---|---|---|---|
| Scraping a site or reusing its data commercially | Site terms, database rights | Official API or license | Target site's terms |
| Caching or redistributing API data beyond allowed limits | API terms (for example, maps or places data) | Respect caching and attribution clauses | Provider's API terms |
| Using LLM output in prohibited use cases | Provider usage policy | Check the usage policy for the domain | LLM provider's usage policy |
| User-generated content without moderation or reporting | Store UGC rules | Report, block, and filter mechanisms | App Review Guidelines §1.2; Play UGC policy |
