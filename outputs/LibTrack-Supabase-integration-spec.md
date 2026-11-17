# LibTrack Supabase Integration Specification

## Purpose

Turn the current LibTrack ground-up prototype into a working staff application backed by the user's Supabase project. Librarians must be able to sign in and complete real catalog, member, and circulation work; dashboard figures and activity must come from persisted data.

## Current state observed

- The React/Vite application is a single dashboard shell. Its navigation is inert and the counts, chart, due list, and recent activity are hard-coded examples.
- The Spring Boot application exposes only `GET /api/v1/health` and `GET /api/v1/session`.
- The initial Flyway migration already defines staff, members, books/authors/categories, physical copies, loans, holds, fee ledger, settings, and audit tables.
- Spring Security currently uses one in-memory HTTP Basic administrator. This is a development scaffold, not persistent staff authentication.
- Vite proxies `/api` and `/actuator` to the API in local development.

## Approved architecture

```text
React browser
  ├─ Supabase Auth: staff sign-in and token refresh
  └─ HTTPS JSON + Supabase access token
          ↓
Spring Boot REST API
  ├─ validates token issuer, signature, audience, and expiry
  ├─ resolves staff record and role from public.staff_users
  ├─ enforces authorization and library business rules
  └─ accesses PostgreSQL through JDBC/TLS
          ↓
Supabase-hosted PostgreSQL
```

The React app must not receive a database password, Supabase service-role key, or direct write access to library tables. Supabase Auth supplies identity; Spring remains the application authorization and business-rule boundary. Staff roles come from the server-owned `staff_users` row, never user-editable Auth metadata.

## Identity and access requirements

- Use Supabase Auth for staff email/password sign-in, sign-out, password recovery, and access-token refresh.
- Add a unique `auth_user_id` link from `public.staff_users` to `auth.users(id)`; preserve the existing library role and active flag.
- The API validates Supabase access tokens using the project's supported issuer/JWKS configuration and rejects invalid, expired, wrong-issuer, or wrong-audience tokens.
- The API resolves the authenticated subject to an active staff row on every request. Missing, disabled, or unlinked staff records are denied.
- Librarians may operate catalog, members, and circulation. Administrators may additionally manage staff, policy settings, and audit/report access.
- Provisioning/inviting staff and assigning roles are administrator-only actions. Role changes and account disablement are audited.
- CORS allows only configured production and local frontend origins. Production traffic uses HTTPS.
- No service-role credential or database connection detail is embedded in Vite variables or frontend bundles.

## Database connectivity and migrations

- The API connects to Supabase PostgreSQL with JDBC over TLS using server-side environment variables.
- Runtime traffic uses a dedicated least-privilege database role. Flyway migrations use a separate migration credential with DDL privileges; neither uses the Supabase project owner credential at runtime.
- Keep local values in ignored `.env`; keep only variable names and placeholders in `.env.example`.
- Use Supabase's direct or session-pooled connection according to the deployed host's network support. Configure pool size and connection timeouts explicitly.
- Apply schema changes through ordered Flyway migrations. Do not manually edit production schema as the normal release process.
- The app health endpoint reports API status separately from database readiness; readiness must fail when database access or pending startup migrations fail.

## REST contract

Use JSON and the existing `/api/v1` namespace. Responses use consistent HTTP status codes and a stable problem-details format with field-level validation information.

Required API groups:

- `GET /api/v1/health` and authenticated `GET /api/v1/session`.
- `GET /api/v1/dashboard/summary`: real counts for active members, available/on-loan copies, overdue loans, due-today items, holds awaiting action, and recent activity.
- `/api/v1/catalog/books`: paginated/searchable title list, title detail/create/update, authors/categories, and physical-copy list/create/update.
- `/api/v1/members`: paginated/searchable list, detail/create/update, and active/suspended status changes.
- `/api/v1/loans`: current/history search, checkout, renew, and return operations.
- `/api/v1/holds`: FIFO queue, place/cancel hold, mark ready, fulfill, and expire operations as permitted by policy.
- `/api/v1/settings`: read policy for staff; modify policy for administrators.
- `/api/v1/audit-events`: administrator-only filtered audit history.

All list endpoints use bounded pagination and server-side filters. Mutations validate request bodies and report actionable field/domain errors without leaking SQL, stack traces, secrets, or personal data in logs.

