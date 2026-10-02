# Changelog

## 1.0.0 - 2026-10-02

- Added a PM2 definition for the production Next.js server.
- Documented installation, API configuration, deployment and maintenance.
- Added CI for audit, lint, TypeScript and production builds.
- Removed unused assets, import bindings and obsolete commented-out UI.
- Corrected vehicle-lookup effect dependencies.
- Fixed conditional hook ordering in the ledger payment form and typed API error handling.

### Security

- Updated Next.js and eslint-config-next to 16.3.8 for
  [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).
- Updated locked brace-expansion versions to 1.1.21 and 5.0.12.
- Added a high/critical dependency-audit gate. The patched lockfile reported zero known advisories.
