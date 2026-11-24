# LibTrack deployment

The public UI is a Vite static site on Vercel. The Spring API runs as a Docker web service on Render and connects to the existing hosted Supabase PostgreSQL/Auth project. The local Docker Compose database and `local-dev` profile are only for development.

## 1. Deploy the API on Render

Create a Render Blueprint from this repository and select `render.yaml`. The Blueprint keeps Flyway disabled for the running API and asks for these values in Render's protected environment settings:

- `SUPABASE_APP_DB_URL`: JDBC URL for the Supabase Session Pooler, with `sslmode=require`.
- `SUPABASE_APP_DB_USER` and `SUPABASE_APP_DB_PASSWORD`: least-privilege runtime role credentials.
- `SUPABASE_AUTH_ISSUER_URI`: `https://<project-ref>.supabase.co/auth/v1`.
- `LIBTRACK_CORS_ORIGINS`: the exact Vercel production origin, including `https://` and no trailing slash.

Do not enable Flyway on the API service. Confirm that the hosted database already has the reviewed LibTrack migrations before exposing the API. Apply any pending migrations separately with the migration account and a reviewed migration process; never put migration credentials in the app runtime or browser.

The API service name in the Blueprint is `libtrack-api`; use its Render URL for the frontend setting below. The free Render instance can sleep when idle, so the first API request after a quiet period may take time to wake it. Choose a paid always-on plan only if that delay is unacceptable.

## 2. Deploy the UI on Vercel

Import this repository as a Vite project. Use the repository root, install command `npm ci`, build command `npm run build`, and output directory `dist`. `vercel.json` sends direct route requests back to the SPA entry so refreshes on `/sign-in`, `/dashboard`, and other app routes work.

Set these Vercel production environment variables and redeploy:

- `VITE_API_BASE_URL`: the HTTPS origin of the Render API, for example `https://libtrack-api.onrender.com`.
- `VITE_SUPABASE_URL`: the existing Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's browser-safe publishable key.
- `VITE_LIBTRACK_LOCAL_DEV`: `false`.

Add the deployed Vercel origin to Supabase Auth's allowed redirect URLs. Never add database passwords, the Supabase service-role key, or the migration credentials to Vercel `VITE_*` variables; `VITE_*` values are included in the browser build.

## 3. Verify before sharing

- Check the Vercel homepage and direct navigation/refresh on each documented route.
- Check Render `/api/v1/health` and authenticated `/api/v1/session`.
- Sign in using a Supabase Auth account that is linked to an active row in `public.staff_users`.
- Verify the deployed API's CORS origin exactly matches the Vercel origin.

The create-account, forgot-password, and reset-password screens are currently visual demonstrations. They do not create users, send email, or persist account data. A production sign-in requires the existing Supabase Auth setup and staff linkage.
