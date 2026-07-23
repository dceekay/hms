# CeekayX HMS Backend Architecture

## Overview

The backend is a modular Express + TypeScript API backed by Prisma and MySQL. The project should continue backend-first: build reliable APIs, test them through the API Tester page, then connect polished frontend screens.

Current stack:
- Node.js
- Express 5
- TypeScript
- Prisma ORM
- MySQL
- Zod validation
- JWT access/refresh tokens
- RBAC with roles and permissions

## Runtime Flow

```text
server.ts
  -> connectDatabase()
  -> app.listen()

app.ts
  -> security middleware
  -> body parsers
  -> /api/v1 routes
  -> notFound
  -> errorMiddleware

routes/index.ts
  -> auth
  -> users
  -> roles
  -> permissions
  -> setup
  -> hospital-profile
  -> departments
  -> patients
  -> dashboard
```

## Folder Structure

```text
backend/
  prisma/
    schema.prisma
    seed.ts
  src/
    app.ts
    server.ts
    config/
    core/
    database/
    middleware/
    modules/
    routes/
    shared/
```

Important folders:
- `src/config`: environment validation and logger setup.
- `src/core`: shared base classes and HTTP constants.
- `src/database`: Prisma client and connection lifecycle.
- `src/middleware`: global Express middleware such as error and 404 handling.
- `src/modules`: feature modules.
- `src/routes`: central API route composition.
- `src/shared`: reusable middleware, DTOs, helpers, errors, responses, and types.

## Module Pattern

Each feature module should use this structure unless there is a clear reason not to:

```text
src/modules/<module>/
  controller.ts
  service.ts
  repository.ts
  routes.ts
  validators.ts or dto.ts
  index.ts
```

Controller:
- receives Express request/response objects
- extracts params, query, and body
- calls service methods
- returns API response

Service:
- owns business rules
- checks cross-record conditions
- controls transactions
- calls repositories
- prepares audit events

Repository:
- owns Prisma queries
- does not know about Express
- avoids business workflow decisions

Routes:
- define HTTP method and path
- apply `authenticate`
- apply `authorizePermissions(...)`
- apply validation middleware

Validators/DTO:
- define Zod schemas
- keep request body rules close to the module

## Data Model Areas

Security foundation:
- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `RefreshToken`
- `AuditLog`

Hospital setup:
- `HospitalProfile`
- `Department`
- `Specialty`
- `Ward`
- `Room`
- `Bed`
- `HospitalService`
- `InsuranceProvider`

Clinical/business modules to expand:
- `Patient`
- staff/doctors
- appointments
- encounters
- prescriptions
- laboratory
- pharmacy/inventory
- billing/payments
- reports

## Authentication Design

Login accepts an identifier and password. The identifier may be email or username.

Successful login should:
- verify password hash
- reject inactive/locked accounts
- load roles and permissions
- create an access token
- create a refresh token with a unique JWT ID
- revoke previous active refresh tokens if single-session behavior is desired
- persist the new refresh token
- update `lastLogin`

Access token:
- short lived
- sent as `Authorization: Bearer <token>`
- used for normal API requests

Refresh token:
- longer lived
- stored by the client
- used only on `/auth/refresh` and `/auth/logout`
- persisted in `refresh_tokens`
- revocable

## RBAC Design

RBAC is permission-first. Roles are containers; permissions are what routes enforce.

Flow:

```text
request
  -> authenticate
  -> verify access token
  -> req.user.roles + req.user.permissions
  -> authorizePermissions([...])
  -> controller
```

Permission naming:
- format: `<resource>.<action>`
- examples:
  - `patients.read`
  - `patients.create`
  - `setup.update`
  - `roles.delete`
  - `users.manage_roles`

Route rule:
- every business endpoint should have `authenticate`
- every protected business endpoint should have `authorizePermissions`
- dashboard endpoints may become role/permission-aware as reporting matures

## Error Handling

Use `ApiError` for expected application failures:
- validation issue
- unauthenticated
- forbidden
- not found
- duplicate/conflict

Unexpected errors go to `errorMiddleware`, which:
- logs the error
- returns `500`
- includes stack trace only in development

Standard error shape:

```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

## Validation

Use Zod schemas and `validateBody(schema)` on create/update routes.

Validation should live close to the module:
- shared auth/user DTOs may stay in `src/shared/dto`
- module-specific schemas should stay in `src/modules/<module>/validators.ts`

## Database Strategy

Development currently uses Prisma against MySQL.

For local iteration:
- update `schema.prisma`
- run Prisma generate
- run `prisma db push` or migration command
- run seed

For production readiness:
- switch from ad-hoc `db push` to committed Prisma migrations
- document migration order
- backup before deploy
- seed only safe default records

## API Tester Strategy

The API Tester page is the bridge between raw backend and full frontend screens.

Each new backend checkpoint should add API Tester presets for:
- list endpoint
- create endpoint
- one protected success case
- one RBAC forbidden case if practical

This keeps the frontend from being blocked by unfinished screens while still proving the API works from the browser.

## Git Checkpoint Policy

At each checkpoint:
- implement backend changes
- add/adjust seed permissions
- add API Tester preset if useful
- run backend type-check
- run frontend type-check if frontend files changed
- test through API Tester
- commit with a clear message
- push to GitHub
