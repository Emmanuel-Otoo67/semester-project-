# LibTrack Supabase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Work on main; do not create a feature branch.

**Goal:** Replace the LibTrack prototype's demo data and in-memory login with a Supabase-authenticated, Spring Boot-backed library operations app using the user's Supabase PostgreSQL project.

**Architecture:** React uses Supabase Auth for staff identity and sends bearer access tokens to Spring Boot. Spring validates the token, resolves the staff role from public.staff_users, enforces permissions and business rules, and accesses Supabase PostgreSQL over JDBC/TLS. The browser never receives database credentials or a service-role key.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Security OAuth2 Resource Server, JDBC, Flyway, Supabase Auth/PostgreSQL, React 18, TypeScript, Vite.

**Spec:** outputs/LibTrack-Supabase-integration-spec.md

## Global Constraints

- Keep implementation on main; the baseline checkpoint is 1d5d533.
- Use the existing Flyway migration directory as the database schema authority.
- No database password, migration password, signing secret, or service-role key may enter Vite variables or source control.
- Resolve roles from server-owned public.staff_users, never from user-editable Auth metadata.
- All library mutations go through Spring Boot and enforce rules at service and database layers.
- Use a direct PostgreSQL connection for a persistent API host when network support allows; use Supabase session pooler for IPv4-only hosts. Do not use transaction pooling for Flyway or a long-lived JDBC pool.
- Validate JWTs according to the project's actual signing mode. Supabase's JWKS endpoint supplies asymmetric keys; it does not return keys for legacy HS256 projects. Do not rotate signing keys without separate review.
- Do not apply migrations to the hosted project until the migration is reviewed and the user explicitly asks for deployment.
- Preserve single-institution MVP scope; exclude public/member self-service, notifications, online payments, multi-branch, and external integrations.

## Review Focus

- Authenticated Supabase user without an active staff mapping is denied with a clear message.
- Disabled staff lose API access even while their Auth token remains valid.
- Legacy HS256 signing is handled safely without assuming JWKS keys exist or exposing the shared secret to the browser.
- Concurrent checkout requests for one copy cannot create multiple active loans.
- Any failed circulation transaction rolls back copy, loan, hold, and audit changes together.

---

### Task 1: Supabase identity, API security, and database configuration

**Files:**
- Modify: pom.xml, package.json, .env.example, src/main/resources/application.yml
- Create: mvnw.cmd, .mvn/wrapper/maven-wrapper.properties, .mvn/wrapper/maven-wrapper.jar (so API builds do not depend on globally installed Maven)
- Modify: src/main/java/com/libtrack/platform/config/SecurityConfig.java
- Modify: src/main/java/com/libtrack/platform/health/SessionController.java
- Create: src/main/resources/db/migration/V2__link_staff_users_to_supabase_auth.sql
- Create: src/main/java/com/libtrack/platform/auth/CurrentStaff.java
- Create: src/main/java/com/libtrack/platform/auth/StaffIdentityService.java
- Create: src/main/java/com/libtrack/platform/auth/StaffIdentityRepository.java
- Create: src/main/java/com/libtrack/platform/auth/SupabaseJwtConfiguration.java
- Create: src/ui/auth/supabase.ts, src/ui/auth/AuthProvider.tsx, src/ui/api/http.ts
- Modify: src/ui/App.tsx and vite.config.ts
- Test: src/test/java/com/libtrack/platform/auth/StaffIdentityServiceTest.java
- Test: src/test/java/com/libtrack/platform/auth/SessionAuthorizationTest.java

**Interfaces:**
- CurrentStaff(UUID id, UUID authUserId, String displayName, StaffRole role)
- StaffIdentityService.requireCurrentStaff(Jwt jwt): CurrentStaff
- StaffIdentityRepository.findActiveByAuthUserId(UUID authUserId): Optional<CurrentStaff>
- Frontend apiFetch<T>(path, init): Promise<T> attaches the current Supabase bearer token.
- GET /api/v1/session returns authenticated, staffId, displayName, and role.

- [ ] Add Spring Security resource-server/JWT validation for issuer, audience, expiry, signature, and subject. Use JWKS for asymmetric signing; choose a reviewed server-side validation route if the project still uses HS256.
- [ ] Add a unique Auth subject mapping to staff_users; preserve current data and never derive roles from Auth metadata.
- [ ] Remove HTTP Basic and the in-memory administrator.
- [ ] Add frontend sign-in, sign-out, refresh, loading, invalid credentials, unlinked/disabled staff, and expired-session states.
- [ ] Add readable 401/403 error handling and redirect expired sessions to sign-in.
- [ ] Add placeholder environment names for public Auth URL/publishable key, issuer/JWKS, runtime DB, separate Flyway credentials, and API/frontend origins. No real values.
- [ ] Keep Vite's /api proxy for local development and add a production API base URL.
- [ ] Test that non-staff and disabled staff cannot access protected routes.

---

### Task 2: Live dashboard, catalog, and member workflows

**Files:**
- Create: src/main/java/com/libtrack/dashboard/api/DashboardController.java, src/main/java/com/libtrack/dashboard/api/DashboardSummary.java, src/main/java/com/libtrack/dashboard/service/DashboardService.java, src/main/java/com/libtrack/dashboard/data/DashboardRepository.java
- Create: src/main/java/com/libtrack/catalog/api/BookController.java, src/main/java/com/libtrack/catalog/api/BookRequest.java, src/main/java/com/libtrack/catalog/service/CatalogService.java, src/main/java/com/libtrack/catalog/data/CatalogRepository.java
- Create: src/main/java/com/libtrack/members/api/MemberController.java, src/main/java/com/libtrack/members/api/MemberRequest.java, src/main/java/com/libtrack/members/service/MemberService.java, src/main/java/com/libtrack/members/data/MemberRepository.java
- Create: src/ui/api/{dashboard,catalog,members}.ts
- Create: src/ui/dashboard/DashboardPage.tsx
- Create: src/ui/catalog/{CatalogPage,BookForm}.tsx
- Create: src/ui/members/{MembersPage,MemberForm}.tsx
- Modify: src/ui/App.tsx and src/ui/styles.css
- Test: src/test/java/com/libtrack/dashboard/DashboardServiceTest.java
- Test: src/test/java/com/libtrack/catalog/CatalogServiceTest.java
- Test: src/test/java/com/libtrack/members/MemberServiceTest.java

