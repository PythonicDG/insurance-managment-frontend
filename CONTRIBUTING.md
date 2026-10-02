# Frontend maintenance

Work in a branch and describe the behavior changed by the pull request. Run lint, typecheck,
the dependency audit and production build before review. Check changed screens against the backend.

Commit package.json and package-lock.json together for dependency changes. Install with npm ci;
do not generate a different lockfile on the production server. Keep Next.js and eslint-config-next
on matching versions. Release API contract changes with the backend update.

React Compiler is disabled. Its readiness diagnostics remain advisory; hook ordering, mutation
and TypeScript checks are enforced. Keep unrelated refactoring out of fixes and document new configuration.

Use synthetic data in issue reports. Keep environment files, dependency folders and generated builds
outside Git. Public environment values are browser-visible and must not contain credentials.
