# InsureLedger frontend

The browser application for InsureLedger: customer and vehicle records, insurance policies,
renewals, payment collection, outstanding balances, reports, documents, bulk imports and agency settings.

**Version:** 1.0.0. **Runtime:** Node.js 24, Next.js 16.3.8, React 19.2.8 and TypeScript.
The API is maintained in the [backend repository](https://github.com/PythonicDG/insurance-managment-backend).

## Start locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The included environment example connects to `http://localhost:8000`.
Start the backend and sign in with the administrator created during its installation.
On Windows PowerShell, use `npm.cmd` and `Copy-Item .env.example .env.local`.

## Documentation

| Guide | Contents |
| --- | --- |
| [Installation](docs/INSTALLATION.md) | Setup, API connection and troubleshooting |
| [Architecture](docs/ARCHITECTURE.md) | Screens, components and authentication |
| [Deployment](docs/DEPLOYMENT.md) | Production builds, PM2 and server updates |
| [Handover](docs/HANDOVER.md) | Repository contents and maintenance responsibilities |
| [Validation](docs/VALIDATION.md) | Build, type, lint and dependency audit results |

## Commands

| Command | Purpose |
| --- | --- |
| npm ci | Install the committed dependency lockfile |
| npm run dev | Start local development |
| npm run lint | Check source with ESLint |
| npm run typecheck | Generate route types and run TypeScript |
| npm audit --audit-level=high | Check dependency advisories |
| npm run build | Create a production build |
| npm start | Serve the production build |

`NEXT_PUBLIC_API_URL` is the backend origin without `/api`. It is included in the build,
so a changed API origin requires a new build. The layout uses Google Fonts during compilation.

CI runs the dependency audit, lint, typecheck and build. The Linux PM2 process is defined in
`deploy/ecosystem.config.js`. See [Contributing](CONTRIBUTING.md), [Security](SECURITY.md)
and [NOTICE](NOTICE.md).
