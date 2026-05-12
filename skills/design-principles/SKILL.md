---
name: design-principles
description: Use when writing production code — enforces dependency inversion and testable design through checkpoint questions before writing function signatures and constructors
---

# Design Principles

## Mode Selection

Read `stack.md` and check the `design:` field. If the field is missing, default to **recommended**.

| `design:` value | Behavior |
|-----------------|----------|
| `strict` | Every function boundary must pass the checkpoint. Rewrite if it fails. |
| `recommended` | Check at key boundaries (constructors, service functions, handlers). Flag skips. |
| `off` | No enforcement. Skip the rest of this skill. |

**If `design: off`** — stop reading.

## Core Principle

**Accept what you need. Don't create what you use.**

A function that creates its own collaborators is a function that can't be tested in isolation. A function that receives them can be tested with any substitute — mock, stub, fake, or the real thing.

This is Dependency Inversion: depend on the behavior you need, not the thing that provides it.

## The Checkpoint

Before writing a function signature, constructor, or method — pause and ask:

### 1. "What does this function need from the outside world?"

List the external collaborators: database access, HTTP clients, file system, other services, time, randomness.

If the answer is "nothing" — no checkpoint needed. Pure logic is already testable.

If the answer is "something" — continue to question 2.

### 2. "Am I accepting it or creating it?"

<Good>
```
// Accepts its dependency — caller decides what to pass
function createUser(repo: UserRepository, data: NewUser): Promise<User>
```
</Good>

<Bad>
```
// Creates its own dependency — hardwired to one implementation
function createUser(data: NewUser): Promise<User> {
  const repo = new PostgresUserRepository(getConnectionPool())
  // ...
}
```
</Bad>

If you're about to write `new`, `import` a concrete client, or call a constructor for something that does I/O — you're creating, not accepting. Restructure.

### 3. "Am I depending on a behavior or an implementation?"

The parameter type should describe **what you need**, not **who provides it**.

<Good>
```
// Depends on behavior — any implementation works
interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}
```
</Good>

<Bad>
```
// Depends on implementation — locked to Postgres
function createUser(repo: PostgresUserRepository, data: NewUser)
```
</Bad>

Not every language has explicit interfaces. The principle still applies:
- **TypeScript/Java/C#:** Use interfaces or abstract types at boundaries
- **Python:** Use protocols (typing.Protocol) or ABC at boundaries
- **Go:** Interfaces are implicit — accept the interface, return the struct
- **Ruby/JS:** Duck typing — document the expected shape, accept any object that quacks

The key: your function's contract is with a **shape**, not a **name**.

## When This Matters Most

Not every function needs this checkpoint. Focus on **boundaries** — where your code meets the outside world:

| Boundary | Checkpoint applies | Why |
|----------|-------------------|-----|
| Service/use-case functions | **Yes** | These orchestrate — they need collaborators |
| Constructors / factory functions | **Yes** | This is where dependencies get wired |
| Route handlers / controllers | **Yes** | These connect HTTP to business logic |
| Pure business logic | No | No external dependencies to invert |
| Simple utilities | No | `formatDate()` doesn't need dependency injection |
| Glue code / composition root | No | This is *where* you wire concretes — that's its job |

## The Composition Root

Every application has one place where concrete implementations are wired together. This is the **composition root** — the entry point, the main function, the DI container setup.

Concrete instantiation belongs here, not in business logic:

```
// composition root — the ONE place that knows about concretes
const repo = new PostgresUserRepository(pool)
const emailer = new SmtpEmailService(config)
const handler = new CreateUserHandler(repo, emailer)

app.post('/api/users', (req, res) => handler.handle(req, res))
```

If you find yourself writing `new ConcreteService()` outside the composition root, pause. You're wiring in the wrong place.

## Relationship with TDD

This skill and TDD are complementary:

- **TDD asks:** "What test proves this works?"
- **This skill asks:** "Can this be tested in isolation?"

When you follow both:
1. TDD says write the test first
2. You try to write the test and realize you can't mock the dependency
3. This skill says: that's because the function creates its dependency — restructure it to accept it
4. Now the test is easy: pass a mock/stub, verify behavior

**On mocking:** TDD's guidance to prefer "real code over mocks" is about not mocking to paper over bad design. When the design is right — when dependencies are injected as abstractions — mocking is the clean, correct approach for unit tests. Integration tests still use real implementations.

## Verification Checklist

Before marking implementation steps complete:

**All modes:**
- [ ] Service functions accept their collaborators as parameters
- [ ] No concrete I/O clients instantiated inside business logic
- [ ] Parameter types describe behavior, not implementation (where the language supports it)

**Strict additionally:**
- [ ] Every boundary function passes the three checkpoint questions
- [ ] Composition root is clearly identifiable — concretes wired in one place
- [ ] Unit tests use mocks/stubs for external collaborators; integration tests use real implementations

## Common Resistance

| Thought | Response |
|---------|----------|
| "Passing dependencies everywhere is boilerplate" | It's explicit. Explicit dependencies are debuggable. Hidden ones aren't. |
| "This is over-engineering for a small project" | If you're writing tests, you need testable code. Size doesn't change that. |
| "I'll refactor to abstractions later" | Later never comes. The concrete dependency spreads through the codebase. |
| "My language doesn't have interfaces" | You don't need the keyword. Accept the shape, not the name. |
| "DI containers are complex" | You don't need a container. Constructor parameters are dependency injection. |

## Integration

This skill is loaded by:
- `/virtual-team:implement` — Layer 0 (behavioral discipline), alongside TDD
- `/virtual-team:flow` — inherited through `/virtual-team:implement`
- SDD implementer subagents — loaded when executing plan tasks

The skill self-configures by reading `stack.md`. Consumers load it the same way regardless of mode.
