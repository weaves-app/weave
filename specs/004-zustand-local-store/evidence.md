# WEA-27 Implementation Evidence

Date: 2026-10-15. Branch: feat/WEA-27/zustand-local-store. Parent: PR #11 at c9998b4. Zustand latest was rechecked as 5.0.15 and saved exactly. Scenario approval is recorded from the user's explicit implementation request in workflow.json.

## Setup and verification

- [Baseline](evidence/baseline.txt): 94 mobile tests pass before source changes.
- [Frozen install](evidence/frozen-install.txt): exit 0; resolved lockfile, renderer privacy patch and hooks applied. Initial online add completed its manifest/lock work but left optional-platform fetch retries running; that process was stopped after the independent frozen offline install passed. No optional-package fetch failure is behavioral RED.
- [Workspace verify](evidence/verification.txt): exit 0 with disposable DATABASE_URL; lint, formatting, types, 279 policy tests, 108 mobile tests, 58 web tests, 2 API tests, production web/API builds and both Metro bundles pass.
- Initial verification required DATABASE_URL for Prisma generation; the next sandboxed attempt could not access Watchman. [Sandbox output](evidence/verification-sandbox.txt) is retained. Running the same verification with local socket/cache access passed; no test or configuration was weakened.
- [Database setup](evidence/integration-setup.txt) and [integration](evidence/integration.txt): 3/3 pass on isolated PostgreSQL 18.1, port 55447. This is not evidence for PostgreSQL 17 CI.
- [Android tests](evidence/native-android-tests.txt) and [APK compile](evidence/native-android-build.txt): BUILD SUCCESSFUL.
- [iOS tests](evidence/native-ios-tests.txt), [host contracts](evidence/native-ios-host.txt) and [unsigned simulator compile](evidence/native-ios-build.txt): pass; host contracts execute 31 tests. Builds do not establish live/device acceptance.

## S01 — coherent state

[Controller RED](evidence/us1-controller-red.txt): the original controller ignored the injected store, leaving its reader resolving after controller start; 34 existing tests passed and the new integration assertion failed. [GREEN](evidence/us1-controller-green.txt): 98 tests passed after replacing private snapshot/listeners with the injected port. Two real adapter subscribers observe the same accepted current snapshot. Existing Login/navigation assertions remain regression evidence rather than invented RED.

## S02 — failures and duplicates

Existing controller, Login, Home and navigation regressions remain intact. The injected-store test also verifies invalid-input feedback and that password/email form values do not enter snapshots. No changes to validation, pending/timeout rules or native method commands. [Final verification](evidence/verification.txt).

## S03 — stale callbacks

Injected-store integration rejects a native callback from the replaced method generation. Existing revision/generation/disposal regressions remain green. The 20-Reload test additionally attempts old-gateway events and old-store writes after every reset. [Controller GREEN](evidence/us1-controller-green.txt), [recovery/runtime GREEN](evidence/us2-green.txt).

## S04 — sign-out

Existing controller/Home/navigation tests verify success removes protected routes and pending/timeout/failure behavior remains safe. State resets are accepted complete snapshots through the same port. No new logout authority was added. [Recovery/Home/navigation suite](evidence/us2-green.txt).

## S05 — runtime lifecycle and Reload

[Lifecycle RED](evidence/us1-lifecycle-red.txt): runtime disposal failed to close its store/release gateway, allocation failure leaked gateway ownership, development effect replay reused a disposed controller, and abandoned render allocated runtimes. Four expected behavioral failures, one existing initial-state check passed. [GREEN](evidence/us1-lifecycle-green.txt): all five pass after effect-owned allocation and ordered terminal cleanup.

A one-shot state subscription binds Context on the controller's first publication, then removes itself; this respects the React external-store integration lint rule without disabling it. AuthStateReader's listener carries current/previous framework-free domain snapshots to match Zustand structural typing.

The new 20-successive-Reload regression verifies each old gateway is disposed and no old store write/listener/callback affects the fresh lifetime. [GREEN](evidence/us2-green.txt). No additional implementation was needed after this expanded regression; no artificial second RED is claimed.

## S06 — focused subscriptions and isolation

[Adapter RED](evidence/foundation-red.txt): three state replacement/notification assertions failed against the importable no-update seam. [GREEN](evidence/foundation-green.txt): full replacement, optional-error removal, identical-reference no-op, unsubscribe, disposal and independent instances pass using real Zustand.

[Selector RED](evidence/us3-selector-red.txt): projecting from a whole-state subscription caused 100 extra commits (counter 2 → 102) for an unchanged session-status selection. [GREEN](evidence/us3-green.txt): selected subscription caused zero extra status commits, while the pending consumer received all 100 changes and the independent root stayed unchanged. Home and navigation now select only the values they consume. Login retains a whole-snapshot view.

## S07 — restart and privacy

New password-pending runtime restart plus verification/active-session App restart regressions prove fresh resolving state, no restored attempt/error/secret, no Home from delayed old results, and native authority before protected access. Snapshot captures exclude sentinel password/email/code and credential fields. [GREEN](evidence/us2-green.txt), [final 108 tests](evidence/verification.txt).

The first extra restart assertion incorrectly required the optional error property to be absent during refresh; the parent explicitly publishes error: undefined. It was corrected to assert no error value. [Original expectation failure](evidence/us2-test-expectation.txt) is retained as test correction, not behavioral RED.

## Review, refactor and limits

Independent code review found no production defects. It identified missing verification/active-session restart coverage; the two added tests close that gap and the reviewer confirmed no actionable findings remain. Refactoring kept the application/domain framework-free, retained semantic constants and reusable UI, and preserved full regression suites. Generated pnpm cache ignores were added without deleting the owner's cache or reference image.

[Device acceptance](evidence/device-acceptance.md) remains unverified. Required GitHub CI/code-owner review also remains pending. See [convergence](convergence.md). No merge, deployment or release was performed.

## Stacked PR policy

The existing `scripts/policy.mjs` accepts only develop/main PR targets. The user-requested draft targets PR #11's ticket branch, so the PR-target policy check is expected to block that stacked target. Keep the check enforced; retarget develop after the parent merges and rerun required CI. No policy or protection bypass is part of WEA-27.