**Interfaces:**
- GET /api/v1/dashboard/summary returns persisted counts for active members, available/on-loan copies, overdue/due-today loans, actionable holds, and recent audit activity.
- Books: GET/list, GET/detail, POST, and PUT at /api/v1/catalog/books; copy list/create/update under /api/v1/catalog/books/{bookId}/copies.
- Members: GET/list, GET/detail, POST, and PUT under /api/v1/members.
- List endpoints accept query, page, and bounded size; return items, page, size, and total.

- [ ] Implement bounded PostgreSQL dashboard queries using configured library timezone.
- [ ] Replace every hard-coded dashboard count, chart, due item, and activity row with API data.
- [ ] Implement title metadata separately from physical copies; support authors, categories, barcode uniqueness, and member-number uniqueness.
- [ ] Add server-side search/pagination and validated create/edit forms.
- [ ] Add loading, empty, field-validation, duplicate-conflict, retry, and offline states; never show sample values as real data.
- [ ] Test summary calculations, invalid fields, duplicate identifiers, pagination bounds, and role access.
- [ ] Run the targeted API tests and npm run build.

---

### Task 3: Transactional loans, returns, renewals, and holds

**Files:**
- Create: src/main/java/com/libtrack/circulation/api/LoanController.java, src/main/java/com/libtrack/circulation/api/HoldController.java, src/main/java/com/libtrack/circulation/api/CheckoutRequest.java, src/main/java/com/libtrack/circulation/api/CirculationConflictException.java
- Create: src/main/java/com/libtrack/circulation/service/CirculationService.java, src/main/java/com/libtrack/circulation/service/HoldService.java
- Create: src/main/java/com/libtrack/circulation/data/CirculationRepository.java
- Create: src/ui/circulation/{LoansPage,CheckoutPanel,HoldsPage}.tsx
- Create: src/ui/api/circulation.ts
- Modify: src/ui/App.tsx and src/ui/styles.css
- Test: src/test/java/com/libtrack/circulation/CirculationServiceTest.java, src/test/java/com/libtrack/circulation/HoldServiceTest.java

**Interfaces:**
- GET /api/v1/loans supports current/history, member, barcode, due, and overdue filters.
- POST /api/v1/loans/checkout accepts memberId and copyBarcode.
- POST /api/v1/loans/{id}/renew and /return perform explicit transitions.
- GET /api/v1/holds lists queued/ready holds; create/cancel/fulfill use explicit status transitions.

- [ ] Checkout transaction locks the copy, validates availability/member/policy, inserts the loan, updates copy status, and appends audit event atomically.
- [ ] Return transaction closes loan, updates copy state, assigns next eligible FIFO hold if required, and appends audit event.
- [ ] Renewal validates member status, renewal limit, due date, and queued holds.
- [ ] Return stable HTTP 409 domain errors for unavailable copy, suspended member, borrowing limit, and invalid transition.
- [ ] Build UI for member and barcode lookup, checkout, due date, renewal, return, and hold queue.
- [ ] Test concurrent checkout, rollback, renewals with queued holds, and return-to-next-hold behavior against PostgreSQL.
- [ ] Run targeted API tests and npm run build.

---

### Task 4: Staff administration, settings, audit, and deploy readiness

**Files:**
- Create: src/main/java/com/libtrack/staff/api/StaffController.java, src/main/java/com/libtrack/staff/service/StaffService.java
- Create: src/main/java/com/libtrack/settings/api/SettingsController.java, src/main/java/com/libtrack/settings/service/SettingsService.java
- Create: src/main/java/com/libtrack/audit/api/AuditController.java, src/main/java/com/libtrack/audit/service/AuditService.java
- Create: src/ui/admin/StaffPage.tsx, src/ui/admin/SettingsPage.tsx, src/ui/admin/AuditPage.tsx
- Create: src/ui/api/admin.ts
- Modify: README.md and .env.example
- Test: src/test/java/com/libtrack/staff/StaffAuthorizationTest.java
- Test: src/test/java/com/libtrack/audit/AuditServiceTest.java

**Interfaces:**
- Admin-only staff operations invite/link, list, change role, and disable staff.
- All staff may read policy; only admins may update it.
- Audit endpoint supports bounded pagination and actor/entity/action filters.

- [ ] Implement audited staff provisioning. Keep any Auth Admin API key server-side; if provisioning is deferred, document controlled bootstrap steps instead of exposing privileged operations to the browser.
- [ ] Enforce role boundaries on every API request, not only in frontend navigation.
- [ ] Replace remaining fake navigation/data with working views or clearly unavailable states.
- [ ] Document local startup, Supabase settings, database connection mode, first-admin provisioning, migrations, production origins, and secret placement.
- [ ] Run authorization, migration, and UI build checks. Do not apply hosted migrations until separately approved.
- [ ] Review the final diff and commit on main only after user confirms the checkpoint is ready.

## Implementation references

- Supabase JWT/JWKS behavior: https://supabase.com/docs/guides/auth/jwts
- Supabase PostgreSQL connection modes and TLS: https://supabase.com/docs/guides/database/connecting-to-postgres

