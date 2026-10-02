# Changelog

## Unreleased - dependency security fixes (2026-10-02)

- Updated Next.js and eslint-config-next from 16.3.5 to 16.3.8 to address
  [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j).
- Updated locked brace-expansion versions to 1.1.21 and 5.0.12 using compatible npm audit fixes.
- Added a CI audit gate for high/critical dependency advisories.
- See docs/VALIDATION.md for verification; deploy with npm ci and rebuild before restarting the service.

## Unreleased - client handover preparation (2026-10-02)

- Added frontend installation, architecture, deployment and acceptance documentation.
- Added version-controlled environment examples without client credentials or deployment-specific domains.
- Added CI checks, contributor guidance, security reporting and contractual ownership notice.
- Excluded generated/local artifacts and preserved required source, lockfiles and migrations.
- See delivery validation for actual checks and outstanding acceptance items; this is not a release tag.
