# Weave

One npm/Turborepo workspace: Next.js web, NestJS modular monolith API, Expo React Native mobile, Prisma and PostgreSQL in Docker. Shared semantic design tokens live in `packages/design-tokens`.

## Start

Use Node 24 LTS, npm 11 and Docker Desktop with Compose. Before committing, configure your **own personal** name/email in this clone; Weave must not use the company ashr8 identity.

```sh
git config --local user.name "YOUR_PERSONAL_NAME"
git config --local user.email "YOUR_PERSONAL_EMAIL"
git config --local weave.githubUser "YOUR_PERSONAL_GITHUB_LOGIN"
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up
npm run db:deploy
npm run dev
```

Web: http://localhost:3000. API: http://localhost:3001/api/health; database readiness: `/api/health/ready`. Expo displays its simulator/device connection instructions. To start one app: `npm run dev --workspace=@weave/mobile` (or api/web).

If `DOCKER_HOST` points to another engine on macOS, explicitly use `docker --context desktop-linux compose up -d --wait`; do not change global configuration for unrelated projects. Local credentials are development-only. Environment examples are committed; actual environment files are ignored.

## Verify

```sh
npm run verify
npm run db:deploy
npm run test:integration
```

`verify` runs lint/architecture/DI, formatting, strict types, policy/application/component tests, and all app builds. Integration needs migrated PostgreSQL and verifies live HTTP/web wiring and persistence. Mobile build exports Android/iOS JavaScript bundles; signed native builds and device/store checks require their own tooling and release plan.

Container verification:

```sh
docker build -f apps/api/Dockerfile -t weave-api:test .
docker build -f apps/web/Dockerfile -t weave-web:test .
node --test tests/containers/*.test.mjs
```

On Docker Desktop with an overridden Docker host, add `--context desktop-linux` to build commands and set `WEAVE_DOCKER_CONTEXT=desktop-linux` for the test. Test containers are removed afterward.

## Work on a ticket

1. Update develop, then create `feat/WEA-N/slug` (or fix/bugfix/hotfix). Never work directly on develop/main.
2. Read `AGENTS.md`, the constitution and app instructions. Use installed `$speckit-specify`, clarify, plan, tasks and analyze skills. The pinned Spec Kit helper creates a numbered spec directory without changing the Git branch; `.specify/feature.json` selects it.
3. Agree BDD happy/sad/edge scenarios and record confirmation/IDs in the feature's `workflow.json`. Write a failing behavioral test, implement the minimum, run green, refactor. Record actual evidence.
4. Use `$speckit-implement` and `$speckit-converge`; update tasks/evidence/convergence and run verification.
5. Commit one imperative Conventional Commit, for example `feat: add project filter [WEA-123]`. Open a PR to develop with matching Linear/spec/evidence links. CI and maintainer review gate merge.

`npm ci` installs Git hooks. Codex hooks require developer review/trust via `/hooks`; their configuration is in `.codex`. Hook behavior and limitations are documented in [hooks](docs/standards/hooks.md). Existing Spec Kit integration is pinned to v1.1.0 / source commit f1d3a4f8337ebbd3ae22760a9c12e3352b93a175. Skills are vendored; the CLI is not needed for daily skill execution. Upgrade upstream only through a reviewed tooling ticket, preserving the constitution and current feature files.

## Structure

```text
apps/api/                Nest modules, Prisma schema/migrations
apps/web/                Next App Router
apps/mobile/             Expo, reusable native components
packages/design-tokens/  Platform-neutral semantic tokens
scripts/                 Policy/architecture/hooks/release helpers
specs/                   Ticket specs, scenarios, tasks, evidence
.specify/ .agents/       Pinned GitHub Spec Kit integration
.github/                 CI, CODEOWNERS, release/promotion workflows
```

Concrete dependencies are bound in Nest composition factories. Domain/application consumers use interface ports; cross-module communication uses published contracts. Server environments configure images at runtime, and official releases promote the same digests.

Read [standards](docs/standards/README.md), [Google rule mapping](docs/standards/google-rule-mapping.md), [delivery automation](docs/standards/automation.md), [component catalogue](docs/standards/component-catalogue.md) and [dependency audit disclosure](docs/standards/dependency-security.md). AWS deployment, Linear release credentials, signed native publication and restrictive tag-creation automation identity remain separate environment decisions.
