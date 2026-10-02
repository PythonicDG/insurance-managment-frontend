# Architecture

The App Router lives in `app/`. Screens include login, password change, dashboard, customers,
insurance records, documents, outstanding ledger, reports, bulk upload and settings.
Reusable view components are in `components/`; date/API/receipt helpers are in `lib/`;
browser hooks are in `hooks/`. Tailwind CSS styles the interface.

`lib/api.ts` creates the Axios client using NEXT_PUBLIC_API_URL and appends `/api`.
Requests use credentials for the backend HttpOnly cookie; a legacy tab-scoped token header is also supported.
Session/profile state is stored in sessionStorage. 401 responses clear state and return to login.
Backend tokens currently have no configured inactivity expiry; tab closure clears frontend state
but must not be treated as guaranteed server-side token revocation. Explicit logout revokes the token.

Business rules and persistent data are owned by Django. Never store confidential integration credentials
in public environment variables. This app is not an offline application or a static HTML-only export;
the documented deployment uses the Next.js server and an available backend API.
Brand name/logo can be configured in business settings. Keep next-env.d.ts and .next route types generated;
do not commit them. AGENTS.md/CLAUDE.md contain intentional contributor tooling guidance.
