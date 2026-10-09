# Validation guide

Use Node 24 and the pnpm version pinned in `package.json#packageManager`. Run the bootstrap command in the root README from the repository root if needed. Configure your own repository-local personal Git name/email.

1. `pnpm install --frozen-lockfile` — all seven importers install without lockfile changes.
2. `pnpm run verify` — lint, format, typecheck, policy/application tests and all builds pass.
3. `pnpm run db:up`, `pnpm run db:deploy`, `pnpm run test:integration` — PostgreSQL migration and live integration checks pass.
4. `pnpm exec turbo prune @weave/api --docker --out-dir=/private/tmp/weave-api-prune` (repeat for web) — pruned workspace installs with its frozen lockfile.
5. Build both Dockerfiles and run `node --test tests/containers/*.test.mjs` against test images.
6. `pnpm --filter @weave/mobile run native:android`; after locked Pod installation, `pnpm --filter @weave/mobile run native:ios` — SDK-dependent native checks; report unavailable prerequisites explicitly.
7. In a temporary fixture, change a manifest dependency without updating its lockfile and run `pnpm install --frozen-lockfile --ignore-scripts --offline` — must reject the mismatch without changing the lockfile.
