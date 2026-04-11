---
name: api-design
description: API endpoint and route handler standards. Load this skill whenever writing or modifying API endpoints, route handlers, middleware, request validation, or response formatting. Trigger on any work touching route files, controller files, or API-related code.
---

# API Design Standards

These are the rules for writing API endpoints and route handlers in this project. Follow them when creating or modifying routes, middleware, request handling, and response formatting.

## Endpoint Structure

<!-- CUSTOMIZE: Replace with your framework's conventions (Express, FastAPI, Nest, etc.) -->

### Route Organization
- Group routes by resource, not by HTTP method
- One route file per resource (e.g., `routes/users.ts`, `routes/tasks.ts`)
- Route file structure:
  ```
  1. Imports
  2. Request/response type definitions
  3. Route handlers (ordered: list, get, create, update, delete)
  4. Router export
  ```

### Naming
- Routes use plural nouns: `/api/users`, `/api/tasks`
- Nested resources: `/api/users/:userId/tasks`
- Actions (non-CRUD): `/api/tasks/:taskId/assign` (verb as sub-resource)
- Query params for filtering/sorting: `/api/tasks?status=active&sort=created`

## Request Handling

### Validation
<!-- CUSTOMIZE: Replace with your validation library (Zod, Joi, class-validator, Pydantic, etc.) -->

- Validate ALL incoming data at the route handler level — before it reaches business logic
- Define request schemas explicitly — don't rely on TypeScript types alone at runtime
- Validate:
  - Request body (POST, PUT, PATCH)
  - URL parameters (`:id` exists, is valid format)
  - Query parameters (known params only, correct types)
- Return 400 with specific error messages for validation failures
- Never trust client input — validate even if the frontend already validates

### Authentication & Authorization
- Auth middleware runs before route handlers
- Distinguish between authentication (who are you?) and authorization (can you do this?)
- Return 401 for missing/invalid credentials
- Return 403 for valid credentials without permission
- Never expose whether a resource exists to unauthorized users (return 404 instead of 403 when appropriate)

## Response Format

### Consistent Structure
<!-- CUSTOMIZE: Define your response envelope -->

```json
// Success
{
  "data": { ... },
  "meta": { "page": 1, "total": 50 }  // only for paginated responses
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [ ... ]  // field-level errors for validation
  }
}
```

### Status Codes
- `200` — Success (GET, PUT, PATCH)
- `201` — Created (POST that creates a resource)
- `204` — No content (DELETE, or actions with no response body)
- `400` — Bad request (validation errors, malformed input)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (authenticated but not allowed)
- `404` — Not found (resource doesn't exist)
- `409` — Conflict (duplicate, state conflict)
- `422` — Unprocessable entity (valid format but semantic error)
- `500` — Internal server error (never intentional — always a bug)

### Rules
- Never return 200 for errors
- Never return stack traces in production
- Always return JSON (even for errors)
- Paginate list endpoints by default — never return unbounded collections
- Use consistent date format (ISO 8601: `2026-02-12T10:30:00Z`)

## Error Handling

### Route Handler Pattern
<!-- CUSTOMIZE: Replace with your framework's error pattern -->

```
1. Validate input → return 400 if invalid
2. Check authorization → return 401/403 if denied
3. Call service layer → catch and translate errors
4. Return formatted response
```

### Error Translation
- Service layer throws domain errors (`UserNotFoundError`, `DuplicateEmailError`)
- Route handler translates domain errors to HTTP status codes
- Never let raw database errors reach the response
- Log detailed errors server-side, return safe messages client-side

## Middleware

### Ordering Matters
```
1. Request logging (every request)
2. CORS handling
3. Body parsing
4. Authentication (identifies the user)
5. Rate limiting
6. Route-specific authorization
7. Route handler
8. Error handling (catches everything above)
```

### Rules
- Middleware should do one thing — don't combine auth + logging + rate limiting
- Async middleware must handle errors (unhandled rejections crash the server)
- Middleware that modifies the request should document what it adds

## Testing

### What to Test
- Happy path: valid request → correct response status + body
- Validation: invalid input → 400 with descriptive error
- Auth: missing token → 401, wrong permissions → 403
- Not found: valid request for nonexistent resource → 404
- Edge cases: empty lists, boundary values, special characters in input

### Pattern
```
describe('[METHOD] /api/[resource]', () => {
  it('should return [status] with [body] when [condition]', () => {
    // Arrange: set up test data
    // Act: make the HTTP request
    // Assert: check status code AND response body
  })
})
```

### Rules
- Test the HTTP layer (make real requests to your test server), not just call handler functions
- Use test fixtures/factories for consistent test data
- Clean up test data between tests
- Test middleware independently from route handlers
