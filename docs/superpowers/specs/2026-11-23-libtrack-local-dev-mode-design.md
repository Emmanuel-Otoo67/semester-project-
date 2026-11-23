# LibTrack Local Development Mode Design

**Date:** 2026-11-23

**Status:** Approved by user on 2026-11-23.

## Context

LibTrack currently requires Supabase Auth in the React app and a valid Supabase JWT in the Spring API before staff workflows can load. The user wants to defer authentication while completing the ground application. The temporary mode must use local PostgreSQL only. The local administrator row already has a place in the schema, and audit records require a staff actor row.

## Goal

Allow the existing workspace pages and API workflows to run locally without a sign-in step, using a local PostgreSQL database and a seeded local development administrator. Keep Supabase Auth available to restore after the ground app is complete.

## Approved direction

Add an explicit `local-dev` runtime mode rather than deleting or weakening the existing Supabase integration. The mode is opt-in and isolated from normal application startup.

- The React client skips Supabase initialization and opens the workspace directly only when its local development flag is set.
- The Spring API accepts requests without a JWT only when the `local-dev` profile is active. The normal security configuration remains the default for every other profile.
- The API resolves a seeded `Local Development Admin` row from the local database and uses its staff ID for role checks and audit events.
- The local profile binds the API to loopback and fails at startup if the datasource points to a non-loopback host. Vite must also bind explicitly to `127.0.0.1` in local mode.
- Local development uses the existing Docker Compose PostgreSQL service and Flyway schema. It does not connect to the hosted Supabase database.
- The UI clearly labels the workspace as local development mode. It does not show a fake sign-in or sample operational records; pages continue to read and write through the existing API.

## Runtime selection and safety boundary

Local no-login mode requires an explicit server profile and an explicit frontend flag. Neither is the production default. The frontend flag alone cannot disable backend security, and the backend profile alone does not cause the production UI to skip sign-in.

The local profile must validate the configured JDBC host before creating the application context. Accept loopback hosts (`localhost`, `127.0.0.1`, and `::1`) and reject all other hosts. It must also bind the API to `127.0.0.1`. A failed local-database guard should stop startup with an actionable message instead of falling back to Supabase credentials.

## Local staff identity

The local database receives one deterministic, active `ADMIN` staff row with no Supabase `auth_user_id`. This row is seeded only under the local profile and never through a production migration. The local API session endpoint returns that row as the current staff identity. Mutating workflows and audit trails use its staff ID, preserving existing service-level rules and database foreign keys.

## Request flow

1. The developer starts the local PostgreSQL container and the API with `local-dev` enabled.
2. The API validates that it is bound to loopback and connected to loopback PostgreSQL, applies local Flyway migrations when configured, and ensures the local development staff row exists.
3. Vite starts with the local frontend flag enabled.
4. The app obtains its local staff identity from `GET /api/v1/session`, then renders the existing workspace at the same URL.
5. API requests carry no bearer token. The local-profile security chain resolves the local staff identity and continues through the existing controllers and services.
6. Writes stay in local PostgreSQL; audit events use the seeded local staff row.

## Error handling

- If local mode is selected in Vite but the API is not running, show the existing API connection error with a persistent retry action.
- If local mode is selected but the API is running without the `local-dev` profile, show a clear configuration error rather than falling back to anonymous API access.
- If the local profile sees a non-loopback database URL, abort startup and identify the required local URL shape without printing credentials.
- Normal Supabase sign-in, JWT verification, staff linking, and production authorization remain unchanged outside `local-dev`.

## Out of scope

- Disabling authentication in production, staging, or any profile using hosted Supabase data.
- Removing Supabase Auth code, migrations, or staff administration.
- Creating a public API mode, seeded sample catalog, or browser-side database writes.
- Rotating Supabase JWT signing keys or changing hosted database contents.

## Acceptance criteria

- Local PostgreSQL plus both explicit local-mode switches opens the workspace without Supabase sign-in.
- Dashboard, catalog, members, circulation, holds, audit, settings, and staff screens continue to call the API and use persisted local records.
- Local mutations and audit events use the seeded local staff identity.
- The local API refuses non-loopback datasource hosts and listens only on loopback.
- With local flags absent, the app still requires Supabase Auth and the API still validates Supabase JWTs and staff mappings.
- No production migration seeds the local staff row, and no hosted database is changed.

## Open implementation details

The implementation plan should choose the smallest integration point for resolving a local staff identity across existing controllers, ensure the seed is idempotent on existing local volumes, and add focused tests for local-mode isolation and unchanged production security.

