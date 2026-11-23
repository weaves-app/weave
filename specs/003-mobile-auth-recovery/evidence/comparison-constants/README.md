# T055 exported comparison constants

S21/S22/S23: owner-approved strings and numbers across authored TypeScript/JavaScript.

- `red.txt`:48 expected rejections missing before implementation;64 allowed cases passed.
- `edge-red.txt`:16 additional edge failures before correction.
- `runtime-object-red.txt`:4 false-positive failures before correction.
- `green-rule.txt`:132 cases pass.
- `verify.txt`: final complete pnpm verification passes;165 policy,94 mobile,58 web and2 API tests, both mobile bundles and web/API builds.
- `integration-port-failure.txt`: temporary database restarted on wrong port; environmental failure, not TDD RED.
- `integration.txt`:3/3 pass after restoring isolated PostgreSQL18 port55439. PostgreSQL17 CI not rerun for these uncommitted edits.
- `iphone.png` / `ipad.png`: latest Login screens after simulator relaunch.

Historical session-only RED is retained in the sibling session-status directory as superseded scope. No new native source/dependency changes, provider acceptance, publication or remote CI claim is made.

## Fallback correction

`fallback-red.txt` records20 expected failures before ??/|| enforcement. `fallback-green.txt` records172 passing rule cases. `fallback-typecheck.txt` and `fallback-tests.txt` verify final workspace types and tests (205 policy,94 mobile,58 web,2 API). The three `fallback-*-lint.txt` logs are empty because the successful lint commands produced no output. Production/database results above predate the final fallback-only correction.

## Navigation and alignment corrections

`routes-red.txt`:14 expected missing-enforcement failures. `routes-green.txt`:198 passing rule cases. `routes-policy-tests.txt`:231 passing policy tests. `routes-typecheck.txt`:mobile typecheck passes. `routes-mobile-tests.txt`:Watchman sandbox failure after privacy probe passed; `routes-mobile-tests-green.txt`:94 tests pass with Watchman disabled, after the ALIGNMENT refactor. `routes-web-lint.txt`:successful quiet web lint. Mobile/shared/root lint also passed. Earlier full build/database evidence remains historical.

## Complete mobile audit

See [mobile-audit.md](mobile-audit.md) for scope, intentional literals, typed-rule RED/GREEN, all workspace tests and both production Metro bundles. `mobile-audit-workspace-tests.txt` is the final full pnpm test result after dependency synchronization.

Retained command logs have trailing whitespace and excess blank lines at EOF removed for Git hygiene; test results and diagnostic content are unchanged.
