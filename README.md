# LibTrack

LibTrack is a staff workspace for operating a school or college library. This repository contains the React web client, Spring Boot API foundation, and versioned PostgreSQL schema.

## Stack

- Java 21 and Spring Boot 3.5
- Maven
- React, TypeScript, and Vite
- Supabase-hosted PostgreSQL in deployment; PostgreSQL 16 for local development
- Flyway schema migrations

## What is implemented

- Supabase Auth email/password sign-in in the React client. The client sends its short-lived bearer token to the Spring API and never holds database credentials.
- Spring validates Supabase JWT issuer, audience, signature, and time claims. Configure `SUPABASE_AUTH_JWT_MODE=JWKS` for asymmetric project signing. Legacy `HS256` tokens are checked server-to-server through Supabase Auth `/user`; no shared JWT signing secret is copied into LibTrack.
- The API resolves each authenticated subject through `public.staff_users`. Inactive or unlinked users are denied on every protected endpoint. Roles come only from the database.
- Supabase PostgreSQL migrations, separate application and Flyway credentials, API health, live dashboard, catalogue and member search, pagination, create/edit APIs, and audit events.
- Existing schema constraints prevent duplicate member numbers/barcodes and multiple active loans for one physical copy.

Dashboard, catalog, and member data are read from the configured database. Circulation, staff administration, settings, and audit views are being completed; do not treat this build as deployment-ready until the checks below pass.

## Local setup

1. Install Java 21, Maven 3.9+, Node.js 20+, npm, and Docker Desktop.
2. Copy `.env.example` to `.env`, then fill the local database values and Supabase project URL/issuer/public publishable key. Spring Boot and Vite do not automatically load `.env`; export values in the terminal or use a trusted environment loader.
3. Start the local database: `docker compose up -d postgres`. A fresh local volume gets a small `auth.users` fixture so Flyway can validate the staff foreign key. Existing volumes are not deleted or reset; if it is an older volume, apply the fixture SQL from `docker/postgres/init/01-local-auth-fixture.sql` once as the database owner.
4. Start the API with environment variables loaded in your shell. In PowerShell:

   ```powershell
   $env:LIBTRACK_DB_URL = "jdbc:postgresql://localhost:5433/libtrack"
   $env:LIBTRACK_DB_USER = "libtrack"
   $env:LIBTRACK_DB_PASSWORD = "libtrack_dev_password"
   $env:SUPABASE_AUTH_ISSUER_URI = "https://<project-ref>.supabase.co/auth/v1"
   $env:SUPABASE_AUTH_JWT_MODE = "JWKS"
   $env:LIBTRACK_CORS_ORIGINS = "http://localhost:5173"
   mvn spring-boot:run
   ```

5. In a second terminal set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, run `npm install`, then `npm run dev`.
6. Create or invite a staff user with Supabase Auth, then link their Auth UUID to a LibTrack staff record. Existing rows with a matching email are auto-linked by migration V2. For the first admin only, use a database-owner session after migration:

   ```sql
   INSERT INTO public.staff_users (auth_user_id, login_identifier, display_name, role)
   VALUES ('<auth-user-uuid>', '<email>', '<display-name>', 'ADMIN');
   ```

   The role is stored server-side. Never grant admin by editing Supabase user metadata.

7. The browser calls Spring through Vite's `/api` proxy. In production, set `VITE_API_BASE_URL` to the Spring API origin and `LIBTRACK_CORS_ORIGINS` to the exact deployed frontend origin.

The `.env` file documents values but Spring Boot and Vite do not automatically load it. Set variables in the terminal, or use a trusted local environment loader. Never commit `.env`.

## Connect Supabase

Create a Supabase project and copy the JDBC connection details from **Project Settings → Database**. Configure the API process with:

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
```

Use a direct PostgreSQL connection for persistent Spring hosting, or Supabase's **session** pooler where the host only supports IPv4; JDBC/Flyway must not use the transaction pooler. Require TLS. Keep the two database credentials and all API secrets in the host's secret manager. Do not expose either database credential through Vite. Set `FLYWAY_ENABLED=false` on API runtime instances and run reviewed migrations in a separate deployment job with the Flyway role. Only use `FLYWAY_ENABLED=true` locally or in that migration job.

If the Supabase project still signs tokens with legacy HS256, set `SUPABASE_AUTH_JWT_MODE=LEGACY_HS256` and configure `SUPABASE_AUTH_PUBLISHABLE_KEY` server-side. Spring will ask Supabase Auth to validate each bearer token. Prefer moving to Supabase's asymmetric signing keys after reviewing the project-wide impact; do not rotate keys as part of app deployment.

## API foundation

- `GET /api/v1/health` — public service status.
- `GET /api/v1/session` — authenticated database-linked staff identity and role.
- `GET /api/v1/dashboard/summary` — live circulation and catalog counts.
- `/api/v1/catalog/books` — searchable, paginated book metadata and physical copies.
- `/api/v1/members` — searchable, paginated member records.
- `GET /actuator/health` — Spring health including the database indicator.
- All non-health routes require a valid Supabase bearer token and an active `staff_users` mapping.

## Database notes

The initial migration creates the schema and inserts starter policy settings (14-day default loan, five-loan member limit, one renewal, three-day hold pickup window). Policy values should be reviewed with the library before live use. Fees are disabled until the library configures its currency and fee policy. Migration V2 links staff Auth users by matching existing staff `login_identifier` to Auth email; unmatched accounts stay unlinked and are safely denied until an administrator links them.

## Project layout

```text
src/main/java/com/libtrack/          Spring Boot API
src/main/resources/db/migration/     Flyway SQL migrations
src/ui/                              React application and styles
outputs/                             Reviewable project design spec
```

