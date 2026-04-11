---
name: go-practices
description: Go-specific patterns for dependency injection, interface design, testing with mockery, and idiomatic project structure. Layers on top of generic skills (service-layer, api-design, data-layer) with concrete Go patterns.
stack: go
loaded_when: Working on .go files — services, repositories, handlers, or tests
---

# Go Practices

These are Go-specific conventions that implement the architectural principles from the generic skills (`service-layer`, `api-design`, `data-layer`). When this skill conflicts with a generic skill, this skill wins — it's the concrete implementation for this stack.

<!-- CUSTOMIZE: Add your specific Go version, module path, project layout, and any additional conventions below -->

## Dependency Inversion in Go

Go's implicit interface satisfaction makes dependency inversion natural — but only if you follow the pattern consistently.

### The Core Pattern

**Interfaces are defined where they are consumed, not where they are implemented.**

```go
// internal/user/service/user_service.go — the CONSUMER defines what it needs

type UserRepository interface {
    FindByID(ctx context.Context, id string) (*model.User, error)
    Save(ctx context.Context, user *model.User) error
}

type UserService struct {
    repo   UserRepository   // interface, not *repository.userRepository
    email  EmailSender      // interface, not *smtp.Client
    logger Logger           // interface, not *zap.Logger
}

func NewUserService(repo UserRepository, email EmailSender, logger Logger) *UserService {
    return &UserService{repo: repo, email: email, logger: logger}
}
```

### Unexported Struct, Exported Constructor, Interface Return

The implementation struct is **unexported** (lowercase). The constructor is exported and returns the **consumer's interface type**, not the concrete type. This gives two guarantees:

1. No one outside the package can depend on the concrete type
2. The compiler validates the interface contract at the implementation site — missing methods are caught here, not at the injection point

```go
// internal/user/repository/postgres_user.go — the IMPLEMENTATION

import (
    "myapp/internal/user/model"
    "myapp/internal/user/service"
)

// unexported struct — no one outside this package can name it
type userRepository struct {
    db *sql.DB
}

// exported constructor returns the consumer's interface
func NewUserRepository(db *sql.DB) service.UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
    // implementation
}

func (r *userRepository) Save(ctx context.Context, user *model.User) error {
    // implementation
}
```

**Why this matters:** If `userRepository` is missing a method that `service.UserRepository` requires, the compiler error appears in `NewUserRepository` — right where you're building the implementation. You don't discover it later in `main.go` or when a test fails.

### Multi-Consumer Interfaces

When the same implementation satisfies interfaces from different consumers, the constructor returns a composite interface:

```go
// Two different consumers need different views of the same repository
// package service:   type UserRepository interface { FindByID(...); Save(...) }
// package reporting: type UserQuery interface { FindByID(...); ListActive(...) }

// The constructor returns both
func NewUserRepository(db *sql.DB) interface {
    service.UserRepository
    reporting.UserQuery
} {
    return &userRepository{db: db}
}
```

Each consumer still receives only the interface it declared — the composite is only visible at the wiring site. This keeps each consumer's dependency minimal.

### Wiring — Module Factory Pattern

Each module exports a **factory function** at the module root package (`internal/user/`) that wires its own internals and returns a struct of ready-to-use components. This keeps the composition root clean — `main.go` only knows about modules, not their internal layers.

```go
// internal/user/module.go — the module's public factory
package user

import (
    "database/sql"

    "myapp/internal/user/handler"
    "myapp/internal/user/repository"
    "myapp/internal/user/service"
)

// Services exposes what this module provides to the outside world
type Services struct {
    Handler     *handler.UserHandler
    UserService service.UserService      // exposed as interface for cross-module use
}

// New wires the module's internal dependency graph and returns ready-to-use components
func New(db *sql.DB, emailSender service.EmailSender, logger service.Logger) *Services {
    repo := repository.NewUserRepository(db)               // returns service.UserRepository
    svc := service.NewUserService(repo, emailSender, logger)
    h := handler.NewUserHandler(svc)

    return &Services{
        Handler:     h,
        UserService: svc,
    }
}
```

