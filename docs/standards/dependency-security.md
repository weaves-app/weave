# Dependency review at bootstrap

2026-10-03: npm audit reports 58 affected dependency nodes (7 moderate, 51 high). These counts include transitive parents, not 58 separate vulnerabilities. Non-breaking `npm audit fix` was attempted and did not resolve them.

Affected chains include Expo/Metro/Jest (`braces`, `node-forge`, `uuid`) and Prisma CLI (`deepmerge-ts`, `mysql2`). npm recommends incompatible Expo/Prisma downgrades or a Jest major incompatible with the SDK preset. We did not apply force fixes or unsafe major overrides. React is pinned/deduplicated to Expo's supported 19.2.3 for renderer consistency; that override is not a vulnerability suppression.

CI uploads the full current JSON report on every run. Maintainers should review upstream fixes before selecting production release dependencies, keep untrusted patterns/config out of tooling, and revisit compatible upgrades. This record is disclosure, not a blanket permanent exception or proof that the findings are harmless. Server image dependency pruning is checked independently from the mobile/build tool tree.

2026-10-04 vanilla RN migration: fresh npm installation reports 53 affected dependency nodes (3 moderate, 50 high; overlapping chains). Expo and jest-expo were removed; the version-matched RN Jest preset replaces the Expo preset. React/renderer remain matched at 19.2.3. No force audit fixes were applied. CI retains its critical severity gate and published audit artifact.
