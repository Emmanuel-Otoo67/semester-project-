# LibTrack Ground App Plan

**Goal:** Establish a runnable, professional LibTrack foundation using React, Spring Boot, and Supabase PostgreSQL.

**Architecture:** React provides a responsive staff workspace and calls a JSON REST API. A modular Spring Boot application owns staff security, business rules, and JDBC access to Supabase PostgreSQL. Flyway migrations define the schema and starter library settings.

**Tech Stack:** Java 21, Spring Boot 3.5.x, Maven, Spring Security, Spring Data JDBC/JDBC, PostgreSQL, Flyway, React, TypeScript, Vite, CSS.

**Spec:** `outputs/LibTrack-design-spec.md`

## Global Constraints

- One library institution, initially staff-facing.
- The browser talks only to Spring Boot; no Supabase secret is exposed to the client.
- Database schema changes use migrations.
- Keep domain areas modular and circulation writes transactional.
- Do not put real credentials in the repository.

## Review Focus

- Missing environment variables: app should fail with an actionable configuration message.
- Unavailable database: health endpoints distinguish process liveness from database readiness.
- API errors: consistent JSON errors without leaking stack traces or secrets.
- Database integrity: unique barcodes/library numbers and at most one active loan per copy.
- Browser/API mismatch: configured API base URL and CORS policy work in local development.

## Tasks

1. Establish repository structure, Maven API, Vite React TypeScript app, environment examples, and run documentation.
2. Add Spring API health/readiness endpoints, CORS configuration, request validation/error format, and backend security defaults.
3. Add Flyway migration for staff, members, catalog, copies, circulation, holds, fee ledger, settings, and audit tables plus baseline settings.
4. Build a professional responsive staff dashboard shell with navigation, overview metrics placeholders, and working API health indicator.
5. Add Docker Compose for local PostgreSQL (optional) and production configuration notes for Supabase JDBC TLS/connection settings.
6. Review the tree and verify frontend build and backend package/build where installed toolchains permit.
