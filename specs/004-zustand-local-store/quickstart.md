# Validation Guide: Mobile Local State

WEA-27 · 2026-10-15 · Commands below describe reproducible implementation validation. Actual results and environment limitations are in [evidence.md](evidence.md).

## Prerequisites

Work on feat/WEA-27/zustand-local-store stacked above PR #11's branch. Read spec.md and confirm S01–S07 in workflow.json before source edits; generate tasks and analyze. Use the pinned pnpm 11.1.1 and repository-recommended Node 24 LTS. Android needs the existing JDK/SDK toolchain; iOS needs Xcode, resolved native dependencies and local configuration described in apps/mobile/README.md. Database integration needs migrated disposable PostgreSQL.

No new native SDK registration or credentials are needed for the store. Existing live login acceptance uses the owner's configured development identity application and test accounts. Never print secrets or store passwords/codes in snapshots.

## Dependency adoption (implementation phase)

From the repository root:

```sh
pnpm --filter @weave/mobile add --save-exact zustand@latest
pnpm install --frozen-lockfile
```

The latest stable release verified on 2026-10-15 is 5.0.15. The command resolves the current latest tag and saves the resulting exact version. Record the resolved version and recheck compatibility if it differs from the researched release. Review only the intended manifest/lockfile diff and peer compatibility. A successful import/setup proves tooling only; it is not behavioral RED or GREEN. No new middleware, storage or native module is intended.

## Focused behavioral checks

Run ownership/activation tests T014 to behavioral RED before the first runtime/provider implementation T015. After other relevant tests have been authored, execute expected failing behavior before implementation, then rerun the same command to prove GREEN. Use the direct Jest entrypoint to target suites; full mobile test also runs the privacy probe.

```sh
pnpm --filter @weave/mobile exec jest --runInBand --watchman=false src/auth/auth-controller.test.ts
pnpm --filter @weave/mobile exec jest --runInBand --watchman=false src/auth/app-recovery.test.tsx src/navigation/root-navigator.test.tsx
pnpm --filter @weave/mobile run test --watchman=false
pnpm --filter @weave/mobile run lint
pnpm --filter @weave/mobile run typecheck
```

Target new state adapter/runtime/selector test paths from tasks.md when they exist. Expected results: [scenario mapping](contracts/scenario-tests.md) passes with real Zustand stores; 100 unrelated changes produce zero selected-consumer updates; 20 root resets permit zero stale effects; obsolete optional error fields disappear on replacement; independent stores and unsubscribed listeners remain isolated. Preserve all existing auth regression assertions.

## App and repository verification

```sh
pnpm --filter @weave/mobile run build
pnpm --filter @weave/mobile run test:native:android
pnpm --filter @weave/mobile run test:native:ios
pnpm --filter @weave/mobile run test:native:ios:host
pnpm --filter @weave/mobile run native:android
pnpm --filter @weave/mobile run native:ios
pnpm run verify
pnpm run db:deploy
pnpm run test:integration
```

Use only the configured local disposable database for db:deploy; see repository setup. Metro bundles must succeed for both platforms. Unsigned simulator/native compiles establish build compatibility, not successful device login. Missing SDK/DB/config prerequisites must be recorded as blockers, not passes.

## User journeys on Android and iOS

Start Metro with `pnpm --filter @weave/mobile run dev`, then launch the app using the platform command/configuration documented in apps/mobile/README.md. Follow the required scenario/platform matrix in [scenario mapping](contracts/scenario-tests.md#scenario-validation-applicability). S06 is a shared automated subscription check; S01–S05 and S07 have Android and iOS journeys. Verify:

1. Session check precedes Home; password, email-code and Google flows retain existing behavior.
2. Invalid input, network failure, timeout and repeated submission show existing safe feedback with no unauthorized Home.
3. Logout removes Home. Failed logout preserves existing safe recovery.
4. Catchable render failure offers Reload; Reload creates a fresh session check; stale callbacks cannot restore the old route.
5. Terminate/restart during code entry and while authenticated: no pending attempt/error/secret is restored from local state; native session validation gates protected access.
6. Background/foreground, screen readers, enlarged text and pending controls preserve parent behavior.

Capture bounded evidence without credentials. Emulator/simulator checks do not replace required real-device accessibility/lifecycle acceptance. Retain parent gaps as parent gaps.

## Delivery

Record actual RED/GREEN/refactor and final commands/results under this feature; run converge. The commit hook currently requires plan, tasks, evidence, convergence and scenario confirmation; planning does not synthesize those later artifacts or bypass the hook. Verify local personal author/committer before publication. Open a draft PR against feat/WEA-10/mobile-auth-recovery with WEA-27 and spec/evidence links; required CI/code-owner review remain mandatory. Retarget develop after the parent merges.
