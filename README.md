# LibTrack

LibTrack is a staff workspace for operating a school or college library. This repository contains the React web client, Spring Boot API foundation, and versioned PostgreSQL schema.

## Stack

- Java 21 and Spring Boot 3.5
- Maven
- React, TypeScript, and Vite
- Supabase-hosted PostgreSQL in deployment; PostgreSQL 16 for local development
- Flyway schema migrations

## What is in the ground app

- Responsive librarian dashboard shell with overview, circulation, due-today, and recent-activity panels.
- Spring Boot API with health endpoint, request validation error format, CORS, and starter HTTP Basic access control.
- PostgreSQL schema for staff, members, catalog titles/copies, loans, holds, fee ledger, policy settings, and audit events.
- Database uniqueness constraints prevent duplicate member numbers/barcodes and multiple active loans for one physical copy.

Dashboard figures and activity are illustrative placeholders. Catalog, member, and circulation screens will become live as their API modules are implemented.

## Local setup

1. Install Java 21, Maven 3.9+, Node.js 20+, npm, and Docker Desktop.
2. Copy `.env.example` to `.env`; change `LIBTRACK_ADMIN_PASSWORD` before use.
3. Start the local database: `docker compose up -d postgres`.
4. Start the API with environment variables loaded in your shell. In PowerShell:

   ```powershell
   $env:LIBTRACK_DB_URL = "jdbc:postgresql://localhost:5433/libtrack"
   $env:LIBTRACK_DB_USER = "libtrack"
   $env:LIBTRACK_DB_PASSWORD = "libtrack_dev_password"
   $env:LIBTRACK_ADMIN_USERNAME = "admin"
   $env:LIBTRACK_ADMIN_PASSWORD = "change-this-before-running"
   $env:LIBTRACK_CORS_ORIGIN = "http://localhost:5173"
   mvn spring-boot:run
   ```

5. In a second terminal run `npm install` then `npm run dev`.
6. Open the Vite URL shown in the terminal. The browser calls the Spring Boot API through Vite's `/api` proxy. The starter login is the username and password configured for the API.

The `.env` file documents values but Spring Boot and Vite do not automatically load it. Set variables in the terminal, or use a trusted local environment loader. Never commit `.env`.

## Connect Supabase

Create a Supabase project and copy the JDBC connection details from **Project Settings → Database**. Configure the API process with:

```text
SUPABASE_DB_URL=jdbc:postgresql://<host>:<port>/postgres?sslmode=require
SUPABASE_DB_USER=<database user>
SUPABASE_DB_PASSWORD=<database password>
```

Set `SUPABASE_DB_URL`, `SUPABASE_DB_USER`, and `SUPABASE_DB_PASSWORD` from the JDBC connection details. Use a database role that can apply Flyway schema migrations. The API and Flyway use the same database connection. Keep credentials in your host's secret manager. Flyway applies `src/main/resources/db/migration` at startup. The browser does not need a Supabase key because it only uses the Spring API.

## API foundation

- `GET /api/v1/health` — public service status.
- `GET /api/v1/session` — authenticated identity and roles (HTTP Basic).
- `GET /actuator/health` — Spring health including the database indicator.
- Other routes require HTTP Basic using the configured starter administrator credentials.

The starter account is in-memory and suitable only for getting the foundation running. Before production, replace it with persistent staff accounts, individual roles, password reset/account disablement workflows, and a deliberate session strategy.

## Database notes

The initial migration creates the schema and inserts starter policy settings (14-day default loan, five-loan member limit, one renewal, three-day hold pickup window). Policy values should be reviewed with the library before live use. Fees are disabled until the library configures its currency and fee policy.

## Project layout

```text
src/main/java/com/libtrack/          Spring Boot API
src/main/resources/db/migration/     Flyway SQL migrations
src/ui/                              React application and styles
outputs/                             Reviewable project design spec
```

