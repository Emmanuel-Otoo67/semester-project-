# LibTrack Local Development Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let LibTrack run locally without sign-in against local PostgreSQL while preserving Supabase authentication and production authorization for every non-local profile.

**Architecture:** Add an opt-in Spring `local-dev` profile that forces loopback API and PostgreSQL settings, seeds a local development administrator, and permits unauthenticated local API requests. Add a separate Vite local-mode flag that fetches the local staff identity and opens the existing workspace without constructing a Supabase client. With either switch off, the current Supabase login and JWT-protected API remain in effect.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Security, JDBC, Flyway, PostgreSQL 16, React 18, TypeScript, Vite, Vitest, JUnit 5, Mockito, Spring MockMvc.

**Spec:** `docs/superpowers/specs/2026-11-23-libtrack-local-dev-mode-design.md`

## Global Constraints

- Local no-login mode uses local PostgreSQL only.
- The local API listens on `127.0.0.1` and rejects a datasource host outside `localhost`, `127.0.0.1`, or `::1` before the datasource connects.
- Local mode is opt-in through both `SPRING_PROFILES_ACTIVE=local-dev` and `VITE_LIBTRACK_LOCAL_DEV=true`.
- Outside the `local-dev` profile and frontend flag, existing Supabase Auth/JWT checks remain unchanged.
- The local development administrator is seeded only at runtime under `local-dev`; no production migration inserts it.
- Existing pages continue to use the API and persisted local records. Do not add sample operational data or browser-side database access.
- Do not reset or delete the Docker PostgreSQL volume as part of setup.

## Review Focus

- **Hosted database URL under local profile:** must fail before Spring opens a JDBC connection. Test the guard against Supabase-style and other remote JDBC hosts.
- **Only one of the two local-mode switches enabled:** must not grant unauthenticated access; test the API and UI mismatch paths.
- **Default profile with no JWT:** protected session and data routes must still return 401; retain the existing authorization tests.
- **Repeated local startup:** must leave exactly one active deterministic local admin row and must not require `auth.users` to contain that identity.
- **Auth-dependent staff linking in local mode:** must be visibly unavailable with an explanation, while staff list/read and role/status views remain usable.

---

### Task 1: Local database boundary and development identity

**Files:**
- Create: `src/main/resources/application-local-dev.yml`
- Create: `src/main/java/com/libtrack/platform/config/LocalDevelopmentDataSourceGuard.java`
- Create: `src/main/java/com/libtrack/platform/config/LocalDevelopmentStaffInitializer.java`
- Test: `src/test/java/com/libtrack/platform/config/LocalDevelopmentDataSourceGuardTest.java`
- Test: `src/test/java/com/libtrack/platform/config/LocalDevelopmentStaffInitializerTest.java`

**Interfaces:**
- `LocalDevelopmentDataSourceGuard.assertLoopbackJdbcUrl(String jdbcUrl): void` accepts PostgreSQL JDBC URLs whose host is `localhost`, `127.0.0.1`, or `::1`; otherwise throws an `IllegalStateException` without printing credentials.
- `LocalDevelopmentStaffInitializer` creates or repairs the local identity with ID `00000000-0000-0000-0000-000000000001`, login `local-admin@libtrack.local`, display name `Local Development Admin`, role `ADMIN`, active `true`, and `auth_user_id = NULL`.

