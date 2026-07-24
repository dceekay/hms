# CeekayX HMS API Design

Base URL:

```text
http://localhost:5000/api/v1
```

The API is designed backend-first. Every module should expose testable endpoints before full frontend integration.

## Core Rules

Use JSON for request and response bodies.

Use Bearer tokens for protected routes:

```http
Authorization: Bearer <access_token>
```

Use route-level permissions for RBAC:

```ts
router.get("/", authenticate, authorizePermissions(["patients.read"]), controller.list);
```

Use Zod validation through `validateBody(...)` for create/update requests.

Use soft deletes for business records where history matters. Hard deletes are acceptable only for pure setup records before they are referenced, or for join rows such as role permissions.

## Response Shape

Successful responses should follow the shared `ApiResponse` pattern:

```json
{
  "success": true,
  "message": "Record created successfully",
  "data": {}
}
```

Error responses should be predictable:

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

Common status codes:
- `200`: request succeeded
- `201`: record created
- `400`: validation or bad request
- `401`: missing/invalid access token
- `403`: authenticated but missing permission
- `404`: record not found
- `409`: duplicate or conflicting data
- `500`: unexpected server error

## Authentication Endpoints

Mounted at `/auth`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create a new user account |
| POST | `/auth/login` | public | Login and receive tokens |
| POST | `/auth/refresh` | refresh token | Issue a new access token |
| POST | `/auth/logout` | refresh token | Revoke refresh token |
| GET | `/auth/profile` | access token | Return current user profile |
| GET | `/auth/admin` | Super Admin role | Test role guard |
| GET | `/auth/permissions` | `roles.read` | Test permission guard |

Login request:

```json
{
  "identifier": "admin",
  "password": "Admin@123"
}
```

Login response should include:
- access token
- refresh token
- user profile
- roles
- permissions

Development test accounts:

| Role | Username | Password |
| --- | --- | --- |
| Super Admin | `admin` | `Admin@123` |
| Doctor | `drjohn` | `Doctor@123` |
| Nurse | `nurseama` | `Nurse@123` |
| Receptionist | `reception` | `Reception@123` |
| Laboratory | `labtech` | `Lab@12345` |
| Pharmacist | `pharm` | `Pharm@123` |
| Billing Officer | `billing` | `Billing@123` |

## RBAC Endpoints

### Users

Mounted at `/users`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/users` | `users.read` | List users |
| GET | `/users/:id` | `users.read` | Get one user |
| PATCH | `/users/:id` | `users.write` | Update user |
| POST | `/users/:id/roles` | `users.manage_roles` | Replace/assign user roles |
| POST | `/users/:id/activate` | `users.write` | Activate account |
| POST | `/users/:id/deactivate` | `users.write` | Deactivate account |
| DELETE | `/users/:id` | `users.delete` | Remove/soft-delete user |

### Roles

Mounted at `/roles`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/roles` | `roles.read` | List roles |
| GET | `/roles/:id` | `roles.read` | Get one role |
| POST | `/roles` | `roles.create` | Create role |
| PUT/PATCH | `/roles/:id` | `roles.update` | Update role |
| POST | `/roles/:id/permissions` | `roles.update` | Assign permissions |
| DELETE | `/roles/:id` | `roles.delete` | Delete role |

### Permissions

Mounted at `/permissions`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/permissions` | `permissions.read` | List permissions |
| GET | `/permissions/:id` | `permissions.read` | Get one permission |
| POST | `/permissions` | `permissions.write` | Create permission |
| PATCH | `/permissions/:id` | `permissions.write` | Update permission |
| DELETE | `/permissions/:id` | `permissions.delete` | Delete permission |

## Hospital Setup Endpoints

Mounted at `/setup`.

Supported resources:
- `specialties`
- `wards`
- `rooms`
- `beds`
- `services`
- `insurance-providers`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/setup/:resource` | `setup.read` | List setup records |
| GET | `/setup/:resource/:id` | `setup.read` | Get one setup record |
| POST | `/setup/:resource` | `setup.create` | Create setup record |
| PATCH/PUT | `/setup/:resource/:id` | `setup.update` | Update setup record |
| DELETE | `/setup/:resource/:id` | `setup.delete` | Delete setup record |

Create ward:

```json
{
  "name": "Male Medical Ward",
  "description": "General male medical admissions",
  "isActive": true
}
```

Create room:

```json
{
  "name": "Room 101",
  "roomNumber": "GW-101",
  "roomType": "General",
  "wardId": "uuid-or-null",
  "isActive": true
}
```

Create bed:

```json
{
  "bedNumber": "GW-101-A",
  "status": "available",
  "wardId": "uuid-or-null",
  "roomId": "uuid-or-null",
  "isActive": true
}
```

Create service:

```json
{
  "name": "General Consultation",
  "code": "CONS-GEN",
  "price": 5000,
  "description": "Standard outpatient consultation",
  "isActive": true
}
```

