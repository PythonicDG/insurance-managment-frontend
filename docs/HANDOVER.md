# Repository handover

Repository: [PythonicDG/insurance-managment-frontend](https://github.com/PythonicDG/insurance-managment-frontend).
API: [insurance-managment-backend](https://github.com/PythonicDG/insurance-managment-backend).

## Included source

The repository contains the application screens, reusable components, API client, TypeScript interfaces,
styles, dependency lockfile, environment example, PM2 configuration and maintenance documentation.

Install with `npm ci`. `package-lock.json` is the dependency source of truth.
`.env.example` contains a working local API origin; private env files, node_modules and build output
stay outside Git. The frontend contains no database, SMTP or Meta credentials.

## Running and maintaining the application

Use [Installation](INSTALLATION.md) for local setup and [Deployment](DEPLOYMENT.md) for the server.
The frontend needs a production build before PM2 starts it. Rebuild whenever NEXT_PUBLIC_API_URL changes.
API contract changes are released with the companion backend.

[Validation](VALIDATION.md) records the build and dependency checks.
[Architecture](ARCHITECTURE.md) describes screens and authentication; [Security](../SECURITY.md) covers
browser and credential handling.

## Release verification

Verify login/logout, refresh and navigation; create a policy and payment; check customer details,
ledger totals, date filters, reports, import preview, documents and export verification.
Use synthetic data while checking integration notifications. Backend deployment and backups are
covered by the backend operating guide.

Keep both repository release commits together. Repository administrators manage access, CI checks
and reviews. Source ownership and dependency notices are in [NOTICE](../NOTICE.md).