- [ ] **Step 1: Write guard tests** for IPv4 loopback, `localhost`, IPv6 loopback, a remote DNS host, and a malformed/non-PostgreSQL URL. Assert remote and malformed URLs fail with an actionable error.
- [ ] **Step 2: Run `.\mvnw.cmd -Dtest=LocalDevelopmentDataSourceGuardTest test`** and confirm the missing guard behavior fails for the remote-host case.
- [ ] **Step 3: Implement the guard** as a local-profile `BeanFactoryPostProcessor` so validation runs before `DataSource`/Flyway initialization. Normalize bracketed IPv6 hosts before comparing against the loopback allowlist.
- [ ] **Step 4: Add `application-local-dev.yml`** mapping `spring.datasource.*` and `spring.flyway.*` only to `LIBTRACK_DB_URL`, `LIBTRACK_DB_USER`, and `LIBTRACK_DB_PASSWORD`; default URL is `jdbc:postgresql://127.0.0.1:5433/libtrack`, default Flyway is enabled, and `server.address` is `127.0.0.1`. Do not reference `SUPABASE_*` database properties from this profile.
- [ ] **Step 5: Write initializer tests** for fixed identity values and repeatable initialization.
- [ ] **Step 6: Implement the idempotent local staff initializer** after Flyway schema initialization. Upsert only the deterministic local login and leave all other staff rows untouched.
- [ ] **Step 7: Run the two targeted tests and the backend suite** with the project’s existing Mockito Java-agent workaround if needed. Expected: all tests pass; a non-loopback URL is rejected before a database connection is attempted.
- [ ] **Step 8: Commit** as `feat: add local development database profile`.

---

### Task 2: Local API identity and security profile

**Files:**
- Modify: `src/main/java/com/libtrack/platform/config/SecurityConfig.java`
- Modify: `src/main/java/com/libtrack/platform/config/SupabaseJwtConfiguration.java`
- Modify: `src/main/java/com/libtrack/platform/auth/StaffIdentityRepository.java`
- Modify: `src/main/java/com/libtrack/platform/auth/StaffIdentityService.java`
- Modify: `src/main/java/com/libtrack/platform/health/SessionController.java`
- Test: `src/test/java/com/libtrack/platform/auth/LocalDevelopmentSessionTest.java`
- Modify/test: `src/test/java/com/libtrack/platform/auth/SessionAuthorizationTest.java`

**Interfaces:**
- `StaffIdentityRepository.findLocalDevelopmentAdmin(): Optional<CurrentStaff>` resolves only the active row with login `local-admin@libtrack.local`.
- `StaffIdentityService.requireCurrentStaff(Jwt jwt): CurrentStaff` returns the local seeded identity when `local-dev` is active; in every other profile it continues requiring a valid JWT subject and active staff mapping.
- Local `GET /api/v1/session` includes `localDevelopment: true`; normal session responses keep their existing shape and Supabase authorization requirements.

- [ ] **Step 1: Add failing tests** for anonymous `GET /api/v1/session` in local profile returning the seeded identity, anonymous protected routes in default profile remaining 401, and a local identity lookup failing when the seed is absent/inactive.
- [ ] **Step 2: Run those tests** and confirm the local session test fails before the local branch/configuration exists while the existing production authorization tests pass.
- [ ] **Step 3: Implement local identity resolution** in `StaffIdentityRepository` and `StaffIdentityService`; do not derive the local identity from browser input or a request header.
- [ ] **Step 4: Add the profile-specific security behavior**: `local-dev` permits requests without bearer tokens and does not create the Supabase `JwtDecoder`; normal profiles retain the existing staff authorization manager and resource-server JWT configuration. Keep CORS behavior available in both profiles.
- [ ] **Step 5: Mark local session responses** with `localDevelopment: true` while retaining `authenticated`, `staffId`, `displayName`, and `role`.
- [ ] **Step 6: Run local-session tests plus `SessionAuthorizationTest` and `StaffIdentityServiceTest`**. Expected: local no-token access works only in local profile; default mode still rejects anonymous/unlinked/disabled users.
- [ ] **Step 7: Commit** as `feat: add local development API identity`.

---

### Task 3: Frontend local-mode workspace entry

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/ui/auth/supabase.ts`
- Modify: `src/ui/auth/AuthProvider.tsx`
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/styles.css`
- Create: `vitest.config.ts`
- Create: `src/ui/auth/AuthProvider.test.tsx`

