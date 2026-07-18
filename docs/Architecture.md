# Backend Architecture

## Overview
This backend follows a modular Express + TypeScript architecture built around Prisma and a shared core layer.

## Core Structure
- `src/config`: environment and logger configuration
- `src/core`: shared base abstractions such as controllers, repositories, and HTTP status constants
- `src/database`: Prisma client and connection helpers
- `src/middleware`: error handling and request middleware
- `src/modules`: feature modules such as auth, users, patients, and billing
- `src/routes`: application route composition
- `src/shared`: reusable DTOs, helpers, errors, responses, types, and validators

## Module Pattern
Each major module should contain:
- `controller.ts`
- `service.ts`
- `repository.ts`
- `routes.ts`
- `index.ts`

## Authentication Plan
1. Password helper
2. JWT helper
3. User repository
4. Auth repository
5. User service
6. Auth service
7. Register endpoint
8. Login endpoint
9. Refresh token
10. Logout
11. Role middleware
12. Permission middleware