**Why this matters:** Without the factory, `main.go` ends up with aliased imports for every layer of every module (`userRepo`, `userSvc`, `userHandler`, `taskRepo`, `taskSvc`...). With the factory, `main.go` only imports module root packages — no aliasing needed.

```go
// cmd/server/main.go — clean composition root

import (
    "myapp/internal/user"
    "myapp/internal/task"
    "myapp/internal/shared/email"
)

func main() {
    db := setupDB()
    emailSender := email.NewEmailSender(cfg.SMTP)

    // One call per module — each module wires itself
    userMod := user.New(db, emailSender, logger)
    taskMod := task.New(db, logger)

    // Wire routes
    router := gin.Default()
    userMod.Handler.RegisterRoutes(router)
    taskMod.Handler.RegisterRoutes(router)
    router.Run(":8080")
}
```

#### Cross-Module Dependencies

When one module needs another module's service, pass the interface through the factory:

```go
// internal/task/module.go
package task

type Services struct {
    Handler     *handler.TaskHandler
    TaskService service.TaskService
}

// task.New receives the user service interface — not the user module struct
func New(db *sql.DB, userService service.UserQuerier, logger service.Logger) *Services {
    repo := repository.NewTaskRepository(db)
    svc := service.NewTaskService(repo, userService, logger)
    h := handler.NewTaskHandler(svc)
    return &Services{Handler: h, TaskService: svc}
}
```

```go
// cmd/server/main.go — cross-module wiring is explicit
userMod := user.New(db, emailSender, logger)
taskMod := task.New(db, userMod.UserService, logger)   // task depends on user's service interface
```

The dependency between modules is visible in `main.go` and flows through interfaces — never through concrete types or repository access.

#### Factory Rules

- **One factory per module** — `module.go` at the module root package
- **The factory is the only file that imports internal sub-packages** — it's the module's own composition root
- **The `Services` struct exposes interfaces, not concrete types** — other modules depend on the interface, not the implementation
- **Cross-module dependencies are passed as interfaces** — if `task.New` needs user data, it receives `service.UserQuerier` (the interface the task module defines), not `*user.Services`
- **`main.go` only imports module root packages and shared packages** — never `internal/user/repository` or `internal/user/service` directly
- If you find `main.go` importing a sub-package of a module, the module factory is incomplete

## Testing with Mock Generation

<!-- CUSTOMIZE: Replace mockery commands with your preferred tool if different -->

### Use Mockery — Never Hand-Write Mocks

