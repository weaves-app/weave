# ADR 0001: Workspace foundation

Accepted 2026-10-03 under Linear WEA-6.

Use npm/Turborepo with Next web, a Nest modular monolith and Expo React Native. Share contracts/design tokens without forcing web/native renderers together. PostgreSQL/Prisma stays inside API infrastructure. Interface ports keep application/domain code independent; composition factories wire adapters.

GitHub Spec Kit is the selected SDD; BDD scenario agreement precedes TDD implementation. Google TypeScript guidance has narrow documented framework exceptions. Git hooks provide feedback and required CI/review gate integration. One workspace SemVer records releases from main; develop uses SHA artifacts. Changelog/manifest attach to the release so no bot commit mutates protected main. Promote image digests with runtime environment configuration.

Consequences: extra initial governance/testing configuration; contract design and TDD chronology still require review. Expo's compatible Jest/tool tree and Prisma CLI currently have disclosed transitive audit findings. Native signing/device tests, AWS hosting/deployment and dedicated release App identities require separate environment decisions.

Review remediation: shared TypeScript/ESLint packages own common policy while framework profiles retain required settings (including Next's ES2017 output target). Authored workspace compilers use TypeScript 6.0.3; Nest CLI retains its internal pinned TypeScript 5.9.3 dependency rather than forcing an unsupported override. API resolution is Node16. Pure UI tokens use source ESM; API-consumed packages must compile JS/declarations. Full CI checks and SDD apply to every ticket; artifacts are per feature, not per commit. Dependabot proposals are adopted into fresh ticket/spec branches rather than exempted.
