---
name: service-layer
description: Business logic and service organization standards. Load this skill whenever writing or modifying business logic, service functions, domain rules, or orchestration code. Trigger on any work touching service files, use cases, domain logic, or business rules that aren't directly tied to API handling or database access.
---

# Service Layer Standards

These are the rules for organizing business logic in this project. Follow them when creating or modifying services, use cases, domain rules, and any code that orchestrates between data access and API responses.

## What Lives in the Service Layer

The service layer is the home for business logic — the rules and processes that make your application do what it does. It sits between the API layer (which handles HTTP) and the data layer (which handles persistence).

### Belongs Here
- Business rules and validation ("a user can't assign a task to themselves")
- Orchestration ("to create a project, also create a default board and invite the owner")
- Domain calculations ("the total invoice amount is sum of line items minus discount")
- Complex operations that span multiple data models
- External service integration logic (calling third-party APIs, sending emails)

### Does NOT Belong Here
- HTTP concerns (request parsing, response formatting, status codes) → API layer
- Database concerns (SQL, ORM queries, migrations) → Data layer
- UI concerns (formatting for display, pagination presentation) → Frontend
- Configuration and environment concerns → Config layer

## Organization

<!-- CUSTOMIZE: Replace with your conventions -->

### File Structure
- One service file per domain concept: `UserService`, `TaskService`, `NotificationService`
- Service files contain related functions, not a grab-bag of utilities
- If a service file exceeds ~300 lines, it probably mixes two concerns — consider splitting

### Naming
- Services: named by domain concept (`UserService`, `BillingService`)
- Methods: verb + noun describing the business action (`createProject`, `assignTask`, `calculateInvoiceTotal`)
- Avoid generic names: `processData`, `handleStuff`, `doThing`

### Dependencies — Interface-Based Design

**All dependencies must be interfaces, not implementations.** A service never instantiates its own dependencies — they are injected through the constructor (or function parameters) as interfaces.

This is non-negotiable because:
- It enables unit testing without real databases, APIs, or external services
- It makes dependencies explicit and visible in the constructor signature
- It allows swapping implementations (e.g., switching from PostgreSQL to MySQL, or from a real email sender to a test spy)

<!-- CUSTOMIZE: Replace with your language's interface/protocol pattern -->

**Rules:**
- Every dependency a service uses must be defined as an interface (or protocol/trait/abstract class, depending on language)
- The interface lives where the consumer is, not where the implementation is (dependency inversion)
- Constructors accept interfaces, never concrete types
- If you find yourself importing a concrete implementation inside a service, you're violating this rule
- Factory functions or dependency injection wiring lives in a separate composition layer (e.g., `main`, `app setup`, or a DI container)

**Example structure:**
```
// The service defines WHAT it needs (interface)
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(user *User) error
}

// The service accepts the interface, not the implementation
type UserService struct {
    repo UserRepository       // interface, not *PostgresUserRepo
    email EmailSender         // interface, not *SMTPClient
}

// Wiring happens elsewhere (main.go, app setup, etc.)
```

- Services depend on repository interfaces — never directly on the database or ORM
- Services may depend on other service interfaces, but watch for circular dependencies
- External services (email, payments, file storage) are defined as interfaces and wrapped in their own implementation — business logic doesn't call APIs directly

## Patterns

### Function Signature
<!-- CUSTOMIZE: Adapt to your language conventions -->

Every service function should be clear about:
1. **What it needs** (parameters — typed, validated)
2. **What it returns** (return type — explicit, not `any`)
3. **What can go wrong** (error types — documented, specific)

### Error Handling
- Throw domain-specific errors, not generic ones: `InsufficientBalanceError`, not `Error("bad")`
- Errors should carry context: "User 123 cannot be assigned to task 456 because they are not a project member"
- Let the API layer translate domain errors to HTTP responses — services don't know about HTTP
- Distinguish between:
  - **Validation errors** (bad input — the caller's problem)
  - **Business rule violations** (valid input but not allowed — domain logic)
  - **System errors** (infrastructure failure — not the caller's fault)

### Transactions
- The service layer owns transaction boundaries (not the API layer, not the data layer)
- If an operation modifies multiple tables and must be atomic, wrap it in a transaction
- If one step in a multi-step operation fails, roll back everything — no partial state
- Keep transactions as short as possible — don't hold locks while calling external APIs

### Side Effects
- Separate the decision from the side effect: first compute what should happen, then make it happen
- Side effects (sending emails, publishing events, calling external APIs) should be at the end of the function, after all validations pass
- Consider making side effects async when they don't need to block the response
- Side effects should be idempotent when possible — if the same operation runs twice, the result is the same

## Business Rules

### Where to Put Them
- Simple validations on a single field → Model/schema level
- Rules about a single entity → Service for that entity
- Rules that span multiple entities → Service for the owning concept or a dedicated orchestration service
- Rules that are used everywhere → Shared utility or domain helper

### How to Express Them
- Make business rules explicit, not buried in conditionals:
  ```
  // BAD: Rule is hidden in an if statement
  if (user.role === 'admin' || (user.role === 'manager' && project.ownerId === user.id)) { ... }

  // GOOD: Rule is named and testable
  function canEditProject(user, project): boolean { ... }
  ```
- Business rules should be independently testable
- When a rule changes, it should be clear where to change it (one place, not scattered)

## External Service Integration

### Wrapping External APIs
- Every external service gets its own wrapper: `EmailService`, `PaymentService`, `StorageService`
- The wrapper translates between the external API's interface and your domain's language
- Business logic calls `emailService.sendTaskAssignment(user, task)`, never `smtp.send({...})`
- Wrappers handle: retries, timeouts, error translation, and logging

### Resilience
- External calls can fail — always handle the failure case
- Decide per-integration: is failure blocking or non-blocking?
  - Blocking: payment must succeed before confirming an order
  - Non-blocking: failure to send a notification shouldn't fail the whole operation
- Use timeouts — never wait indefinitely for an external service
- Log external call failures with enough context to debug later

## Testing

### What to Test
- Business rules: "when [condition], then [outcome]"
- Orchestration: "when creating a project, it also creates a board and sends an invitation"
- Error cases: "when the user doesn't have permission, it throws [specific error]"
- Edge cases: boundary values, null handling, concurrent modifications

### How to Test — Interface Mocking

Because all dependencies are interfaces (see Dependencies above), testing is straightforward: inject mock implementations that you control.

<!-- CUSTOMIZE: Replace with your stack's preferred mock generation tool -->

**Prefer generated mocks over hand-written mocks.** Use your stack's mock generation tooling (e.g., `mockery` for Go, `unittest.mock` for Python, `jest.mock` for TypeScript) rather than writing mock implementations by hand. Generated mocks:
- Stay in sync with the interface automatically
- Reduce boilerplate and token usage
- Provide consistent assertion patterns across the codebase

**Mock rules:**
- Mock repository interfaces — test business logic, not database queries
- Mock external service interfaces — test integration logic, not third-party APIs
- Don't mock other services in the same domain unless testing in isolation is genuinely necessary
- Every mock should verify the contract: correct method calls, expected arguments, proper error handling
- Use descriptive test names: "should reject assignment when user is not a project member"

### Rules
- Every business rule should have at least one test
- Test the happy path AND the rejection path for every rule
- Integration tests (real database, real services) are valuable but separate from unit tests
- Keep tests fast — if a test needs a database, it's an integration test, not a unit test
- Never test implementation details — test behavior through the interface
