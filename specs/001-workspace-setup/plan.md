# Implementation plan

Stack: npm/Turbo, Next 16, Nest 11, Prisma 7/PostgreSQL 17; React Native Community CLI official native template. Root ESLint/Prettier policy, dependency import analysis, Node behavioral policy tests, app tests and GitHub Actions. No new business domains.

Constitution gate: BDD scope/seams confirmed by user instruction to continue. TDD evidence is mandatory. Weave identity pinned locally. Use existing research for releases/promotion; hosting choices remain outside this ticket.

Slices: (1) policy validator tests and implementation; (2) interface health/application/API client tests and implementation; (3) React Native primitives/tests and mobile integration; (4) lint/boundary/DI checks with rejection fixtures; (5) hooks/SDD integration; (6) CI/code owners/tag guards and verification; (7) commit/push/PR and required-check activation.

CI runs full suite, fresh and repeat Prisma migration validation, production builds, Metro bundles and native platform compile checks. Dockerfiles establish build-once artifacts; AWS roles, ECR deployment and production promotion are not configured without account/environment choices. Release-source accepts only same-repository develop to main; future hotfix authorization must update tests/policy.

## Review remediation plan

1. RED/GREEN regression seams: identity validator, tool mutation classifier, architecture resolver, promotion/manifest/release policy.
2. Shared TypeScript/ESLint config packages; align TS to 6.0.3 if Nest tool compatibility permits (document transitive compiler exceptions); Node16 API module resolution. Workspace lint, deterministic test cache, Prisma generation task outputs.
3. Prune Docker manifests/lockfiles; verify actual images.
4. Push pipeline builds candidate digests, tests all published platforms, then official main release aliases the tested images. Keep full quality checks; persist Turbo/build caches. QA evidence and release retry semantics validated through pure test seams.
5. Mandatory Claude integration, workflow lint, shared setup, audit summary/critical gate, bounded permissions/timeouts/artifacts. Dependency updates must retain Linear/spec review; no blanket bot exemption.
6. Run verify, live PostgreSQL integration, container runtime and hosted CI; update convergence then push personally to existing PR.

Constitution check: approved BDD recorded, behavior tests precede code, interface boundaries unchanged, no history rewrite/protection bypass, main-only versions/runtime configuration.

## Round 2 implementation plan

Preserve release behavior while extracting the Docker composite and deriving versions inside Docker. Narrow Turbo inputs with a package-specific root ESLint dependency. Test optional Git config and missing-QA CLI behavior before implementation. Group architecture roots by compiler options, declare ESLint peers, then verify local checks, cache experiments, images and hosted PR checks. No release concurrency policy change or protected-branch bypass.

## Vanilla React Native plan

Keep RN 0.86.3/React 19.2.3 matched to the official template; adopt its native Android/iOS projects with hoisted dependency paths and explicit TS entrypoint. Replace Expo registration/status bar, Babel/Metro/Jest/TS tooling and scripts. Preserve native component tests; add a behavioral entrypoint RED test. Commit source native projects; ignore generated builds, pods, local SDK paths and signing material. Turbo build produces both JS bundles; CI adds native debug Android and unsigned iOS simulator compilation behind the existing mobile required status. Update active standards/agents and constitution exceptions, retain historical evidence and third-party notices. Local native SDKs are absent, so native verification runs in CI.

## Round 3 plan

First record scenarios and obtain the permanent identifier decision. Independently pin official Gradle checksum and wrapper/setup actions; use default-branch-only native cache writes, always run locked pod installation, remove native/JS serialization, and fail missing platform artifact uploads. Measure Metro before accepting a watch-scope change. Trim unused ignore text and document deferred mobile versioning. Once the identifier is supplied, add a configuration policy RED test then relocate Android packages/update both iOS configurations and verify compiled IDs. Run full verification, integration/workflow lint and hosted native checks; report cache timings without claiming PR cache writes or an unobserved warm hit.
