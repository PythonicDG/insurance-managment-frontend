# Validation — 1.0.0

Checked on 2026-10-02 with Node.js 24.19.0 and Next.js 16.3.8 on Windows.

| Check | Result |
| --- | --- |
| Dependency audit | 0 known advisories across all severities |
| ESLint | 0 errors; 21 advisories |
| Route types and TypeScript | Passed |
| Production build | Passed; 14 pages generated |
| Package metadata | package.json and package-lock.json agree on name, version and dependencies |
| PM2 configuration | JavaScript syntax passed; process command and resolved paths checked |

The remaining lint advisories are 19 set-state-in-effect diagnostics, one memoization diagnostic
and one navigation diagnostic. React Compiler is disabled; compiler-readiness diagnostics remain
advisory. Hook ordering, mutation and TypeScript checks are enforced. Unused imports and bindings
were removed, and both vehicle-lookup dependency warnings were corrected.

The delivered lockfile pins Next.js/eslint-config-next to 16.3.8 and brace-expansion to 1.1.21/5.0.12.
The dependency audit is also part of CI. Advisory databases change, so each deployment runs the audit.

The clean-install check passed with npm ci. Build and type checks cover compilation and route generation;
browser behavior is verified against the running backend during deployment. The PM2 configuration is
intended for the Linux server and resolves its checkout path automatically.
