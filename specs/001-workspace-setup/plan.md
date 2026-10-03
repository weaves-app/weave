# Implementation plan

Stack: npm/Turbo, Next 16, Nest 11, Prisma 7/PostgreSQL 17; Expo official TypeScript template. Root ESLint/Prettier policy, dependency import analysis, Node behavioral policy tests, app tests and GitHub Actions. No new business domains.

Constitution gate: BDD scope/seams confirmed by user instruction to continue. TDD evidence is mandatory. Weave identity pinned locally. Use existing research for releases/promotion; hosting choices remain outside this ticket.

Slices: (1) policy validator tests and implementation; (2) interface health/application/API client tests and implementation; (3) Expo primitives/tests and mobile integration; (4) lint/boundary/DI checks with rejection fixtures; (5) hooks/SDD integration; (6) CI/code owners/tag guards and verification; (7) commit/push/PR and required-check activation.

CI runs full suite, fresh and repeat Prisma migration validation, production builds and mobile exports. Dockerfiles establish build-once artifacts; AWS roles, ECR deployment and production promotion are not configured without account/environment choices. Release-source accepts only same-repository develop to main; future hotfix authorization must update tests/policy.

## Review remediation plan

1. RED/GREEN regression seams: identity validator, tool mutation classifier, architecture resolver, promotion/manifest/release policy.
2. Shared TypeScript/ESLint config packages; align TS to 6.0.3 if Nest tool compatibility permits (document transitive compiler exceptions); Node16 API module resolution. Workspace lint, deterministic test cache, Prisma generation task outputs.
3. Prune Docker manifests/lockfiles; verify actual images.
4. Push pipeline builds candidate digests, tests all published platforms, then official main release aliases the tested images. Keep full quality checks; persist Turbo/build caches. QA evidence and release retry semantics validated through pure test seams.
5. Mandatory Claude integration, workflow lint, shared setup, audit summary/critical gate, bounded permissions/timeouts/artifacts. Dependency updates must retain Linear/spec review; no blanket bot exemption.
6. Run verify, live PostgreSQL integration, container runtime and hosted CI; update convergence then push personally to existing PR.

Constitution check: approved BDD recorded, behavior tests precede code, interface boundaries unchanged, no history rewrite/protection bypass, main-only versions/runtime configuration.
