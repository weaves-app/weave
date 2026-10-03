# PR #1 review remediation

User approved all valid/partly valid fixes, with mandatory Claude support, on 2026-10-03. No history rewrite, SDD relaxation or protection bypass.

| Finding | Verified verdict                  | Resolution                                                                                                                                                                    |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | Valid                             | Generic tracked identities; local forbidden identities; placeholder tests. Existing public Git history remains.                                                               |
| F2      | Valid                             | Workspace lint tasks, shared ESLint package, no root tsconfig enumeration.                                                                                                    |
| F3      | Partly valid                      | Shared framework TS profiles; authored compiler 6.0.3; API Node16 resolution/rootDir. Nest CLI internal 5.9.3 is documented; Next ES2017 target remains framework-compatible. |
| F4      | Valid                             | Deterministic unit-test caching enabled with dependency typecheck graph and shared inputs; live integration stays uncached.                                                   |
| F5      | Partly valid                      | Branch-isolated persistent Turbo caches; full checks retained; isolated jobs retain their own installs.                                                                       |
| F6      | Valid                             | Both Dockerfiles use turbo prune; pruned lockfile fresh installs and real image runtime tests pass.                                                                           |
| F7      | Invalid as absolute failure claim | Node24 loaded tokens successfully. Explicit source ESM and compiled backend-package strategy documented.                                                                      |
| F8      | Partly valid                      | Unused plugin removed; Prisma generation scoped to API task; Expo notice preserved in THIRD_PARTY_NOTICES.md.                                                                 |
| F9      | Partly valid                      | Import resolution uses workspace tsconfig; alias cycle regression test. Custom DI check retained without speculative replacement dependency.                                  |
| F10     | Valid                             | Destination-aware edit classification and shell operator fixtures, including docs mentioning source paths.                                                                    |
| F11     | Valid requirement gap             | Claude rule imports, shared skills symlink, four hook events and real handler-envelope tests. Interactive workspace trust remains developer-owned.                            |
| F12     | Partly valid                      | Documented per-ticket artifacts and controlled dependency adoption; user-requested full SDD/imperative policy retained.                                                       |
| F13     | Valid                             | Push candidates reused/built once, tests use the exact release digests and every published platform. Main release never builds.                                               |
| F14     | Valid                             | Removed workflow_run publisher; branch push CI contains publishing, after required checks.                                                                                    |
| F15     | Valid                             | Production validates all QA alias digests before writes. Environment review retained.                                                                                         |
| F16     | Valid                             | Weekly grouped Dependabot proposals with cooldown and a guarded fresh-ticket adoption CLI; proposals cannot bypass policy.                                                    |
| F17     | Valid                             | Explicit timeouts and checkout persist-credentials false.                                                                                                                     |
| F18     | Valid improvement                 | Shared setup reads validated npm version from packageManager; testable manifest writer extracted. Tiny aggregate check retained.                                              |
| F19     | Partly valid                      | GHA Docker caches, OCI labels, explicit provenance/SBOM and GitHub attestations. QEMU retained for actual per-platform runtime tests.                                         |
| F20     | Valid                             | Pinned checksum-verified actionlint and offline zizmor run in policy. Narrow local-action/npm-bootstrap reasons are inline.                                                   |
| F21     | Valid visibility gap              | Audit summary plus JSON artifact; critical gate and audit-error validation; existing high/moderate findings disclosed.                                                        |
| F22     | Valid improvement                 | API/web integration only; separate required mobile job; explicit 7/30-day artifact retention.                                                                                 |
| F23     | Partly valid                      | Job-scoped permissions, dead ref removed, draft/manifest/digest retry guard; 0.x breaking change bumps minor, explicit 1.0 decision.                                          |

Validation and actual RED/GREEN observations are in evidence.md. PR verification does not exercise privileged push publication, real registry attestations, native signing or AWS deployment. No claim of successful release is made until a main push completes that flow. The main/develop branch policies and maintainer bypass preference remain unchanged.
