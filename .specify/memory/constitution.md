# Weave Constitution

Version: 1.2.0. Ratified: 2026-10-03. SDD: GitHub Spec Kit v1.1.0.

1. Specify behavior before implementation. Brainstorm happy, sad, and relevant edge cases, identify scenarios, agree scope, then plan and task the work. Feature specs link Linear tickets. Use the installed speckit skills; feature state is independent of Git branch naming.
2. TDD is mandatory for authored behavior: meaningful test, expected red, minimum implementation, green, refactor. Preserve evidence and run final convergence. Do not fabricate test ordering. CI alone cannot prove chronology.
3. Follow docs/standards/typescript.md and Google's TypeScript guide. Narrow exceptions: framework-required Next route/config, Prisma config default exports; runtime-decorated DTO classes. Generated/vendor sources are not authored style targets.
4. Follow SOLID, DRY, DDD and Clean Architecture. Framework-free domain/application layers depend inward through consumer-owned interfaces. Composition roots alone wire concrete implementations. No Prisma/HTTP types in domain ports.
5. Every injected authored service dependency uses an interface contract and canonical runtime token/factory. Framework bootstrapping is an explicit integration boundary.
6. UI is component-based with reusable primitives, documented variants and semantic tokens. Logic belongs in hooks/services. Web and native share tokens/contracts, not forced rendering implementations. Follow scoped app AGENTS.md.
7. Authored changes use ticket branches from develop: feat|fix|bugfix|hotfix/WEA-N/slug. main and develop receive PRs only. One-line imperative Conventional Commits include the ticket. Use ! for breaking changes. A main-origin hotfix exception is not authorized until separately decided.
8. Main-only official SemVer (breaking changes during 0.x increment minor; 1.0 graduation is explicit); develop artifacts use SHA identity. Build once and promote immutable digests. Runtime configuration differs by environment. Do not rebuild a released version or expose secrets.
9. Required CI and code owners enforce review; the maintainers' develop-quality bypass is deliberately retained by user instruction. Main quality rules have no bypass. Never use that exception silently to report unverified work as passing.
10. No unsolicited deployment or production permissions. Local hooks provide feedback; CI repeats checks. Use repository-local personal credentials and local forbidden-account configuration. Verify both author and committer before publishing.

Canonical detail: docs/standards/*.md. Amendments update this version, relevant templates/rules, tests and evidence together. Material behavior changes re-enter specification before implementation.

Amendment 1.1.0: user-approved review remediation adds Claude support, local identity configuration, tested push digests and QA prerequisite, visible critical audit gate, controlled dependency adoption, and documented 0.x versioning. Existing SDD and ticket policies remain.

Amendment 1.2.0 (2026-10-04): user selects vanilla React Native, replacing Expo. Remove the App default-export exception; framework CommonJS Babel/Metro configuration and generated native template conventions are explicit integration exceptions. Native compile checks supplement JS bundles. Signed/device/store release scope remains separate.
