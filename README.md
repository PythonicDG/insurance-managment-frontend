# InsureLedger frontend

Next.js 16.3.8, React 19 and TypeScript browser application for insurance records, customer management,
payments, outstanding balances, reports, document uploads, bulk imports and business/WhatsApp settings.
Requires the separate `insurance-managment-backend` Django API.

## Getting started

Use Node.js 24 LTS and npm. Run from this repository:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell use `npm.cmd` and `Copy-Item .env.example .env.local`.
Set NEXT_PUBLIC_API_URL to the backend origin without `/api`, then open `http://localhost:3000`.
Start the backend and create an administrator using its installation guide. No default login is provided.
The public API URL is baked into production builds; rebuild after changing it.

## Documentation

- [Delivery validation and remaining items](docs/VALIDATION.md)

- [Installation and troubleshooting](docs/INSTALLATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Production deployment](docs/DEPLOYMENT.md)
- [Client handover and acceptance](docs/HANDOVER.md)
- [Security](SECURITY.md), [contributing](CONTRIBUTING.md), [release notes](CHANGELOG.md), [ownership notice](NOTICE.md)

## Commands

| Command | Purpose |
| --- | --- |
| npm ci | Install the committed package-lock.json exactly. |
| npm run dev | Local development server. |
| npm run lint | ESLint checks; advisory warnings are listed in delivery validation. |
| npm run typecheck | Generate route types and check TypeScript. |
| npm run build | Production build. Requires access to Google Fonts during build. |
| npm start | Serve a completed build; never use dev as the production server. |

GitHub Actions runs lint, typecheck and production build. Automated browser tests are not included;
use the acceptance checklist against a running backend. Keep package-lock.json committed.
Environment files, node_modules, .next and TypeScript cache output are excluded from source delivery.
