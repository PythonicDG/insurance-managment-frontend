# Installation

Install Git and Node.js 24 LTS (with npm). Start the Django backend first, following its guide.
Run these commands from this repository root:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell equivalents:

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

`npm.cmd` avoids PowerShell script execution policy issues. The committed lockfile is the install source
of truth; do not replace `npm ci` with an unreviewed dependency upgrade during handover.
Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`; do not append `/api`.
Use the same host label for both apps (`localhost` recommended). Open http://localhost:3000.
Use the backend-created administrator credentials; no demo password or automatic signup is supplied.

If port 3000 is occupied, select a port explicitly with `npm run dev -- --port 3001`
and add that exact origin to backend CORS_ALLOWED_ORIGINS. Restart servers after env edits.

| Symptom | Action |
| --- | --- |
| API request goes to :3000/api | NEXT_PUBLIC_API_URL is empty/missing; set it and restart/rebuild. |
| URL contains /api/api | Remove /api from NEXT_PUBLIC_API_URL. |
| CORS blocked | Backend must allow the exact frontend scheme, hostname and port. |
| Login fails after switching domains | Verify backend cookie flags and consistent localhost/127.0.0.1 naming. |
| Login credentials rejected | Create/reset the user through the backend; no supplied default exists. |
| Font fetch fails during build | Allow outbound Google Fonts access; the layout uses next/font/google. |
| Missing generated route types | Run npm run typecheck (next typegen followed by tsc). |
| Imports fail after pull | Run npm ci; verify the documented Node major. |

Verification: `npm run lint`, `npm run typecheck`, `npm run build`.
Start the production build locally with `npm start`, then exercise login and representative screens.
