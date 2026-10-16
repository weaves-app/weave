# Native Expanded-English Fixture Contract

WEA-28 · Planned test tooling for S08/T035–T037; not implemented or executed by artifact remediation.

## Activation and files

Use a separately selected `apps/mobile/metro.i18n-fixture.config.cjs`, extending the normal Metro configuration. Read `WEAVE_I18N_FIXTURE_SCENARIO` in the Node configuration process; allow exactly login, verification, home, retry and recovery, and reject missing/unknown values before serving a bundle. This is a test-tool input, not an app preference, production environment setting or language override.

The configuration maps native `/index.bundle` requests to the selected `apps/mobile/src/localization/testing/native-entries/{scenario}.tsx` via `server.rewriteRequestUrl`, retaining query parameters, absolute/relative URL form, platform, source-map and hot-reload behavior. Delegate unrelated requests unchanged. Each entry registers the existing app.json name and composes actual app/components through injected interfaces; it must not import index.ts and register the app twice.

The same explicit configuration delegates resolution, then redirects the resolved canonical `src/localization/resources/en.ts` module to `src/localization/testing/expanded-en.ts`. The expanded module imports the original catalog; exempt requests originating from that expanded module from redirection to prevent a cycle. Preserve the canonical export contract and let all other resolution use the existing resolver. This makes normal scoped engines and the pure provider-free recovery resolver see expanded English in this fixture, without adding resource-injection dependencies to recovery.

Metro 0.84.5 installed types expose rewriteRequestUrl and resolveRequest. The [official configuration reference](https://metrobundler.dev/docs/configuration/#rewriterequesturl) documents URL rewriting. Use this hook rather than deprecated enhanceMiddleware; verify delegation against the installed version during implementation.

## Expanded resource rules

Copy every required English entry into a fresh immutable test catalog. Expand each message to approximately twice its normal word count using readable English; preserve the action/field meaning, one count placeholder in each plural form and zero placeholders in static text. Keep the source baseline unchanged. Short proper-name identity exclusions remain unchanged. Assert completeness and source immutability; do not count resource mutation as a production behavior.

Only the explicit fixture Metro configuration reaches these entries/resources. Normal index.ts, metro.config.js and release bundle commands must have no fixture import edge. Inspect both platforms' normal source maps/module lists to prove exclusion. No Android/iOS source configuration, production debug screen, in-app picker or persisted override is added. CommonJS exports in this Metro configuration are the existing framework-config exception.

## Deterministic scenario setup

Use the existing AuthenticationGateway/Clock interfaces with in-memory fixtures compatible with the published auth contracts. The existing TestGateway/TestClock may be reused if they remain Jest-free on the native bundle path. Allocate fresh instances per app activation; no actual provider, credential, token or network request is needed for these layout fixtures.

| Scenario     | Setup and normal interaction                                                                                                                   | Expected rendered state                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| login        | Resolve signed out; traverse normal method tabs/password controls                                                                              | Expanded Login and loading/error labels                                                 |
| verification | Resolve signed out; choose Email code and Send code with synthetic fixture input; gateway returns the existing challenge result                | Expanded verification instructions/code labels/actions                                  |
| home         | Resolve a synthetic validated active session through the gateway; exercise Logout                                                              | Expanded Home/sign-out and signed-out labels                                            |
| retry        | Resolve signed out; normal Email code submission returns the existing challenge result with retryAfterSeconds=60                               | Expanded retry feedback; exact 0/1/2/60 correctness remains independently automated     |
| recovery     | A stable injected auth factory throws a safe synthetic error on first activation, then returns a signed-out fixture runtime on explicit Reload | Actual boundary fallback with expanded pure English; Reload restores the normal subtree |

No extra visible fixture controls are introduced. Scenario selection occurs only by stopping/restarting fixture Metro with another allowlisted value. Native accessibility, text sizing, touch and scroll behavior are real; fixture authentication is synthetic. These runs prove expanded layout/accessibility and do not replace normal-entry native session/provider/offline acceptance.

## Test-first and validation requirements

T035 establishes importable scaffolding only, then observes meaningful failures for routing, unknown scenarios, recursion guard, baseline preservation, completeness/placeholders, actual recovery text and deterministic journey states. T036/T037 implement those behaviors and reach GREEN before native acceptance. Tooling/import errors cannot substitute for behavioral RED.

Before T047 device acceptance, bundle all five entries for Android and iOS, confirm normal bundles exclude fixture modules, and document working debug launch commands in [quickstart.md](../quickstart.md#native-expanded-english-fixture). On device, exercise all five scenarios at every applicable layout/font-scale combination in [scenario-tests.md](scenario-tests.md). Record actual dimensions/font settings, platform, scenario, screenshots/focus findings and any unavailable combinations. Compare normal and expanded wording; do not claim clipping/focus correctness from RN test props or a successful bundle.

After acceptance, stop fixture Metro, restart normal Metro with cache reset, and reload/relaunch both debug apps to verify canonical English. No production files need restoring because fixture activation never edits them.