**Interfaces:**
- `VITE_LIBTRACK_LOCAL_DEV=true` selects local UI mode; absent or `false` retains Supabase sign-in.
- In local mode, `AuthProvider` calls `GET /api/v1/session` without an access token and exposes the returned local staff identity to `WorkspaceGate`.
- `Workspace` accepts an optional access token; API calls omit `Authorization` in local mode.

- [ ] **Step 1: Add frontend tests** proving local mode skips the sign-in form, calls the session API without a bearer token, renders the workspace only when the response has `localDevelopment: true`, and shows a persistent error/retry state on a profile mismatch. Add a default-mode test proving the Supabase sign-in gate remains.
- [ ] **Step 2: Add Vitest, jsdom, and React Testing Library** and a `test` script; run the tests to confirm the new behavior tests fail before implementation.
- [ ] **Step 3: Implement local-mode selection** without constructing the Supabase client when local mode is active. Do not require Supabase URL/key configuration in this mode.
- [ ] **Step 4: Update `AuthProvider` and `WorkspaceGate`** to request the local session, keep API errors visible with a retry action, and render the existing workspace at the current URL only after the API confirms local mode.
- [ ] **Step 5: Update the workspace shell** to support an optional token, show a clear “Local development” badge, and hide sign-out while in local mode.
- [ ] **Step 6: Keep Auth-only staff linking unavailable locally** with a visible note that Supabase staff-account linking returns when authentication is re-enabled; retain staff list and records returned by the API.
- [ ] **Step 7: Run the frontend tests and `npm run build`**. Expected: local-mode tests pass and the default Supabase sign-in view still builds and renders.
- [ ] **Step 8: Commit** as `feat: add local development workspace mode`.

---

### Task 4: Local run instructions and end-to-end verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `vite.config.ts`
- Test/verify: backend and frontend suites; local app run against Docker PostgreSQL

**Interfaces:**
- Backend launch: `$env:SPRING_PROFILES_ACTIVE = "local-dev"; .\mvnw.cmd spring-boot:run`.
- Frontend launch: `$env:VITE_LIBTRACK_LOCAL_DEV = "true"; npm run dev`.
- Local API health remains available at `http://127.0.0.1:8080/api/v1/health`; Vite stays at `http://127.0.0.1:5173` and proxies `/api` to the API.

- [ ] **Step 1: Document local setup** with `docker compose up -d postgres`, the two explicit launch commands, local-only data behavior, and the steps to restore Supabase auth by stopping both processes and launching without local flags. State that the local profile ignores hosted Supabase datasource settings and refuses non-loopback hosts.
- [ ] **Step 2: Add `VITE_LIBTRACK_LOCAL_DEV=false`** to `.env.example` and explicitly bind Vite’s development server to loopback.
- [ ] **Step 3: Run the full backend test suite**, frontend test suite, `npm run build`, and `git diff --check`.
- [ ] **Step 4: Run an end-to-end local smoke check**: start Docker PostgreSQL, start Spring with `local-dev`, confirm unauthenticated `/api/v1/session` returns `Local Development Admin`, start Vite with local mode, open the UI, and exercise read-only overview/catalog/member/loan/hold/audit/settings pages. Verify that the API uses local PostgreSQL and that no Supabase login request is made.
- [ ] **Step 5: Verify secure default behavior** by starting without local flags and confirming sign-in remains required and protected API routes reject missing JWTs.
- [ ] **Step 6: Commit** as `docs: document local development workflow`.

## Execution notes

- Keep the existing user data and Supabase connection values untouched. The local profile must resolve its database from `LIBTRACK_DB_*`, even when `.env` also contains `SUPABASE_APP_DB_*` values.
- Do not use `docker compose down -v`, drop databases, apply local-mode changes to hosted Supabase, or rotate Supabase signing keys.
- Each task is independently reviewable; keep commits on the existing `main` branch as in the current project workflow.