Create insurance provider:

```json
{
  "name": "CeekayX Health Plan",
  "code": "CXHP",
  "email": "claims@example.com",
  "phone": "08000000000",
  "address": "Lagos",
  "isActive": true
}
```

## Hospital Profile Endpoints

Mounted at `/hospital-profile`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/hospital-profile` | `hospital_profile.read` | Get active profile |
| PUT | `/hospital-profile` | `hospital_profile.update` | Create/update profile |

## Department Endpoints

Mounted at `/departments`.

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/departments` | `departments.read` | List departments |
| POST | `/departments` | `departments.create` | Create department |
| GET | `/departments/:id` | `departments.read` | Get one department |
| PUT | `/departments/:id` | `departments.update` | Update department |
| DELETE | `/departments/:id` | `departments.delete` | Delete department |

## Patient Endpoints

Mounted at `/patients`.

Current endpoints:

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/patients` | `patients.read` | List patients |
| POST | `/patients` | `patients.create` | Create patient |
| GET | `/patients/:id` | `patients.read` | Get one patient |
| PATCH | `/patients/:id` | `patients.update` | Update patient |
| GET | `/patients/:id/summary` | `patients.read` | Patient overview |
| GET | `/patients/:id/qr` | `patients.read` | Return QR payload data |
| GET | `/patients/lookup/:qrCode` | `patients.read` | Resolve QR code to safe patient summary |

Target endpoints:

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| DELETE | `/patients/:id` | `patients.delete` | Soft-delete patient |
| GET | `/patients/search` | `patients.read` | Search by MRN/name/phone |
| GET | `/patients/:id/insurance` | `patients.read` | Insurance details |
| POST | `/patients/:id/insurance` | `patients.update` | Add/update insurance |
| GET | `/patients/:id/visits` | `patients.read` | Patient visit history |

Create patient example:

```json
{
  "firstName": "Grace",
  "lastName": "Adeyemi",
  "email": "patient@example.com",
  "phone": "+2348090001111",
  "dateOfBirth": "1988-07-23",
  "gender": "female",
  "address": "12 Care Avenue",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "emergencyContactName": "Tunde Adeyemi",
  "emergencyContactPhone": "+2348090002222",
  "emergencyContactRelationship": "Spouse",
  "bloodGroup": "O+",
  "genotype": "AA",
  "allergies": "None reported",
  "insurancePolicyNumber": "CXHP-0001",
  "insuranceCoverageStatus": "active"
}
```

Patient QR rules:
- QR codes must not contain private medical details directly.
- QR payload should be a stable opaque lookup code or URL.
- QR lookup must still require authorized HMS access.
- Patient card printing/export can be frontend-only after the QR endpoint is ready.

Patient profile target:
- demographics
- emergency contact
- QR identity
- insurance provider and policy details
- doctor visits/encounters
- lab requests/results
- prescriptions
- billing summary
- audit history for sensitive changes

## Dashboard Endpoint

Mounted at `/dashboard`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/dashboard/overview` | access token | Return operational overview |

The dashboard should eventually be permission-aware. For example, Super Admin sees system-wide data while Doctor sees personal appointments and clinical work.

## Permission Naming Standard

Use `<resource>.<action>`.

Preferred actions:
- `read`
- `create`
- `update`
- `delete`
- `write` only when create/update are intentionally combined
- `manage_roles` for assigning roles

Examples:
- `patients.read`
- `patients.create`
- `patients.update`
- `patients.delete`
- `appointments.read`
- `appointments.create`
- `billing.payments.create`
- `setup.update`

Avoid mixing names like `users.update` and `users.write` for the same behavior unless the old name already exists and migration is planned.

## Module Design Contract

Each production module should follow this shape:

```text
src/modules/<module>/
  controller.ts
  service.ts
  repository.ts
  routes.ts
  validators.ts or dto.ts
  index.ts
```

Controller responsibilities:
- read request params/body/query
- call service
- return response
- no business rules

Service responsibilities:
- business rules
- permission-independent workflow decisions
- duplicate checks
- transaction boundaries
- audit calls

Repository responsibilities:
- Prisma queries
- data access only
- no Express request/response logic

Routes responsibilities:
- URL shape
- authentication
- permission guards
- validation middleware

## Testing Gate For Each Checkpoint

Before pushing:

```powershell
cd backend
npx tsc --noEmit --pretty false
```

```powershell
cd frontend
npx tsc --noEmit
```

Minimum API tests:
- login as Super Admin
- successful allowed request
- blocked request using a lower-permission user
- validation failure request
- duplicate/conflict request when relevant

Frontend API Tester flow:
- open `/api-tester`
- choose method/path preset
- send request
- confirm status and response body

## Versioning

Current API version is `/api/v1`.

Do not break `/api/v1` response shapes after frontend screens depend on them. If a breaking change is unavoidable later, add `/api/v2` or support both shapes temporarily.
