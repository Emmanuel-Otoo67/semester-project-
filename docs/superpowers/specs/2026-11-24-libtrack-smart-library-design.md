# LibTrack Smart Library System Design

## Purpose

Extend the existing LibTrack semester project into a secure library system with an admin/librarian workspace, a student portal, and an entrance kiosk. Preserve the current application, its working book and loan workflows, database relationships, Java/React architecture, and LibTrack branding. The shared brand reference is the supplied black background, orange-yellow mark and lettering, and white “Lib” wordmark.

## Current baseline (inspected 2026-11-24)

- Frontend: React 18, TypeScript, Vite, React Router, Supabase JS; one existing `Workspace` contains the librarian/admin views.
- Backend: Java 21, Spring Boot 3.5.7, Spring Security resource server, JDBC repositories, validation, Flyway migrations.
- Data: PostgreSQL (Supabase in hosted configuration); browser data access goes through the Spring API. Existing migrations define staff users, members, books, authors/categories, physical copies, loans, holds, fees, settings, and audit events.
- Authentication: Supabase Auth JWTs are resolved to active `staff_users`; roles currently are `ADMIN` and `LIBRARIAN`. Student accounts and student authorization do not exist.
- Existing working domains: member registration, title/copy catalogue, checkout/renewal/return, holds, dashboard, audit, settings, staff access.
- Missing requested domains: student programme/level and account linkage, attendance visits, kiosk, student portal, QR issue/scan, attendance reports, and combined analytics.
- Styling has legacy green rules alongside a black/orange-yellow workspace and welcome-page theme; consolidate toward the supplied logo’s brand without replacing the app.

## System structure

Keep one application and one database. The React app exposes `/dashboard` for staff, `/student` for linked students, and `/kiosk` for the entrance station. Spring remains the only application-data boundary; authorization and business rules are enforced server-side. Supabase Auth remains the identity provider. Application role and active status come from server-owned LibTrack records, never editable user metadata.

Backend domains remain separated under `com.libtrack`: extend `members` for student profile data and identity linkage; add an `attendance` domain for visit/check-in/check-out/report operations; extend `platform.auth` to resolve staff or student principals and enforce route-level permissions; keep `catalog` and `circulation` as the source of truth for books, copies, loans, returns, and holds. The kiosk is a dedicated frontend mode and restricted API surface, not a database client.

## Data and rules

- Reuse `members` for registered people. Student-only fields include programme and level; existing staff/other member records remain valid. Link a student to Supabase Auth with a nullable unique auth subject only when an account is created.
- Add an additive `library_visits` table with UUID, member foreign key, server-generated `checked_in_at`, nullable `checked_out_at`, and staff actor foreign keys for both actions. A partial unique index permits at most one open visit per member. Check constraints reject checkout before check-in and keep checkout time/actor paired.
- Attendance writes use a transaction and server time. Check-in rejects inactive/non-student profiles and duplicate open visits. Check-out requires an open visit. Incomplete open visits remain visible to authorized staff.
- Keep `loans` and `book_copies` as the lending source of truth. Existing uniqueness on active loan per copy remains. Returns update loan/copy atomically.
- Student QR data is a random opaque identifier, not a student number or personal data. Book QR may encode the existing unique copy barcode. QR and manual ID paths call the same backend rules.
- Browser clients never access the public schema directly. Students can read only their own allowed records and edit only explicitly permitted profile fields. Staff-only mutations remain staff-authorized. Kiosk responses disclose only the minimum confirmation needed.

## Interfaces

### Admin/librarian

Retain existing workspace navigation and features. Add student programme/level and profile history; an attendance view for current occupants, check-in/out, search and date/student filters; attendance and circulation reports; real attendance counts and trends on the dashboard. Continue using existing catalogue, loan, hold, policy, staff, and audit functions.

### Student

After account linking, show the student’s own profile, catalogue, loans/due dates/history, attendance history, and QR. Student APIs derive identity from the authenticated subject and do not accept arbitrary member IDs for personal data access.

### Entrance kiosk

Provide a minimal responsive scan/manual-ID interface. A successful scan toggles check-in to check-out based on server-side active-visit state and returns a privacy-safe confirmation; duplicate scans are guarded and the UI returns to scanning mode. The kiosk API must have a server-verifiable restricted credential/session; it must not be an anonymous write endpoint or expose student records. The exact kiosk session mechanism is a design decision to settle before implementing the public kiosk route.

## Delivery stages

1. Baseline inspection and architecture documentation (complete).
2. Confirm data contracts, permission model, migration and kiosk authentication design.
3. Extend student records and safely link Supabase identities; preserve staff sign-in and ADMIN/LIBRARIAN behavior.
4. Build the student portal against self-scoped backend endpoints.
5. Build attendance service, librarian attendance view, and reports using server timestamps and database constraints.
6. Add QR generation/scanning and manual fallback for students and book copies.
7. Confirm/extend checkout, return, due-date and overdue behavior using existing loan/copy tables.
8. Upgrade dashboard analytics from actual database records.
9. Integration, authorization, migration, responsiveness, and regression verification; document deployment/migration steps.

Each stage is a small vertical slice with its own tests and review. Apply migrations only through the configured database migration path; never point local work at the production database for testing.

## Open decision before kiosk implementation

Choose how the dedicated entrance station is authenticated. Recommended: provision a least-privileged kiosk identity/session that can call only attendance scan/check-in/check-out operations, with no directory/profile access. Do not embed a secret in Vite variables, QR payloads, or browser code. This must be designed before exposing kiosk writes.

## First implementation slice

Start with the student profile/data foundation and attendance backend plus the librarian’s current-visits/history screen. Use manual student lookup first. Then implement a protected kiosk mode, followed by QR. Student self-service portal and its identity linking follow as a separate slice, without changing existing staff access.
