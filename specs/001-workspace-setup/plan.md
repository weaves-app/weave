# Implementation plan

Stack: npm/Turbo, Next 16, Nest 11, Prisma 7/PostgreSQL 17; Expo official TypeScript template. Root ESLint/Prettier policy, dependency import analysis, Node behavioral policy tests, app tests and GitHub Actions. No new business domains.

Constitution gate: BDD scope/seams confirmed by user instruction to continue. TDD evidence is mandatory. Weave identity pinned locally. Use existing research for releases/promotion; hosting choices remain outside this ticket.

Slices: (1) policy validator tests and implementation; (2) interface health/application/API client tests and implementation; (3) Expo primitives/tests and mobile integration; (4) lint/boundary/DI checks with rejection fixtures; (5) hooks/SDD integration; (6) CI/code owners/tag guards and verification; (7) commit/push/PR and required-check activation.

CI runs full suite, fresh and repeat Prisma migration validation, production builds and mobile exports. Dockerfiles establish build-once artifacts; AWS roles, ECR deployment and production promotion are not configured without account/environment choices. Release-source accepts only same-repository develop to main; future hotfix authorization must update tests/policy.