Use [mockery](https://vektra.github.io/mockery/) to generate mocks from interfaces. Never write mock implementations by hand.

**Why:**
- Generated mocks stay in sync with the interface automatically
- Consistent assertion patterns (`AssertExpectations`, `On`, `Return`) across the entire codebase
- Reduces token usage — generating a mock is one command, not 50+ lines of boilerplate
- When an interface changes, `go generate` updates all mocks

### Configuration

```yaml
# .mockery.yaml at project root
all: false
with-expecter: true
dir: "{{.InterfaceDir}}/mocks"
outpkg: mocks
packages:
  # CUSTOMIZE: List your packages that define interfaces to mock
  github.com/yourorg/yourapp/internal/user/service:
    interfaces:
      UserRepository:
      EmailSender:
  github.com/yourorg/yourapp/internal/task/service:
    interfaces:
      TaskRepository:
```

### Generation

```bash
# Generate all mocks defined in .mockery.yaml
go generate ./...

# Or run mockery directly
mockery
```

Add a `go:generate` directive in the file that defines the interface:

```go
//go:generate mockery --name=UserRepository
type UserRepository interface {
    FindByID(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, user *User) error
}
```

### Using Generated Mocks in Tests

```go
// internal/user/service/user_service_test.go

func TestUserService_CreateUser(t *testing.T) {
    // Arrange — create mock instances (generated by mockery into service/mocks/)
    mockRepo := mocks.NewMockUserRepository(t)  // auto-cleanup via t.Cleanup
    mockEmail := mocks.NewMockEmailSender(t)

    // Set expectations
    mockRepo.EXPECT().Save(mock.Anything, mock.AnythingOfType("*model.User")).Return(nil)
    mockEmail.EXPECT().SendWelcome(mock.Anything, mock.AnythingOfType("*model.User")).Return(nil)

    // Act — inject mocks through constructor
    svc := NewUserService(mockRepo, mockEmail, logger)
    err := svc.CreateUser(ctx, "test@example.com", "Test User")

    // Assert
    assert.NoError(t, err)
    // mockRepo and mockEmail auto-verify expectations via t.Cleanup
}
```

**Mock rules:**
- Always use `mock.Anything` for `context.Context` parameters
- Use `mock.AnythingOfType("*service.User")` when the exact value doesn't matter
- Use `mock.MatchedBy(func(u *service.User) bool { return u.Email == "..." })` when you need to assert on specific fields
- Let `t.Cleanup` handle expectation verification — don't call `AssertExpectations` manually when using `NewMock*(t)`
- If a test doesn't set expectations for a method, calling that method will fail the test — this is correct behavior

## JSON Serialization

<!-- CUSTOMIZE: Change the casing convention if your project uses a different style -->

### Convention: lowerCamelCase

All JSON field names use **lowerCamelCase**. Define explicit `json` struct tags on every exported field — never rely on Go's default (which would expose PascalCase).

```go
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    FirstName string    `json:"firstName"`
    LastName  string    `json:"lastName"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
    IsActive  bool      `json:"isActive"`
}
```

**Rules:**
- Every exported struct field that appears in JSON must have an explicit `json:"..."` tag
- Use `json:"-"` for fields that must never be serialized (passwords, internal flags)
- Use `json:"field,omitempty"` for optional fields that should be omitted when zero-valued
- Nested structs follow the same convention: `json:"billingAddress"`, not `json:"billing_address"`
- Acronyms follow camelCase, not ALLCAPS: `json:"userId"`, `json:"apiKey"`, `json:"htmlContent"` — not `json:"userID"`, `json:"APIKey"`

```go
type CreateUserRequest struct {
    Email     string `json:"email" binding:"required,email"`
    FirstName string `json:"firstName" binding:"required"`
    LastName  string `json:"lastName" binding:"required"`
    Password  string `json:"password" binding:"required,min=8"`
}

type UserResponse struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    FirstName string `json:"firstName"`
    LastName  string `json:"lastName"`
    IsActive  bool   `json:"isActive"`
    CreatedAt string `json:"createdAt"`
    Password  string `json:"-"`  // never serialize
}
```

**If a different project needs `snake_case`:** change this section to document `snake_case` conventions (`json:"first_name"`, `json:"created_at"`) and update the examples. The rest of the skill is unaffected.

## Error Handling

### Domain Errors

Define sentinel errors or typed errors for business rule violations:

```go
// package service

var (
    ErrUserNotFound    = errors.New("user not found")
    ErrEmailTaken      = errors.New("email already registered")
    ErrNotAuthorized   = errors.New("not authorized")
)

// For errors that carry context
type ValidationError struct {
    Field   string
    Message string
}
```

### Error Wrapping

Wrap errors at layer boundaries to add context without losing the original:

```go
func (s *UserService) FindByID(ctx context.Context, id string) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("finding user %s: %w", id, err)
    }
    return user, nil
}
```

The API layer uses `errors.Is()` to translate domain errors to HTTP responses — services never import `net/http`.

## Cross-Cutting Infrastructure

These packages live in `internal/shared/` (or `internal/pkg/`, `internal/platform/` — pick one, be consistent). They follow the same principle: wrap a standard library concern behind a context-propagated interface so every layer gets consistent behavior and tests can override it.

<!-- CUSTOMIZE: Adapt package paths and specific implementations to your project -->

### Clock — Testable Time

Never call `time.Now()` directly in services or repositories. Use a clock package that provides the current time through an overridable default and context propagation.

```go
// internal/shared/clock/clock.go
package clock

import (
    "context"
    "time"
)

type ctxKey struct{}

// Default is the package-level clock used when no override is set.
// Tests replace this to control time.
var Default = func() time.Time { return time.Now() }

// Now returns the current time from the context (if set) or the default clock.
func Now(ctx context.Context) time.Time {
    if t, ok := ctx.Value(ctxKey{}).(time.Time); ok {
        return t
    }
    return Default()
}

