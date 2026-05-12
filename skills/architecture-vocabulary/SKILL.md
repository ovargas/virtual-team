---
name: architecture-vocabulary
description: Use when evaluating architecture in tech-review — provides formal vocabulary (Depth, Seam, Leverage, Locality, Adapter, Pass-through) with diagnostic heuristics that produce precise, falsifiable findings instead of generic descriptions
---

# Architecture Vocabulary

Use these terms and heuristics when evaluating architecture. Every architecture finding should reference at least one vocabulary term. Replace generic language with precise claims.

## Terms

| Term | Definition | Diagnostic Heuristic |
|------|-----------|---------------------|
| **Depth** | Deep module: simple interface, rich functionality. Shallow module: interface nearly as complex as its implementation. | Count public methods vs lines of meaningful logic. Ratio near 1:1 = shallow. |
| **Seam** | A point where behavior can be swapped without changing surrounding code. | One adapter = hypothetical seam. Two adapters = real seam. Zero = no seam yet. |
| **Adapter** | A thin translation layer at a seam boundary. Contains no business logic. | If your adapter has business logic, it's a service pretending to be an adapter. |
| **Leverage** | How much behavior a module provides per unit of interface complexity. | **Deletion test:** imagine deleting the module. If complexity reappears across callers, it was earning its keep (high leverage). If callers barely notice, it was unnecessary indirection (low leverage). |
| **Locality** | Related changes stay together. Modifying one behavior touches one file, not five. | A single conceptual change requiring edits in 3+ files = poor locality. The concept is scattered across wrong boundaries. |
| **Pass-through** | A method or layer that receives arguments, adds nothing, and forwards them. | If you can describe it as "calls X with the same arguments," it's a pass-through. Adds stack depth and maintenance cost without value. |

## Applying the Vocabulary

When forming architecture findings, follow this protocol:

1. **Identify** which term applies to the observation
2. **Measure** using the term's diagnostic heuristic
3. **State** the finding as a falsifiable claim with evidence

## Findings: Before and After

**Before:** "This module has poor separation of concerns."
**After:** "This module is **shallow** — 14 public methods, each a thin wrapper over the database client (ratio ~1:1). Consider consolidating into fewer, deeper methods."

**Before:** "The code is tightly coupled."
**After:** "No **seam** exists between the notification service and the email provider (zero adapters). Adding a second provider would require modifying the service internals."

**Before:** "There's unnecessary abstraction here."
**After:** "The `EventDispatcher` has **low leverage** — deletion test shows callers would each add one direct call, replacing the dispatcher's 200-line interface with ~3 lines each. The indirection isn't earning its complexity."

**Before:** "Changes to billing touch too many files."
**After:** "Billing logic has **poor locality** — updating the tax calculation requires edits in `models/order.ts`, `services/billing.ts`, `utils/tax.ts`, and `api/checkout.ts` (4 files). Consider co-locating tax logic."

## Integration

This skill is loaded by:
- `commands/tech-review.md` — used during the Architecture & Structure evaluation dimension
