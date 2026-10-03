# Decisions

Expo: official React Native framework with npm monorepo support; use official blank TypeScript template and its compatible SDK dependencies. Alternative bare RN adds native project setup before product requirements warrant it. Expo selected by user instruction to continue.

Spec Kit: v1.1.0 source f1d3a4f8337ebbd3ae22760a9c12e3352b93a175, Codex skills mode, official CLI bundled templates. feature.json selects spec independently of ticket branch.

Release/deployment: see docs/research/weave-delivery-plan.md; no production credentials/hosting decisions assumed. Rules already configured by prior user approval are preserved.

## Review choices

Use installed Turbo 2.11.7 docs for workspace caching/prune. Retain custom interface DI checker and fix per-workspace resolution rather than adding dependency-cruiser. Keep full CI checks. Use QEMU for architecture runtime checks initially; native runners remain an optimization. Preserve license notices. Dependency bots cannot bypass ticket/spec rules; updates enter a documented adoption process. Node24 can load current source tokens but compiled packages are required for backend portability.
