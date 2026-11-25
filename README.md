# LibTrack

LibTrack is a two-portal library management system with an admin/librarian workspace, student portal, and library entrance kiosk. The React client calls a Spring Boot API, which owns all PostgreSQL access.

## Stack

- Java 21 and Spring Boot 3.5
- Maven
- React, TypeScript, and Vite
- Supabase-hosted PostgreSQL in deployment; PostgreSQL 16 for local development
- Flyway schema migrations

## What is implemented

- Supabase Auth email/password sign-in in the React client. The client sends its short-lived bearer token to the Spring API and never holds database credentials.
- Spring validates Supabase JWT issuer, audience, signature, and time claims. Configure `SUPABASE_AUTH_JWT_MODE=JWKS` for asymmetric project signing. Legacy `HS256` tokens are checked server-to-server through Supabase Auth `/user`; no shared JWT signing secret is copied into LibTrack.
- Staff API access resolves each authenticated subject through `public.staff_users`. Inactive or unlinked users are denied on protected staff routes. Staff roles come from the database.
- Active student accounts resolve through `members.auth_user_id`; the session role is determined from that database link, never from user-supplied JWT metadata. Students can view their profile, catalogue, borrowing history, attendance history, and personal QR code.
- Students create their own Supabase Auth account from **Create an account** using the library number and email already on their active student record. They must confirm that email. The API verifies the confirmation with Supabase Auth and links the account only when both roster details match. Staff accounts cannot use this public signup; administrators provision staff separately. Passwords stay in Supabase Auth.
- Librarians can record arrival/departure manually from **Library attendance**, or use **Entrance kiosk** to scan a student's QR UUID or enter their library number. The kiosk shows generic confirmation only. Repeated camera reads of a code are suppressed, and the API also rejects a repeated scan idempotency key.
- Library reports use live attendance, checkout, return, overdue, and copy records, support date filters, and export report tables to CSV. The dashboard includes registered student, currently inside, and today's visit counts.
- Supabase PostgreSQL migrations, separate application and Flyway credentials, API health, live dashboard, catalogue and member search, pagination, create/edit APIs, and audit events.
- Existing schema constraints prevent duplicate member numbers/barcodes and multiple active loans for one physical copy.
- Migration V3 restricts the exposed `public` schema to the private API runtime role and removes table access from Supabase's browser-facing `anon` and `authenticated` roles.

The staff workspace includes the live dashboard, catalogue, members, attendance, circulation, holds, reports, staff administration, settings, and audit views. Student access is read-only; librarians retain control over attendance and circulation records.

## Local setup

1. Install Java 21, Node.js 20.19+ or 22.12+, npm, and Docker Desktop. The Maven wrapper downloads the pinned Maven distribution on first use, so a global Maven installation is not required.
2. Copy `.env.example` to `.env` if you need local database overrides. Local development mode does not need Supabase URL, keys, or credentials. Spring imports `.env`; keep it untracked and never commit it.
3. Start local PostgreSQL: `docker compose up -d postgres`. A fresh local volume gets the local `auth.users` compatibility fixture required by the existing schema migration. If an older existing volume does not have `auth.users`, apply the fixture once with `docker compose exec -T postgres psql -U libtrack -d libtrack -f /docker-entrypoint-initdb.d/01-local-auth-fixture.sql`. Existing volumes are not deleted or reset.
4. In the API terminal, enable the local profile and Flyway migrations, then start Spring:

   ```powershell
   $env:LIBTRACK_DB_URL = "jdbc:postgresql://localhost:5433/libtrack"
   $env:LIBTRACK_DB_USER = "libtrack"
   $env:LIBTRACK_DB_PASSWORD = "libtrack_dev_password"
   $env:SPRING_PROFILES_ACTIVE = "local-dev"
   $env:FLYWAY_ENABLED = "true"
   .\mvnw.cmd spring-boot:run
   ```

5. In a second terminal, install dependencies and start Vite in local mode:

   ```powershell
   npm ci
   $env:VITE_LIBTRACK_LOCAL_DEV = "true"
   npm run dev
   ```

6. Open `http://127.0.0.1:5173`. The staff workspace uses the local development administrator seeded by the API, requires no login, and reads/writes through Spring and local PostgreSQL. The local UI identifies itself as **LOCAL DEVELOPMENT**. Student account linking and Supabase sign-in require the authenticated configuration described below.

The API and Vite bind to loopback. The local Spring profile uses only `LIBTRACK_DB_*` database settings and refuses a non-loopback JDBC host before opening a connection. It enables local Flyway migrations and preserves the existing Docker volume. Do not run `docker compose down -v` if you want to keep local data.

