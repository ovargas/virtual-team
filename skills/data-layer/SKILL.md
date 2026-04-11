---
name: data-layer
description: Database, ORM, migration, and query pattern standards. Load this skill whenever writing or modifying database schemas, migrations, models, repositories, queries, or seed data. Trigger on any work touching model definitions, migration files, or database-related code.
---

# Data Layer Standards

These are the rules for working with the database in this project. Follow them when creating or modifying schemas, migrations, models, queries, and data access code.

## Schema Design

### Naming
<!-- CUSTOMIZE: Replace with your conventions -->
- Tables: plural snake_case (`users`, `task_assignments`)
- Columns: singular snake_case (`created_at`, `user_id`)
- Foreign keys: `[referenced_table_singular]_id` (`user_id`, `task_id`)
- Junction tables: both table names alphabetically (`project_users`, not `user_projects`)
- Indexes: `idx_[table]_[columns]` (`idx_users_email`)
- Constraints: `[type]_[table]_[columns]` (`uq_users_email`, `fk_tasks_user_id`)

### Required Columns
Every table should have:
- `id` — primary key (UUID or auto-increment per project convention)
- `created_at` — timestamp, set automatically on insert
- `updated_at` — timestamp, updated automatically on modification

Soft-delete tables additionally need:
- `deleted_at` — nullable timestamp (null = not deleted)

### Rules
- Never store derived data that can be computed from existing columns
- Use appropriate column types (don't store booleans as integers, dates as strings)
- Add NOT NULL constraints by default — make columns nullable only when null has a specific meaning
- Add indexes for columns used in WHERE clauses and JOINs
- Foreign keys always have indexes
- Use enums or check constraints for columns with a fixed set of values

## Migrations

### Principles
<!-- CUSTOMIZE: Replace with your migration tool (Prisma, Alembic, Knex, TypeORM, etc.) -->

- Every schema change is a migration — never modify the database directly
- Migrations are forward-only in production (no editing old migrations)
- Each migration does one logical thing (don't combine unrelated table changes)
- Migrations must be reversible when possible — include the down/rollback

### Naming
- `YYYYMMDDHHMMSS_description.ts` (or your tool's convention)
- Description is imperative: `create_users_table`, `add_email_to_users`, `create_task_assignments_index`

### Safety Rules
- Adding a column: make it nullable OR provide a default — never add NOT NULL without a default to a table with existing data
- Removing a column: deploy code that doesn't use it first, then remove it in a later migration
- Renaming a column: add new, copy data, deploy code using new, drop old (never rename in-place in production)
- Adding an index: use `CREATE INDEX CONCURRENTLY` (or equivalent) for large tables
- Never modify seed/migration data that's already been deployed

## Models / ORM

<!-- CUSTOMIZE: Replace with your ORM conventions (Prisma, SQLAlchemy, TypeORM, Sequelize, etc.) -->

### Organization
- One model file per table
- Model file contains: schema definition, type exports, and basic query helpers
- Complex queries go in a repository/service, not in the model file

### Relationships
- Define relationships explicitly in the model
- Always specify cascade behavior (what happens on delete?)
- Lazy loading is a trap — prefer explicit eager loading for known query patterns
- N+1 queries are the #1 performance problem — load related data in the query, not in a loop

## Query Patterns

### Repository Pattern
<!-- CUSTOMIZE: Adapt to your architecture — repository, DAO, or direct queries -->

- Data access logic lives in repositories (or a data access layer), not in route handlers or services
- Repositories expose domain methods, not raw queries: `findActiveByUser(userId)` not `query("SELECT * FROM tasks WHERE...")`
- Complex queries get named methods with clear intent

### Rules
- Never build SQL from string concatenation — use parameterized queries or ORM methods
- Always limit query results (pagination) — no unbounded SELECTs in production code
- Use transactions for operations that modify multiple tables
- Read-heavy queries: consider database views or materialized views, not complex JOIN chains in application code
- Filters that come from user input must be validated before reaching the query

### Performance
- Index columns that appear in WHERE, JOIN, and ORDER BY clauses
- Use EXPLAIN/ANALYZE to verify query plans for complex queries
- Avoid SELECT * — select only the columns you need
- Batch inserts/updates when working with multiple records
- Connection pooling is configured, not ad-hoc — use the pool, don't create connections

## Seed Data

### When to Seed
- Development: realistic sample data that exercises all features
- Testing: minimal focused data for specific test scenarios (use factories, not shared seeds)
- Production: only reference data (roles, permissions, categories) — never user data

### Rules
- Seeds are idempotent — running them twice doesn't create duplicates
- Seeds reference data by business key, not by ID (IDs may differ across environments)
- Test data factories are preferred over shared seed files for tests

## Testing

### What to Test
- Model validations: required fields, type constraints, format validation
- Query methods: correct results for various filter combinations
- Migrations: run up AND down, verify schema matches expectations
- Relationships: loading related data, cascade deletes
- Edge cases: empty results, null handling, boundary values

### Rules
- Use a test database, never the development database
- Each test sets up its own data (or uses factories) — don't depend on seed data
- Clean up between tests (transaction rollback or truncate)
- Test the query result, not the SQL string
