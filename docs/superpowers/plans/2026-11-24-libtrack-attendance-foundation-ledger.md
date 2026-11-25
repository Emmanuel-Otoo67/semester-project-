# Attendance Foundation Execution Ledger

## Baseline

- Working in the existing `main` checkout because the user explicitly approved proceeding; preserve all prior files and do not push or deploy.
- Existing API auth applies staff identity authorization to all routes except health/session exceptions. New attendance endpoints remain behind that policy.
- Local PostgreSQL tooling is unavailable (`psql` missing; Docker Desktop Linux engine pipe unavailable). Do not test or migrate against hosted Supabase.

## Decisions

- Ruling: retain `members` and add nullable `programme` / `level` fields — this avoids duplicate student tables and keeps legacy/staff member records valid — cost if wrong: some institutions may later need structured programme/level reference tables.
- Ruling: record `checked_in_by` and `checked_out_by` staff IDs on visits, alongside existing audit events — supports traceability — cost if wrong: staff actor fields duplicate audit information.
- Ruling: use an SQL contract test for V5 while no local PostgreSQL engine is available — checks expected migration clauses but cannot prove SQL execution or RLS behavior — cost if wrong: a live SQL issue could remain until migration validation.
- Ruling: keep the first attendance UI staff-operated and manual-ID based — it delivers the paper-register replacement without an unreviewed kiosk credential — cost if wrong: kiosk-first demonstrations need the next slice sooner.

## Red/Green evidence

- `AttendanceSchemaTest` failed before V5 with `NoSuchFileException`, then passed after V5 was created.
- `MemberRepositoryTest` failed to compile against the old DTO constructor, then passed after programme/level were added through API and repository.
- `AttendanceServiceTest` failed to compile because the attendance implementation was absent, then passed after transactional service/repository/controller implementation.
- Workspace tests failed because programme/level inputs and attendance navigation were missing, then passed after implementation.
- An initial full frontend run exposed jsdom without `window.matchMedia` in an existing auth test. Added a shared test setup and confirmed all existing and new tests pass.

## Verification

- `mvnw -Dtest=AttendanceSchemaTest test`: 1 test passed after V5.
- `mvnw -Dtest=AttendanceSchemaTest,AttendanceServiceTest,MemberRepositoryTest test`: passed.
- Full `mvnw test -q`: passed.
- Focused `npm test -- src/ui/workspace/Workspace.test.tsx`: 3 tests passed.
- Full frontend `npm test`: 6 files, 30 tests passed.
- `npm run build`: passed after app changes.
- Live Supabase/Flyway run: applied pending V4 and V5 through the project's Flyway startup path; read-only verification confirmed both versions succeeded and `library_visits`, `members.programme`, and `members.level` exist.
- Fresh-context code review: no actionable correctness or security findings in this turn's attendance changes.