## Workflow and data integrity rules

- Checkout is one database transaction: lock the selected copy, verify it is available, lock/check the active member and borrowing limit, derive the due date from policy, insert the loan, update copy state, and append an audit event. Any failed step rolls the transaction back.
- Database uniqueness and foreign-key constraints remain the final guard against duplicate active loans, duplicate barcodes, and invalid references. Concurrent checkout tests must prove one request wins and the other receives a clear conflict.
- Return is transactional: close the active loan, update copy state, assign/reserve it for the next eligible FIFO hold when required, and append an audit event.
- Renewal checks the configured renewal limit and queued holds before changing due date; it is audited.
- Hold transitions and expiration are validated server-side. A title hold is not silently treated as a copy reservation until a copy is assigned.
- Fee ledger entries are append-only. No payment processor is part of this MVP.
- Dashboard queries are derived from persisted records and use the library's configured timezone/policy; no illustrative totals remain.

## Frontend behavior

- Replace hard-coded login with Supabase Auth UI and clear loading, invalid-credential, expired-session, and API-unavailable states.
- Centralize API calls in a typed client that attaches the current access token, parses problem-details errors, handles 401 by refreshing once or returning to sign-in, and supports cancellation/timeouts.
- Replace sample dashboard content with the summary endpoint.
- Make navigation correspond to implemented routes and screens; hide or visibly mark work that is not yet available rather than presenting fake controls or sample operational data.
- Catalog and members support search, filters, paginated lists, details, and create/edit forms.
- Circulation supports barcode/manual copy lookup, member lookup, checkout, due-date display, renew, and return with clear transaction outcomes.
- Preserve keyboard accessibility, responsive layouts, empty/loading/error states, and confirmation for destructive or irreversible staff actions.

## Delivery sequence

1. **Connection foundation:** environment configuration, Supabase Auth client, API JWT validation, staff-to-Auth mapping migration, health/readiness checks, local configuration guide.
2. **Live dashboard:** summary endpoint and loading/error-aware dashboard; remove all fake metrics/activity.
3. **Catalog and members:** API persistence, validation, search/pagination, and React list/detail/forms.
4. **Circulation and holds:** transactional checkout/return/renew/hold services, concurrency protection, and desk workflows.
5. **Administration and operational readiness:** staff/role provisioning, policy settings, audit views, health monitoring, and deployment configuration.

Each sequence is independently testable and should be merged/released only after the user's requested checkpoint workflow is satisfied.

## Acceptance criteria

- A staff member with an active linked account can sign in, refresh a session, sign out, and receive clear errors for invalid, expired, disabled, and unlinked accounts.
- API authorization rejects librarian access to administrator-only operations regardless of frontend navigation visibility.
- The browser bundle contains no database credentials or Supabase service-role key.
- Flyway can apply migrations to a fresh Supabase project using the migration credential; the API runtime role cannot perform schema changes.
- Dashboard values are sourced from the database and reconcile with direct SQL queries over test fixtures.
- Staff can create/search/edit a member and create/search/edit a title and physical copy.
- Staff can check out, renew, and return a copy; validation and policy failures are understandable and leave the database unchanged.
- Simultaneous checkout attempts for the same copy cannot create duplicate active loans.
- Holds follow FIFO ordering and configured expiry; return-to-hold behavior is transactional.
- Sensitive operations create audit events with actor, action, target, and timestamp.
- Frontend and API have explicit loading, empty, offline, validation, conflict, and session-expired states.
- A fresh local setup and a deployed environment can be configured from documented environment variables without committing secrets.

## Explicitly out of scope for this integration

Member self-service accounts, student/public discovery, online payments, email/SMS/push notifications, barcode hardware integrations, multi-branch support, student-information-system sync, and advanced analytics.

## Required deployment inputs (do not commit these)

- Supabase project URL and Auth issuer/JWKS configuration.
- Supabase PostgreSQL JDBC host/port/database and least-privilege runtime/migration credentials.
- Allowed frontend origin and API deployment URL.
- Supabase Auth email/password provider and redirect URLs configured for local and production environments.

Secrets must be entered through local ignored environment files or the chosen host's secret manager, never pasted into source files or committed.

