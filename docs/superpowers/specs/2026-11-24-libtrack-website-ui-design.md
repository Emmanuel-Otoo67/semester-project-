# LibTrack Website UI Design

**Date:** 2026-11-24  
**Status:** Approved design; awaiting written-spec review

## Goal

Create a polished, responsive LibTrack website around the approved black and orange-yellow identity. Add a public welcome page and matching account screens, then connect their local demo flow to the existing library workspace. Preserve the working local PostgreSQL setup and real library workflows. Do not configure Supabase or persist demo credentials.

## Confirmed decisions

- Display the brand as **LibTrack**.
- Use one routed React application for public pages, account screens, and the dashboard.
- Account creation and sign-in are visual demo flows in local development. They do not create accounts, save passwords, send email, or change credentials.
- Successful local demo sign-in or account creation navigates to `/dashboard`, which continues to use the existing local development identity and API.
- Keep Supabase out of the local setup. Preserve the existing non-local authentication behavior and its protected dashboard path.
- Use existing library features and data. Do not fabricate dashboard metrics or claim unimplemented capabilities.

## Site map and behavior

| Path | Page | Behavior |
| --- | --- | --- |
| `/` | Welcome page | Public landing page with anchored Home, Features, About, FAQ, and Contact sections. Sign In goes to `/sign-in`; Get Started goes to `/create-account`. |
| `/sign-in` | Sign in | Labeled email and password form with required-field and email validation. In local development, valid form submission demonstrates success and opens `/dashboard`; no credential is stored. |
| `/create-account` | Create account | Labeled name, email, password, and confirmation fields with inline validation. In local development, valid submission demonstrates success and opens `/dashboard`; no account is created. |
| `/forgot-password` | Forgot password | Accepts an email and shows a clear demo acknowledgement. No email is sent. |
| `/reset-password` | Password reset | Presents password and confirmation fields and explains that demo submission does not save a new password. |
| `/dashboard` | Library workspace | Uses the existing local development session in local mode. Non-local access remains protected by the current authentication flow. |

Account pages clearly identify the local demo behavior. Passwords remain only in component state long enough for field validation and are cleared after submission/navigation. The public routes remain accessible without a local API session; dashboard data and actions continue through the existing API.

## Homepage

- Build a dark, spacious hero with subtle gold gradients, curved background decoration, and a responsive navigation bar.
- Place the “Track • Manage • Stay Ahead” badge, “Welcome to LibTrack” headline, short introduction, Get Started button, and Watch Demo link on the left.
- Place a slightly tilted, decorative preview of the existing dashboard on the right. The preview may show actual section labels and layout, but must not introduce fabricated metric values.
- Include a bottom benefit row and a restrained scroll cue.
- Follow the hero with feature cards for the existing catalog, member, circulation, and holds areas; a numbered workflow section; an About section; FAQ; a final CTA; and a footer with editable contact placeholders.
- The Watch Demo action scrolls to the workflow/preview area; it does not invent a video asset.
- Use generic, editable copy where detailed product claims or contact details are not yet defined.

## Account screens

- Use one shared responsive layout and component system across sign-in, create-account, forgot-password, and password-reset pages.
- Provide labels, autocomplete attributes, password visibility control where useful, inline validation, loading/success states, and links between related account pages.
- Do not imply a real account, email delivery, password reset, or identity verification in local demo mode.
- In non-local mode, preserve the existing Supabase sign-in and authenticated dashboard guard. The demo create-account/reset actions must not grant non-local dashboard access.

## Dashboard foundation

- Preserve the existing dashboard screens, endpoint calls, data, and workflow actions.
- Restyle the workspace using a light grey page background, white cards, black text, orange-yellow active navigation and primary actions, and restrained borders/shadows.
- Keep the sidebar, top navigation, page headings, content panels, and current responsive navigation behavior consistent across views.
- Add a notification-area placeholder with an honest empty state only; do not introduce a notification backend or imply alerts exist.
- Keep metrics sourced from existing API responses without replacing or inventing values.

## Visual system

| Token | Value |
| --- | --- |
| Black | `#000000` |
| Orange yellow | `#FDBF2D` |
| White | `#FFFFFF` |
| Soft background | `#F7F7F7` |
| Light border | `#EAEAEA` |
| Muted text | `#777777` |

Use a contemporary sans-serif font, generous spacing, rounded corners, clear heading hierarchy, subtle shadows, visible focus states, and reusable button/card/input styles. Orange-yellow is reserved for primary actions, active navigation, highlights, and meaningful indicators.

## Responsive behavior and motion

- Support desktop, laptop, tablet, and mobile without horizontal overflow; collapse the public navigation to an accessible mobile menu and stack the hero content on narrow screens.
- Keep form controls and buttons comfortably tappable and preserve readable type at small widths.
- Use short button press/hover transitions and restrained 400–650 ms section reveals. Entrance effects and parallax remain subtle.
- Honor `prefers-reduced-motion` by removing parallax and nonessential reveal/scroll animation.
- Make navigation, mobile menus, forms, and notification placeholder operable by keyboard and expose appropriate accessible labels and state.

## Scope boundaries

- No Supabase setup, schema changes, or local account persistence.
- No new library workflows, notification service, email delivery, password recovery backend, or fabricated metrics.
- No change to API authorization policy or local PostgreSQL data.
- Existing non-local sign-in continues through the existing provider; local demo routes do not call it.

## Acceptance criteria

1. The homepage is the default local route and follows the approved LibTrack brand and supplied layout brief.
2. All specified public and account URLs render directly and navigation works on refresh.
3. Local demo sign-in and create-account validation lead to the existing `/dashboard` workspace without saving credentials or accounts.
4. Forgot/reset pages clearly state that they do not send email or save password changes.
5. The current dashboard pages and API-backed actions remain intact and use the approved light dashboard theme.
6. Non-local dashboard access remains protected and the existing Supabase sign-in behavior remains intact.
7. Layouts work on mobile and desktop, with keyboard access and reduced-motion support.
8. Automated UI tests cover routes, demo form behavior, non-local protection, and dashboard navigation; production build succeeds.

## Self-review

- Brand naming is consistent with the user's confirmation: LibTrack.
- “Visual demo only” is explicitly scoped to local development; non-local dashboard protection is retained.
- Homepage feature content derives from existing application sections; unavailable contact/video details are placeholders or anchors.
- The notification area is an empty UI slot, not a claim of implemented notification behavior.
- Metrics and workflow actions remain API-backed and are not invented in the design.
- No Supabase work, database changes, or code implementation is authorized by this design document alone.
