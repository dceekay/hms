# CeekayX HMS Backend Roadmap

This roadmap keeps the project backend-first. Each checkpoint should be tested through the frontend API Tester page or direct HTTP calls before the normal frontend screens are wired to it. After a checkpoint passes, commit and push to GitHub.

## Current Foundation

Completed:
- Express + TypeScript backend shell.
- Prisma + MySQL data layer.
- Auth with login, refresh token persistence, logout, and profile.
- RBAC foundation with users, roles, permissions, and route guards.
- Admin pages/API tester frontend scaffold for exercising endpoints.
- Hospital setup resources:
  - specialties
  - wards
  - rooms
  - beds
  - hospital services
  - insurance providers

Current working rule:
- Backend endpoint first.
- Seed required permissions/data.
- Test through API Tester.
- Type-check backend and frontend.
- Commit and push after success.

## Phase 1: Security And Administration

Goal: make the system safe enough for all future modules.

Checkpoint 1.1: Auth hardening
- Confirm access token and refresh token expiration behavior.
- Add refresh-token rotation failure tests.
- Add account lockout behavior tests.
- Add password change endpoint.
- Add current-session logout and all-sessions logout.

Checkpoint 1.2: RBAC completion
- Normalize permission names.
- Ensure every protected route has a permission guard.
- Add role assignment audit logs.
- Add admin API tests for allowed and blocked users.

Checkpoint 1.3: Audit logging
- Create shared audit helper.
- Log login, logout, create, update, delete.
- Include userId, entity, entityId, oldValues, newValues, IP, and user agent.

Success gate:
- Super Admin can manage users, roles, permissions.
- Doctor/Nurse test users can only access their allowed endpoints.
- Forbidden requests return `403`.
- Unauthenticated requests return `401`.

## Phase 2: Hospital Setup

Goal: finish the master data that other modules depend on.

Completed:
- Setup API for specialties, wards, rooms, beds, services, and insurance providers.

Next improvements:
- Add filtering, search, and pagination for setup lists.
- Prevent deleting setup records that are already used by clinical modules.
- Add department-to-specialty relationships if needed.
- Add location hierarchy if the hospital needs branches/facilities later.

Success gate:
- Admin can create, edit, list, and deactivate setup records.
- Non-admin roles are blocked unless granted `setup.*` permissions.
- Seed data can recreate a usable development database.

## Phase 3: Patients

Goal: build the real patient registry before clinical workflows.

Data model expansion:
- Patient profile:
  - MRN/patient number
  - name, gender, date of birth
  - phone, email, address
  - emergency contact
  - blood group, genotype, allergies
  - active/inactive/deceased status
- Patient insurance:
  - provider
  - policy/member number
  - coverage status
- Patient identifiers:
  - national ID, hospital card number, external references
- Optional patient photo/document upload later.

API endpoints:
- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`
- `DELETE /patients/:id` or soft-delete
- `GET /patients/:id/summary`
- `GET /patients/search?q=...`

Success gate:
- Reception/Admin can register patients.
- Doctor/Nurse can read patients if granted permission.
- Duplicate phone/email/MRN handling is predictable.
- API Tester can create and fetch a patient before the wizard is fully connected.

## Phase 4: Staff And Doctors

Goal: connect application users to real hospital staff profiles.

Data model:
- Staff profile linked to User.
- Doctor profile linked to Staff.
- Specialty and department assignments.
- License/registration number.
- Availability schedule.

API endpoints:
- `GET /staff`
- `POST /staff`
- `GET /doctors`
- `POST /doctors`
- `PATCH /doctors/:id/schedule`

Success gate:
- Admin can create staff users.
- Doctors have specialties and schedules.
- Appointment module can query available doctors.

## Phase 5: Appointments

Goal: build scheduling around patients, doctors, departments, and services.

Data model:
- Appointment.
- Appointment status:
  - scheduled
  - checked_in
  - in_progress
  - completed
  - cancelled
  - no_show
- Appointment service.
- Notes/reason for visit.

API endpoints:
- `GET /appointments`
- `POST /appointments`
- `GET /appointments/:id`
- `PATCH /appointments/:id`
- `POST /appointments/:id/check-in`
- `POST /appointments/:id/cancel`

Success gate:
- Reception can book appointments.
- Doctor can view own schedule.
- Patient and doctor double-booking is prevented.

## Phase 6: Clinical Records

Goal: create the basic electronic medical record.

Data model:
- Encounter/visit.
- Vitals.
- Diagnosis.
- Clinical notes.
- Prescription order.
- Lab order.
- Attachments later.

API endpoints:
- `POST /encounters`
- `GET /patients/:id/encounters`
- `POST /encounters/:id/vitals`
- `POST /encounters/:id/notes`
- `POST /encounters/:id/diagnoses`

Success gate:
- Doctor/Nurse can record clinical data based on permissions.
- Clinical records are tied to patient and encounter.
- Audit logs capture sensitive changes.

## Phase 7: Laboratory

Goal: support lab requests and results.

Data model:
- Lab test catalog.
- Lab order.
- Lab order items.
- Specimen.
- Result.
- Result verification.

Success gate:
- Doctor can request lab tests.
- Lab staff can record and verify results.
- Doctor can read verified results.

## Phase 8: Pharmacy And Inventory

Goal: manage medicines, stock, prescriptions, and dispensing.

Data model:
- Medicine catalog.
- Stock batches.
- Stock movements.
- Prescription.
- Prescription items.
- Dispensing record.

Success gate:
- Pharmacy can receive and adjust stock.
- Doctor can prescribe.
- Pharmacy can dispense against valid prescription.
- Stock decreases safely after dispensing.

## Phase 9: Billing And Payments

Goal: bill patients for services, drugs, labs, and visits.

Data model:
- Invoice.
- Invoice items.
- Payment.
- Payment method.
- Insurance claim.
- Discounts/waivers.

Success gate:
- Services generate billable items.
- Payments update invoice balance.
- Insurance and cash billing are separated cleanly.

## Phase 10: Reports And Dashboard

Goal: turn operational data into useful summaries.

Reports:
- patient registrations
- appointments
- revenue
- outstanding bills
- pharmacy stock
- lab turnaround
- doctor workload
- ward/bed occupancy

Success gate:
- Dashboard endpoints return real database counts.
- Report endpoints support date filters.
- Export can be added later.

## Phase 11: Offline Sync And Production Readiness

Goal: make the system reliable outside the local development flow.

Backend readiness:
- migrations instead of only `db push`
- automated tests
- consistent logging
- request IDs
- rate limiting policy
- backup and restore plan
- deployment configuration
- environment documentation

Offline sync:
- versioned records
- change log table
- conflict strategy
- sync queue API

Success gate:
- Clean build from fresh clone.
- Seeded admin login works.
- API health check passes.
- Database migrations are reproducible.
