# LibTrack Website UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a responsive LibTrack public website, local demo account screens, and a themed version of the existing library dashboard without changing its data workflows.

**Architecture:** Add client-side routes around the existing React application. Keep the public site independent of API startup and outside the auth provider; route sign-in/dashboard through the existing auth context. Local demo account forms may navigate to the dashboard only when local development mode is enabled. Separate public-site styles from dashboard styles while using shared CSS design tokens.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Lucide React, Vitest, Testing Library, existing Spring API and local PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-11-24-libtrack-website-ui-design.md`

## Global Constraints

- Brand name: `LibTrack`.
- Brand palette: `#000000`, `#FDBF2D`, `#FFFFFF`, `#F7F7F7`, `#EAEAEA`, `#777777`.
- Account screens in local mode are visual demos: no accounts or passwords are stored, no reset email is sent, and no credentials are changed.
- Local demo sign-in and create-account routes may navigate to `/dashboard`; non-local unauthenticated access stays protected by existing Supabase auth.
- Keep existing API requests, dashboard metrics, and workflow actions unchanged.
- Do not configure Supabase, add auth persistence, invent product capabilities, or implement notification/email services.
- Support desktop, tablet, and mobile; keep keyboard access and respect `prefers-reduced-motion`.
- Run the UI tests and production build required by the approved spec.

## Review Focus

- The public homepage must render when the local API is unavailable; test that `/` does not wait for session loading.
- An unauthenticated non-local visit to `/dashboard` must reach `/sign-in`; test the protected route with local mode disabled.
- Local account forms must never invoke Supabase or persist their passwords; test successful form completion and inspect provider/storage calls.
- Direct navigation and refresh at every documented route must render the intended page; test route resolution and unknown paths.
- Narrow viewports and reduced-motion settings must not expose inaccessible navigation or required animation; cover menu keyboard state in UI tests and verify the media rule in CSS.

---