// WithTime injects a fixed time into the context.
// Used by middleware to pin all timestamps within a request to the same moment.
func WithTime(ctx context.Context, t time.Time) context.Context {
    return context.WithValue(ctx, ctxKey{}, t)
}
```

**Usage in middleware** — pin the request time so `created_at` and `updated_at` within the same request are identical:

```go
// internal/shared/middleware/clock.go
func ClockMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx := clock.WithTime(c.Request.Context(), time.Now())
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```

**Usage in services/repositories:**

```go
func (s *UserService) CreateUser(ctx context.Context, email string) (*model.User, error) {
    now := clock.Now(ctx)   // consistent within the request
    user := &model.User{
        Email:     email,
        CreatedAt: now,
        UpdatedAt: now,
    }
    return user, s.repo.Save(ctx, user)
}
```

**Usage in tests** — control time without interfaces or injection:

```go
func TestCreateUser_SetsTimestamps(t *testing.T) {
    fixed := time.Date(2026, 3, 19, 12, 0, 0, 0, time.UTC)
    ctx := clock.WithTime(context.Background(), fixed)

    // ... create user with ctx
    assert.Equal(t, fixed, user.CreatedAt)
}
```

### Logger — Context-Propagated Structured Logging

Use `log/slog` with context propagation. Middleware enriches the logger with request attributes (request ID, user ID, method, path), and every layer reads the logger from context — ensuring all log lines within a request carry the same trace attributes.

```go
// internal/shared/logger/logger.go
package logger

import (
    "context"
    "log/slog"
)

type ctxKey struct{}

// FromContext returns the logger from context, or the default slog logger.
func FromContext(ctx context.Context) *slog.Logger {
    if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
        return l
    }
    return slog.Default()
}

