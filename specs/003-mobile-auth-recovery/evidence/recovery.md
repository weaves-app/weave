# WEA-10 isolated recovery evidence

Date: 2026-10-08. Branch: `feat/WEA-10/mobile-auth-recovery`.

Scope: T031 isolated boundary/fallback tests and T032 recovery implementation; S12–S15.
Parent-owned T033/T034 verify session refresh and complete production composition separately.
Only `apps/mobile/src/recovery/` and this evidence file were edited for this slice.

## Public seam and observable behavior

`AppErrorBoundary` accepts `renderChildren(rootGeneration): ReactNode`. The callback executes
in a descendant `RootContent`, so failures in the factory itself are caught as well as
descendant rendering/lifecycle failures. Generation begins at zero; an explicit Reload
increments it and remounts the entire descendant tree. A synchronous consumed-generation
guard rejects duplicate and obsolete Reload closures. Persistent faults return to recovery
without automatically retrying.

`RecoveryScreen` accepts `onReload(): void`, owns its safe-area provider, seeds provider
metrics when initial native metrics are unavailable, and renders static friendly feedback
with one accessible Reload button. It reuses Button, Feedback, Typography and semantic
tokens. Scrollable layout accommodates enlarged text. It imports no authentication or
navigation context and does not require a healthy outer safe-area provider.

## RED → GREEN → REFACTOR

Callable baseline shells existed before the behavior tests: the boundary caught failures
but rendered no fallback; RecoveryScreen returned null. No missing module/import was
counted as behavioral RED.

Command:

```sh
npm run test --workspace=@weave/mobile -- --watchman=false src/recovery/app-error-boundary.test.tsx
```

Initial RED, exit 1, `/private/tmp/weave-recovery-red.log`:

```text
Unable to find an element with role: button, name: Reload
Test Suites: 1 failed, 1 total
Tests:       7 failed, 7 total
```

The tests cover render failures, lifecycle failures, root factory failures, independent
fallback mounting, seeded-error exclusion, failed subtree cleanup/fresh local state, and
explicit repeated recovery.

During the first GREEN attempt, the stale-handler test incorrectly read `onPress` from a
host accessibility node. That fixture error was corrected to capture the boundary's actual
publicly rendered RecoveryScreen callback. This harness TypeError was not behavioral RED.
The guard was then removed before running the corrected regression to obtain an independent
behavioral RED for stale callbacks.

Guard RED, exit 1, `/private/tmp/weave-recovery-guard-red.log`:

```text
S14 a persistent failure waits for each explicit Reload and rejects stale duplicate presses
Expected length: 4
Received length: 6
Received array: [0, 0, 1, 1, 1, 1]
Test Suites: 1 failed, 1 total
Tests:       1 failed, 6 passed, 7 total
```

The assertion shows an obsolete action caused additional descendant render attempts in the
same settled recovery generation. Restoring the guard prevents those additional attempts.

GREEN, exit 0, `/private/tmp/weave-recovery-green.log`:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

Refactor: format owned files; use built-in Testing Library accessibility matchers; capture
stale callbacks through the typed boundary render seam instead of unresolved renderer
instance props. Final GREEN, exit 0, `/private/tmp/weave-recovery-refactor-green.log`:

```text
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

Scoped ESLint, exit 0, `/private/tmp/weave-recovery-lint.log`:

```sh
npm exec --workspace=@weave/mobile -- eslint src/recovery
```

Mobile TypeScript check, exit 0, `/private/tmp/weave-recovery-types.log`:

```sh
npm run typecheck --workspace=@weave/mobile
```

Full mobile regression was executed, `/private/tmp/weave-recovery-regression.log`:

```text
Test Suites: 1 failed, 10 passed, 11 total
Tests:       1 failed, 62 passed, 63 total
```

Its sole failure was the concurrently edited feedback test using an unavailable
`toHaveAccessibilityState` matcher. The owning agent was informed and corrected that
matcher. Parent-owned final full-suite results supersede this intermediate snapshot.
An earlier invocation without `--watchman=false` failed to access the Watchman socket;
that environment failure was excluded from RED evidence.

## Privacy and verification limits

The boundary stores only UI failure state and generation; it never stores, renders or
logs raw error objects, stack traces, tokens or credentials. A seeded error is absent
from the rendered fallback and application-authored console calls. The test explicitly
separates React Test Renderer's own caught-error diagnostics from authored logging.

React Native 0.86.3's renderer itself calls `ExceptionsManager.handleException(error, false)`
for caught errors (`node_modules/react-native/src/private/renderer/errorhandling/ErrorHandlers.js`).
The boundary cannot guarantee suppression of those framework diagnostics through its
public API. No global/private interception or React Native source modification was added.
Thus the application logging assertion does not prove complete framework-level diagnostic
redaction; the parent must retain this FR-012 limitation.

Native crash prevention, asynchronous/event-handler exceptions, pre-mount failures and
failures inside recovery itself remain outside the error-boundary guarantee. Physical-device
safe areas, VoiceOver/TalkBack focus/announcements and large-text layout still require S15
device validation. Fresh authentication resolution, controller/subscription disposal and
valid/absent/invalid session integration remain the parent-owned T033/T034 checks.

Parent integration refinement after this isolated slice: the pinned renderer diagnostic gap above is addressed by the SHA-256-checked RN0.86.3 source patch and actual SDK handler probe recorded in contracts/sdk-compatibility.md and evidence/renderer-privacy-{red,green}.txt. This supersedes the framework gap for patched renderer diagnostic objects; physical-device log checks remain unrun. The boundary still uses no global/private runtime interception.