### Task 1: Add route shell and preserve dashboard access rules

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/ui/App.tsx`
- Create: `src/ui/routing/AppRoutes.tsx`
- Create: `src/ui/routing/AppRoutes.test.tsx`
- Create: `src/ui/workspace/Workspace.tsx` (extract existing dashboard and its form components)
- Create: `src/ui/pages/HomePage.tsx` (initial route placeholder; completed in Task 2)
- Modify: `src/ui/auth/AuthProvider.test.tsx`

**Interfaces:**
- `AppRoutes` renders `/`, `/sign-in`, `/create-account`, `/forgot-password`, `/reset-password`, and `/dashboard`; unknown paths navigate to `/`.
- `src/main.tsx` owns `BrowserRouter`; `AppRoutes` declares its children and is mounted under `MemoryRouter` in tests.
- `AppRoutes` keeps the homepage outside `AuthProvider`; sign-in and dashboard routes bridge auth state through an `AuthProvider`.
- `AppRoutes` defines small sign-in/dashboard route elements that read the existing auth context and pass verified identity/token props to `Workspace`.
- Dashboard route renders the existing `Workspace` only after a local development identity or a verified non-local staff session is available.

- [ ] **Step 1: Write failing route tests**
  - Verify `/` renders a public-page placeholder without requesting `/api/v1/session`.
  - Verify `/dashboard` in local mode requests the local session and renders the existing workspace.
  - Verify `/dashboard` in non-local mode without a verified staff session navigates to `/sign-in`.
  - Verify direct `/forgot-password` and an unknown path resolve to their planned destinations.
- [ ] **Step 2: Run the route tests and confirm the expected failures**

Run: `npm test -- --run src/ui/routing/AppRoutes.test.tsx`
Expected: FAIL because the route shell and pages are not implemented.

- [ ] **Step 3: Add React Router and implement `AppRoutes`**
  - Add `react-router-dom` to dependencies and lockfile.
  - Wrap the app in `BrowserRouter` in `src/main.tsx`.
  - Implement the initial semantic placeholder `HomePage` component so `/` resolves before the full content is added in Task 2.
  - Extract `Workspace` and all dashboard-only forms/types from `src/ui/App.tsx` to `src/ui/workspace/Workspace.tsx` without changing API calls.
  - Implement `AppRoutes` with route-local auth providers for sign-in/dashboard, a public homepage placeholder, account route placeholders, and a not-found redirect.
  - Move the existing `WorkspaceGate` behavior behind `/dashboard`; redirect non-local unauthenticated visitors to `/sign-in` instead of showing an embedded login screen at `/`.
  - Keep the homepage outside `AuthProvider` so it renders without API/session calls.
  - Keep current Supabase sign-in and authorization behavior for non-local `/sign-in` and `/dashboard` routes.
  - Update existing auth provider tests to visit `/sign-in` rather than treating `/` as the login page.
- [ ] **Step 4: Run route and auth tests**

Run: `npm test -- --run src/ui/routing/AppRoutes.test.tsx src/ui/auth/AuthProvider.test.tsx`
Expected: PASS; public `/` makes no session request, local dashboard works, and non-local dashboard remains protected.

- [ ] **Step 5: Commit**

```text
feat: add public and dashboard routes
```

### Task 2: Build the responsive public homepage

**Files:**
- Modify: `src/ui/pages/HomePage.tsx`
- Create: `src/ui/pages/HomePage.test.tsx`
- Create: `src/ui/website.css`
- Modify: `src/main.tsx`
- Modify: `index.html`
- Modify: `src/ui/routing/AppRoutes.tsx`

**Interfaces:**
- `HomePage` renders semantic sections with IDs `home`, `features`, `about`, `faq`, and `contact`.
- Navigation links use those anchors; Sign In links to `/sign-in`; Get Started and final CTA link to `/create-account`.
- `DashboardPreview` is a decorative child of `HomePage`, showing real workspace section labels without fabricated metric values.

- [ ] **Step 1: Write failing homepage tests**
  - Assert the LibTrack hero heading, required section links, feature areas, and CTA destinations.
  - Assert Watch Demo links to the on-page workflow/preview, not a missing video.
  - Assert the dashboard preview contains no hard-coded operational metric values.
  - Assert the visible feature-area count animates to the actual four feature cards only when revealed; under reduced motion it displays the final value immediately.
- [ ] **Step 2: Run homepage tests and confirm the expected failures**

Run: `npm test -- --run src/ui/pages/HomePage.test.tsx`
Expected: FAIL because the homepage has not been created.

- [ ] **Step 3: Implement homepage content and responsive styles**
  - Build dark hero with gold glow/curves, responsive navigation/mobile menu, benefit row, and scroll cue.
  - Add existing-feature cards for catalog, members, circulation, and holds; numbered workflow, About, FAQ, CTA, and editable footer placeholders.
  - Use CSS tokens for the approved six color values; use generic editable copy for unsupported capability claims.
  - Add keyboard-operable mobile menu and accessible section links with an animated underline.
  - Add staggered hero entrance, an `IntersectionObserver`-based section reveal and count-up to the exact four rendered feature cards, subtle background parallax, and hover/press effects; remove nonessential transitions/parallax and render final counts immediately in `prefers-reduced-motion`.
  - Set document title, description, and theme color for the LibTrack website.
- [ ] **Step 4: Run homepage tests**

Run: `npm test -- --run src/ui/pages/HomePage.test.tsx`
Expected: PASS; page links target existing anchors/routes and preview shows no invented values.

- [ ] **Step 5: Commit**

```text
feat: add responsive LibTrack homepage
```

### Task 3: Add account screens and local demo transitions

**Files:**
- Create: `src/ui/pages/AccountPage.tsx`
- Create: `src/ui/pages/AccountPage.test.tsx`
- Modify: `src/ui/routing/AppRoutes.tsx`
- Modify: `src/ui/website.css`

**Interfaces:**
- `AccountPage` accepts `mode: 'sign-in' | 'create-account' | 'forgot-password' | 'reset-password'`, `localDemo: boolean`, and optional `onSignIn?: (email: string, password: string) => Promise<void>` props; it renders the shared layout without directly depending on auth context.
- The sign-in route bridges `useAuth().signIn` into `AccountPage`; other account routes receive the local mode flag without requiring an auth context.
- Local sign-in/create-account success navigates to `/dashboard`; forgot/reset actions show honest demo feedback and never navigate into protected pages.
- Non-local sign-in calls the existing `useAuth().signIn`; demo create-account/reset never establish non-local access.

- [ ] **Step 1: Write failing account screen tests**
  - Verify each mode renders its own heading, labels, and cross-links.
  - Verify email format and required fields; require at least 8 characters for create/reset passwords and exact confirmation match. Sign-in only requires a nonempty password.
  - Verify local sign-in/create-account navigate to `/dashboard` without calling Supabase or writing credentials to local/session storage.
  - Verify forgot/reset feedback explicitly says no email/password change occurred.
  - Verify non-local create-account cannot reach `/dashboard`; verify sign-in still delegates to the existing provider.
- [ ] **Step 2: Run account tests and confirm expected failures**

Run: `npm test -- --run src/ui/pages/AccountPage.test.tsx`
Expected: FAIL because the new screens and transitions do not exist.

- [ ] **Step 3: Implement account pages and safe transitions**
  - Use shared `AccountPage` form layout, explicit labels/autocomplete, inline field errors, and password confirmation checks (8-character minimum for create/reset only).
  - Add password visibility control with accessible labels.
  - In local mode, show demo notice and navigate to `/dashboard` only after valid sign-in/create-account fields.
  - In non-local mode, use the existing sign-in provider; show a clear unavailable message for create/reset behavior without granting access.
  - Clear password component state after submission/navigation. Do not store account data or credentials.
  - Provide the forgot/reset demo confirmation states with no network side effects.
- [ ] **Step 4: Run account and route tests**

Run: `npm test -- --run src/ui/pages/AccountPage.test.tsx src/ui/routing/AppRoutes.test.tsx src/ui/auth/AuthProvider.test.tsx`
Expected: PASS; all account modes work and no local credential persistence or unauthorized dashboard transition occurs.

- [ ] **Step 5: Commit**

```text
feat: add LibTrack account demo screens
```

### Task 4: Apply the approved theme to the existing dashboard

**Files:**
- Modify: `src/ui/workspace/Workspace.tsx`
- Modify: `src/ui/styles.css`
- Create: `src/ui/components/NotificationPlaceholder.tsx`
- Create: `src/ui/components/NotificationPlaceholder.test.tsx`

**Interfaces:**
- Existing `Workspace` keeps its current API types, route loaders, mutation endpoints, and view identifiers.
- `NotificationPlaceholder` renders an accessible empty-state panel and does not fetch or mutate data.

- [ ] **Step 1: Write failing notification placeholder test**
  - Assert the notification area announces an empty state, has a labeled trigger/panel, and makes no API request.
- [ ] **Step 2: Run the notification test and confirm expected failure**

Run: `npm test -- --run src/ui/components/NotificationPlaceholder.test.tsx`
Expected: FAIL because the placeholder does not exist.

- [ ] **Step 3: Restyle the workspace and add the empty-state placeholder**
  - Replace green highlights with the approved black/orange-yellow/white/soft-grey tokens; preserve table, modal, responsive, and status readability.
  - Keep all current dashboard fields, data mapping, and mutation handlers unchanged.
  - Add an honestly labeled empty notification surface without a backend or unread count.
  - Improve focus-visible styles and responsive navigation layout; permit 320px mobile widths without horizontal page overflow.
- [ ] **Step 4: Run notification and existing UI tests**

Run: `npm test -- --run src/ui/components/NotificationPlaceholder.test.tsx src/ui/auth/AuthProvider.test.tsx src/ui/routing/AppRoutes.test.tsx`
Expected: PASS; notification remains empty/nonfunctional and route/session behavior is unchanged.

- [ ] **Step 5: Commit**

```text
style: apply LibTrack theme to dashboard
```

### Task 5: Final regression and build check

**Files:**
- Test: all files under `src/ui/**/*.test.tsx`
- Build: `package.json` production build script

**Interfaces:**
- No new application interfaces; this task checks the integrated result against the approved design.

- [ ] **Step 1: Run the complete UI test suite**

Run: `npm test`
Expected: PASS; all route, auth, homepage, account, and notification tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS; TypeScript checks and Vite emits a production build.

- [ ] **Step 3: Review final changes**
  - Check `git diff --check`.
  - Verify every spec requirement maps to an implemented route, component, responsive style, or test.
  - Confirm no Supabase config, local account persistence, fabricated metrics, or workflow API changes entered the diff.
  - Serve the production build with Vite preview and request `/`, `/sign-in`, `/create-account`, `/forgot-password`, `/reset-password`, and `/dashboard`; each direct URL must return the SPA document so BrowserRouter can render the route on refresh.