// WithLogger injects a logger into the context.
func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
    return context.WithValue(ctx, ctxKey{}, l)
}
```

**Usage in middleware** — enrich with request attributes:

```go
// internal/shared/middleware/logger.go
func LoggerMiddleware(base *slog.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        reqLogger := base.With(
            slog.String("request_id", c.GetHeader("X-Request-ID")),
            slog.String("method", c.Request.Method),
            slog.String("path", c.Request.URL.Path),
            slog.String("remote_addr", c.ClientIP()),
        )
        ctx := logger.WithLogger(c.Request.Context(), reqLogger)
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```

**Usage in any layer** — handler, service, repository all use the same pattern:

```go
func (s *UserService) CreateUser(ctx context.Context, email string) (*model.User, error) {
    log := logger.FromContext(ctx)
    log.Info("creating user", slog.String("email", email))

    // ... business logic

    if err != nil {
        log.Error("failed to create user", slog.String("email", email), slog.Any("error", err))
        return nil, err
    }
    return user, nil
}
```

Every log line from the same request automatically carries `request_id`, `method`, `path` — no manual threading required.

### AOP — Request Tracing with Contextual Attributes

A trace package that logs entry and exit of meaningful layers with **identifying attributes from the method payload**. The goal is not to log everything — it's to include enough context in each trace line that you can identify *which* entity is being processed without cross-referencing other logs.

```go
// internal/shared/aop/trace.go
package aop

import (
    "context"
    "log/slog"
    "time"

    "myapp/internal/shared/logger"
)

// Trace logs entry and exit of a named operation with timing and contextual attributes.
// Attrs should be identifying information from the method payload — IDs, names, status.
// Usage: defer aop.Trace(ctx, "UserService.CreateUser", slog.String("email", email))()
func Trace(ctx context.Context, operation string, attrs ...slog.Attr) func() {
    log := logger.FromContext(ctx)

    // Build attribute list: operation name + caller-provided attrs
    traceAttrs := make([]any, 0, len(attrs)+1)
    traceAttrs = append(traceAttrs, slog.String("op", operation))
    for _, attr := range attrs {
        traceAttrs = append(traceAttrs, attr)
    }

    log.Debug("entering", traceAttrs...)
    start := time.Now()

    return func() {
        traceAttrs = append(traceAttrs, slog.Duration("duration", time.Since(start)))
        log.Debug("exiting", traceAttrs...)
    }
}
```

**Usage** — pass identifying attributes from the method parameters. The `defer` + trailing `()` pattern ensures exit is logged even on panic or early return:

```go
func (h *UserHandler) CreateUser(c *gin.Context) {
    // Handler: trace the inbound request with route-level identifiers
    defer aop.Trace(c.Request.Context(), "UserHandler.CreateUser",
        slog.String("content_type", c.ContentType()),
    )()

    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil { ... }

    // After parsing, the service call carries the meaningful identifiers
    user, err := h.service.CreateUser(c.Request.Context(), req.Email, req.Name)
    // ...
}

func (s *UserService) CreateUser(ctx context.Context, email, name string) (*model.User, error) {
    // Service: trace with the business-meaningful identifiers
    defer aop.Trace(ctx, "UserService.CreateUser",
        slog.String("email", email),
        slog.String("name", name),
    )()
    // ...
}

func (s *UserService) AssignTask(ctx context.Context, taskID, assigneeID string) error {
    // Service: trace with entity IDs that identify the operation
    defer aop.Trace(ctx, "UserService.AssignTask",
        slog.String("task_id", taskID),
        slog.String("assignee_id", assigneeID),
    )()
    // ...
}

func (r *userRepository) Save(ctx context.Context, user *model.User) error {
    // Repository: trace with the entity's primary identifier
    defer aop.Trace(ctx, "UserRepository.Save",
        slog.String("user_id", user.ID),
        slog.String("email", user.Email),
    )()
    // ...
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
    // Repository: trace with the lookup key
    defer aop.Trace(ctx, "UserRepository.FindByID",
        slog.String("user_id", id),
    )()
    // ...
}

func (c *paymentClient) Charge(ctx context.Context, invoiceID string, amount int64) error {
    // External client: trace with identifiers + the value being sent
    defer aop.Trace(ctx, "PaymentClient.Charge",
        slog.String("invoice_id", invoiceID),
        slog.Int64("amount_cents", amount),
    )()
    // ...
}
```

**Resulting log output** for a single request:

```
level=DEBUG msg=entering op=UserHandler.CreateUser content_type=application/json request_id=abc-123
level=DEBUG msg=entering op=UserService.CreateUser email=test@example.com name="Test User" request_id=abc-123
level=DEBUG msg=entering op=UserRepository.Save user_id=usr_7f3a email=test@example.com request_id=abc-123
level=DEBUG msg=exiting  op=UserRepository.Save user_id=usr_7f3a email=test@example.com duration=2.1ms request_id=abc-123
level=DEBUG msg=exiting  op=UserService.CreateUser email=test@example.com name="Test User" duration=3.4ms request_id=abc-123
level=DEBUG msg=exiting  op=UserHandler.CreateUser content_type=application/json duration=4.8ms request_id=abc-123
```

Each trace line carries enough context to identify the specific entity — you can grep for `user_id=usr_7f3a` or `email=test@example.com` and see its full journey through the layers.

### What to Include in Trace Attributes

**During `/implement`, the AI must select relevant attributes for each `aop.Trace` call.** This is not optional — bare `Trace(ctx, "OpName")` calls without attributes are incomplete.

**Include (identifying attributes):**
- Entity IDs: `user_id`, `task_id`, `invoice_id`, `order_id`
- Lookup keys: the parameter being used to find something (email, slug, external ref)
- Business-meaningful values: amount, status, action type
- Entity names when they help identify the record (user name, project name)

**Exclude (noise):**
- Full request/response bodies — too verbose, use dedicated request logging for that
- Passwords, tokens, secrets — never log credentials
- Large lists or arrays — log the count instead (`slog.Int("items", len(tasks))`)
- Redundant attributes already in the context logger (request_id, method, path — middleware handles these)

**Rule of thumb:** if you're debugging a production issue and filtering logs by this operation name, what would you need to see to identify which specific invocation failed? Those are your attributes.

### Middleware Stack

Wire all cross-cutting middleware in order — clock first (so all layers see the pinned time), then logger (so all layers have the enriched logger), then routes:

```go
// cmd/server/main.go
router := gin.Default()
router.Use(middleware.ClockMiddleware())
router.Use(middleware.LoggerMiddleware(baseLogger))

userMod.Handler.RegisterRoutes(router)
taskMod.Handler.RegisterRoutes(router)
```

### Rules for Cross-Cutting Packages

- **Always use context propagation** — never store request-scoped state in globals or goroutine-local storage
- **Every cross-cutting package follows the same pair:** `WithX(ctx, value) context.Context` + `FromContext(ctx) X`
- **Middleware injects, layers read** — handlers and services never call `WithLogger` or `WithTime` themselves (except in tests)
- **Tests override through context** — inject a fixed time, a test logger, or a no-op tracer via context. No global state mutation between tests
- **These packages live in `shared/`** — they are the only packages that every module is allowed to import

## Project Structure — Module/Layer

<!-- CUSTOMIZE: Adapt module names and layer conventions to your project -->

The project follows a **module/layer** layout: each domain module is a top-level directory, and each layer within that module is a separate Go package. This gives strong module boundaries (each module is a self-contained subtree) and proper encapsulation between layers (Go package visibility).

```
internal/
  user/                              ← module: everything related to users
    module.go                        ← factory: New() wires internals, returns Services struct
    model/                           ← domain types for this module
      user.go                        ← User struct, value objects
    service/                         ← business logic + interfaces it needs
      user_service.go                ← UserService + UserRepository interface
      user_service_test.go           ← unit tests with mockery mocks
      mocks/                         ← generated by mockery
    handler/                         ← HTTP handlers for this module
      user_handler.go                ← UserHandler — depends on service interfaces
    repository/                      ← data layer implementations
      postgres_user.go               ← unexported userRepository, exported NewUserRepository
  task/                              ← module: everything related to tasks
    module.go                        ← factory: New() wires internals, returns Services struct
    model/
      task.go
    service/
      task_service.go                ← TaskService + TaskRepository interface
      task_service_test.go
      mocks/
    handler/
      task_handler.go
    repository/
      postgres_task.go
  shared/                            ← cross-module infrastructure
    clock/                           ← testable time: Now(ctx), WithTime(ctx, t)
      clock.go
    logger/                          ← context-propagated slog: FromContext(ctx), WithLogger(ctx, l)
      logger.go
    aop/                             ← request tracing: Trace(ctx, "op")
      trace.go
    middleware/                       ← Gin/gRPC middleware: clock, logger, auth
      clock.go
      logger.go
      auth.go
    email/                           ← external service implementations
      sender.go                      ← unexported emailSender, exported NewEmailSender
cmd/
  server/
    main.go                          ← composition root — imports modules, not layers
```

### How the Dependency Pattern Maps to Module/Layer

The interface-based pattern works the same way — the only difference is the import paths:

```go
// internal/user/service/user_service.go — consumer defines what it needs
package service

import "myapp/internal/user/model"

type UserRepository interface {
    FindByID(ctx context.Context, id string) (*model.User, error)
    Save(ctx context.Context, user *model.User) error
}

type UserService struct {
    repo  UserRepository
    email EmailSender
}
```

```go
// internal/user/repository/postgres_user.go — implementation returns consumer's interface
package repository

import (
    "myapp/internal/user/model"
    "myapp/internal/user/service"
)

type userRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) service.UserRepository {
    return &userRepository{db: db}
}
```

### Import Rules

**Within a module:** layers import inward toward the domain.
```
handler → service ← repository
              ↑
            model (shared within the module)
```

**Between modules:** only through service interfaces, never direct repository or handler imports. If `task` needs user data, it depends on `user/service.UserRepository` (the interface), not on `user/repository`.

**The composition root (`main.go`)** only imports module root packages — each module's factory handles its own internal wiring:

```go
// cmd/server/main.go
import (
    "myapp/internal/user"
    "myapp/internal/task"
    "myapp/internal/shared/email"
)
```

### Rules

- **Never import a repository package from a handler** — always go through the service layer
- **Never import another module's repository** — if you need cross-module data, depend on the other module's service interface
- **Model packages are the exception** — other modules may import `user/model` for shared domain types. Keep model packages free of business logic
- **One module, one domain concept** — if a package is growing beyond its domain (e.g., `user/service` starts managing billing), extract a new module