To return to the authenticated configuration later, stop both processes and start them without `SPRING_PROFILES_ACTIVE=local-dev` and `VITE_LIBTRACK_LOCAL_DEV=true`. Production authentication and JWT validation remain enabled outside the local profile.

## Connect Supabase

Create a Supabase project and create a dedicated `libtrack_runtime` login role before running Flyway. Migration V3 grants that role the API's required table access and removes access for Supabase's browser-facing `anon` and `authenticated` roles. The role must exist before Flyway starts. Copy the JDBC **Session Pooler** connection details from **Database → Connect** (use the pooler username format shown there) and configure:

```text
SUPABASE_APP_DB_URL=jdbc:postgresql://<host>:<port>/postgres?sslmode=require
SUPABASE_APP_DB_USER=<least-privilege runtime role>
SUPABASE_APP_DB_PASSWORD=<runtime password>

SUPABASE_FLYWAY_DB_URL=jdbc:postgresql://<host>:<port>/postgres?sslmode=require
SUPABASE_FLYWAY_DB_USER=<migration role>
SUPABASE_FLYWAY_DB_PASSWORD=<migration password>

SUPABASE_AUTH_ISSUER_URI=https://<project-ref>.supabase.co/auth/v1
SUPABASE_AUTH_AUDIENCE=authenticated
SUPABASE_AUTH_JWT_MODE=JWKS
SUPABASE_AUTH_PUBLISHABLE_KEY=<Supabase publishable key used to verify confirmed student emails>
```

Use the database owner only for the separate Flyway connection. Never use the owner credentials for the API runtime. The runtime role password is a new password you create for `libtrack_runtime`; it is distinct from the project database password. The Vite app uses only the Supabase project URL and publishable key for Auth; it does not query the public database schema.

Use a direct PostgreSQL connection for persistent Spring hosting, or Supabase's **session** pooler where the host only supports IPv4; JDBC/Flyway must not use the transaction pooler. Require TLS. Keep the two database credentials and all API secrets in the host's secret manager. Do not expose either database credential through Vite. Set `FLYWAY_ENABLED=false` on API runtime instances and run reviewed migrations in a separate deployment job with the Flyway role. Only use `FLYWAY_ENABLED=true` locally or in that migration job.

If the Supabase project still signs tokens with legacy HS256, set `SUPABASE_AUTH_JWT_MODE=LEGACY_HS256` and configure `SUPABASE_AUTH_PUBLISHABLE_KEY` server-side. Spring will ask Supabase Auth to validate each bearer token. Prefer moving to Supabase's asymmetric signing keys after reviewing the project-wide impact; do not rotate keys as part of app deployment.

## API foundation

- `GET /api/v1/health` — public service status.
- `GET /api/v1/session` — authenticated staff or student identity resolved from its database link.
- `POST /api/v1/student-registration` — link the signed-in Supabase identity to one active student record after the email is confirmed and the library number and roster email match.
- `GET /api/v1/dashboard/summary` — live circulation and catalog counts.
- `/api/v1/catalog/books` — searchable, paginated book metadata and physical copies.
- `/api/v1/members` — searchable, paginated member records.
- `/api/v1/loans` and `/api/v1/holds` — circulation and hold queue operations.
- `/api/v1/staff`, `/api/v1/settings`, and `/api/v1/audit` — staff administration, library policy, and audit history. Staff changes and policy updates are restricted to admins on the API.
- `/api/v1/student/profile`, `/catalog`, `/loans`, and `/attendance` — student-only, self-scoped read APIs.
- `POST /api/v1/attendance/kiosk/scan` — staff-authenticated QR/manual check-in/check-out toggle with duplicate scan protection.
- `GET /api/v1/reports/library?from=YYYY-MM-DD&to=YYYY-MM-DD` — date-filtered real attendance, circulation, return, overdue, and inventory data.
- `GET /actuator/health` — Spring health including the database indicator.
- Protected staff routes require an active `staff_users` mapping; student routes accept only an active `members.auth_user_id` mapping. Students cannot call staff or circulation-write routes.

## Database notes

The initial migration creates the schema and inserts starter policy settings (14-day default loan, five-loan member limit, one renewal, three-day hold pickup window). Policy values should be reviewed with the library before live use. Fees are disabled until the library configures its currency and fee policy. Migration V2 links staff Auth users by matching existing staff `login_identifier` to Auth email; unmatched accounts stay unlinked and are safely denied until an administrator links them. Migrations V5–V7 add student programme/level, library visits, Supabase Auth student links, and short-lived kiosk scan IDs; they preserve existing member and circulation tables.

## Project layout

```text
src/main/java/com/libtrack/          Spring Boot API
src/main/resources/db/migration/     Flyway SQL migrations
src/ui/                              React application and styles
outputs/                             Reviewable project design spec
```

