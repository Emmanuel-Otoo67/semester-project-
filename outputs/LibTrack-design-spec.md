# LibTrack design specification

## Purpose

LibTrack is a professional web application for the day-to-day operations of one school or college library. Librarians use it to maintain the catalog and physical copies, register members, check books in and out, manage reservations, and review circulation activity.

## Agreed scope

- One library institution for the initial release.
- Real circulation operations, not a demonstration-only catalog.
- React web client and Java Spring Boot REST API.
- Supabase-hosted PostgreSQL database, configured through environment variables.
- Staff-facing workflows for librarians and administrators.

## Assumptions for the first release

- Students and staff are library members; member records are managed by library staff.
- Only staff sign in to the application. Member self-service accounts are deferred.
- Librarians handle catalog and circulation tasks. Administrators can manage staff access and library-wide settings.
- The library uses one currency and one configured set of circulation defaults. These values are configurable rather than embedded in business logic.
- Notifications, online payments, barcode hardware integrations, multiple branches, and external identity-provider integration are outside the initial release.

## User roles

### Librarian

- Search and view books, copies, and member records.
- Create and update catalog records and physical copies.
- Register and update members.
- Check out, renew, return, and place holds according to library policy.
- View current loans, overdue items, and member circulation history.

### Administrator

- Perform librarian tasks.
- Create, disable, and assign roles to staff accounts.
- Set library policies such as loan duration, renewal limits, hold expiry, and overdue fee rules.
- View audit and operational reports.

## MVP capabilities

1. **Staff access:** secure sign-in, role-aware navigation, account disablement, and session expiration.
2. **Catalog:** maintain title metadata (title, authors, ISBN, publisher, publication year, subject/category, and description) separately from physical copies.
3. **Copies:** assign a unique barcode to each copy and track states such as available, on loan, on hold, lost, and withdrawn.
4. **Members:** create and update member records with a unique library number, name, member type, contact details, and active/suspended status.
5. **Circulation:** check out an available copy to an eligible member, calculate a due date from policy, renew eligible loans, and check items back in.
6. **Holds:** place a hold on a title when copies are unavailable, queue requests in order, and fulfill or expire holds as copies become available.
7. **Fees:** calculate overdue fees from the configured policy and record adjustments and payments as ledger entries. No online payment processing in MVP.
8. **Search and views:** search catalog by title, author, ISBN, or barcode; filter members and loans; provide current, overdue, and due-soon lists.
9. **Audit:** record staff actor, action, target, timestamp, and relevant before/after values for sensitive operations.
10. **Reports:** basic counts for active members, available/on-loan copies, overdue loans, and fees outstanding, with CSV export if time allows.

## Circulation rules

- Each checkout references one physical copy and one member.
- A copy can have at most one active loan.
- Checkout requires an active member, an available copy, and satisfaction of the configured borrowing limit and any account blocks.
- Due dates are derived from member type and policy; staff may not silently alter dates. Authorized overrides require a reason and are audited.
- Renewal is allowed only when policy permits, the renewal limit is not reached, and no other member is waiting for the title.
- Returning an item closes the active loan and makes the copy available, unless an active hold queue requires the copy to be reserved for the next member.
- Holds belong to titles rather than specific copies, have FIFO order, and have a configurable pickup expiry.
- Fees are represented as append-only ledger entries so adjustments do not erase the original charge.
- Concurrency must prevent two staff members from checking out the same copy at the same time.

## Architecture

```text
React browser client
        │ HTTPS / JSON REST
        ▼
Spring Boot application
  ├─ Authentication and authorization
  ├─ Catalog and member services
  ├─ Circulation and holds services
  ├─ Reporting and audit services
  └─ PostgreSQL data access / migrations
        │ JDBC over TLS
        ▼
Supabase hosted PostgreSQL
```

The Spring Boot application is a modular monolith: one deployable API with clearly separated domain modules. The browser communicates only with the application API. Database access and all privileged operations stay server-side. The app owns staff identity and role checks in the first release; the exact authentication implementation is to be selected during the build plan based on deployment and account-management needs.

## Data model outline

- `staff_users`: staff identity, login identifier, role, active state, and timestamps.
- `members`: library number, name, member type, contact details, status, and timestamps.
- `books`: shared bibliographic/title metadata.
- `book_authors`: authors linked to books where multiple authors are needed.
- `categories` and `book_categories`: subject classification.
- `book_copies`: book, unique barcode, copy status, acquisition details, and timestamps.
- `loans`: copy, member, checkout staff, checkout/due/return timestamps, renewal count, and status.
- `holds`: member, title, FIFO position/state, request time, expiry, and fulfillment copy when assigned.
- `fee_ledger`: member, optional loan, amount, entry type, reason, actor, and timestamp.
- `library_settings`: versioned policy values for loan periods, limits, renewals, fees, and hold expiry.
- `audit_events`: actor, action, entity, entity ID, timestamp, and structured change details.

Use foreign keys, check constraints, unique constraints, and indexes to protect invariants and support common searches. Database schema changes are versioned and applied through migrations; production schema changes are never made manually as the normal workflow.

## Security and configuration

- Store database URLs, credentials, and signing secrets in environment variables or the hosting provider's secret manager. Commit only a `.env.example` with placeholder names, never real values.
- Use a dedicated database role for the deployed application with only the privileges it needs; do not run the application as the Supabase `postgres` owner.
- No Supabase secret/service-role key is sent to or bundled in the React client. Since the browser uses only the Spring API, direct Data API exposure can remain disabled unless a later feature needs it.
- Enforce role-based access in Spring Security and validate input at API boundaries. Apply authorization to every request and sensitive service operation, not only to frontend navigation.
- Use TLS for deployed traffic and database connections, strong password/session handling, login throttling, and secure cookie/token settings appropriate to the selected authentication design.
- Keep audit records for role changes, policy changes, catalog/copy status changes, circulation actions, fee adjustments, and member status changes.
- Minimize personal information collected and define a backup/restore and retention approach before production use.

## Quality requirements

- Correctness: circulation constraints hold under concurrent requests and failures do not leave a copy and loan in inconsistent states.
- Usability: frequent tasks (search member, scan/enter barcode, checkout/return) are optimized for a librarian desk workflow.
- Accessibility: keyboard-operable forms and tables, clear validation, and readable contrast.
- Operability: structured logs, health checks, clear error responses, database backups, and documented deployment configuration.
- Maintainability: domain rules live in services with clear boundaries; database migrations are reviewed and repeatable.

## Acceptance criteria for MVP

- A librarian can sign in, find or create a member, find a copy by barcode, check it out, and see its due date.
- A librarian can return a copy and the system updates its availability and any queued hold state correctly.
- The system rejects checkout for a suspended member, an unavailable copy, or a member over the configured limit, and explains the reason.
- Two simultaneous checkouts cannot create two active loans for the same copy.
- Renewals, holds, overdue calculations, and fee adjustments follow configured policies and are auditable.
- Staff permissions are enforced by the API; a librarian cannot administer staff accounts or change global policy.
- A fresh environment can be deployed from documented configuration and database migrations without relying on manual database edits.

## Not in MVP

Multi-branch support, public discovery portal, member self-service login, email/SMS reminders, online payments, acquisitions/vendor management, inventory scanning campaigns, integrations with student-information systems, and advanced analytics.

## Open implementation decisions

These do not change the approved architecture but should be settled in the implementation plan: supported Java/Spring versions, authentication/session design, hosting providers, whether CSV export is in the first milestone, and the exact initial loan/renewal/fee policy values.
