# Production deployment

Use a Node.js 24 LTS host or a Next.js-compatible managed platform. Start from the approved release
commit and committed package-lock.json. Build and runtime must use the agreed Node major.

1. Configure NEXT_PUBLIC_API_URL=https://api.example.com in the BUILD environment. This is a public
   origin without /api. Never put SMTP, database or Meta credentials in this repository's env.
2. Install/build:

```sh
npm ci
npm run lint
npm run typecheck
npm run build
```

The layout downloads Google Fonts through next/font/google during build; permit outbound font access.
Builds do not require a running API. Keep CI/build caches separate from release source.
3. Start behind an HTTPS reverse proxy, using a process supervisor and this repository as working directory:

```sh
npm start -- --hostname 127.0.0.1 --port 3000
```

Use `deploy/insureledger-frontend.service.example` as a starting point for systemd.
Keep the Node port private. Route app.example.com to it and terminate TLS at the proxy.
On a managed platform set the build command to `npm run build`, supply the public API URL before building,
and use its supported Next.js runtime. A static export has not been configured or validated.
4. Set backend CORS_ALLOWED_ORIGINS to https://app.example.com. Use same-site HTTPS app/api domains
with backend AUTH_COOKIE_SAMESITE=Lax and a host-only cookie unless a different topology is tested.
5. Verify login, refresh, navigation, reports, uploads, export PIN and logout with a real browser.
   Keep backend/frontend commit IDs paired in the release record.

## Release and rollback

The frontend has no database migrations. Rebuild when the public API URL changes.
Keep the previous build and matched backend release. Roll back by deploying that artifact, restart the
service and smoke test. Confirm API compatibility before independently rolling back either repository.
Hosting, DNS, certificates, monitoring and production credentials are client configuration tasks.
