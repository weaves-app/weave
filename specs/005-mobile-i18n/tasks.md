# Tasks: Mobile Internationalization Foundation

**Input**: `specs/005-mobile-i18n/` — [specification](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contracts](contracts/localization.md), [inventory](contracts/message-inventory.md), [validation guide](quickstart.md).

**Ticket / branch**: WEA-28 · `feat/WEA-28/mobile-i18n` · stacked above PR #12, baseline `04aeaf5ed3946547d55e8e5d32990d8453d95c17`.

**Tests**: Required by the feature's automated success criteria and constitution. Each new behavior follows actual RED → GREEN → REFACTOR. Importable signatures/behavior-free stubs may precede tests; missing imports, syntax errors and tooling failures are not behavioral RED. Already-green baseline checks remain regression evidence. Evidence files below are future outputs, not claims of execution.

**Format**: `- [ ] Tnnn [P?] [USn?] Action with repository-relative file paths`. `[P]` denotes independent files within the stated dependency batch; it does not authorize skipping a gate or running implementation before its tests. Tasks generation does not authorize source changes or assert scenario agreement.

## Phase 1: Setup

**Purpose**: Confirm behavior, analyze artifacts, establish truthful evidence and adopt the dependency.

- [x] T001 Review S01–S08 with the user and record actual agreement, date and public test seams in `specs/005-mobile-i18n/workflow.json`; retain English as the sole production/fallback language and no picker/persisted override. Do not infer agreement from plan/tasks commands.
- [x] T002 Run speckit-analyze across `specs/005-mobile-i18n/spec.md`, `plan.md` and `tasks.md`; resolve blocking findings through separately authorized artifact edits and rerun analysis, recording the outcome in `specs/005-mobile-i18n/workflow.json` before source/test/dependency edits.
- [x] T003 Verify active feature and branch/parent identity using `.specify/feature.json` and `specs/005-mobile-i18n/workflow.json`; initialize `specs/005-mobile-i18n/evidence.md` with S01–S08/task/test links, unrun native/device checks and parent WEA-27/WEA-10 gaps; run the current mobile test baseline and record actual environment/results in `specs/005-mobile-i18n/evidence/baseline.txt` without modifying the user image.
- [x] T004 Recheck stable latest i18next, adopt it with `pnpm --filter @weave/mobile add --save-exact i18next@latest`, update `apps/mobile/package.json` and `pnpm-lock.yaml`, run frozen install and a separate import capability check; record the actual version/peers in `specs/005-mobile-i18n/research.md` and `workflow.json`. Planning verified 26.4.5; update the design before dependent behavior if the resolved API differs. Add no React binding/backend/detector/native locale dependency.

**Gate**: T001 and T002 must pass before source/test/dependency edits, including T004. Read-only baseline/evidence preparation may proceed while agreement is pending; mark it honestly. No commit-hook bypass or fabricated later-phase artifact.

## Phase 2: Foundational Contracts, Catalog and Scoped Runtime

**Purpose**: Shared text capability before consumer migration. S02/S05 and the ownership primitives of S06/S07; FR-001, FR-005–FR-008.

- [x] T005 Declare framework-free `TextTranslator` and `DeviceLocaleSource` interfaces in `apps/mobile/src/localization/application/text-translator.ts` and `device-locale-source.ts`, independent required static/plural IDs and roles in `apps/mobile/src/localization/messages.ts`, and canonical tokens in `apps/mobile/src/localization/localization.tokens.ts`; provide behavior-free importable factory/validator/adapter seams as needed. Quote/enforce “sole supported value en; fallback en”, “Static messages accept no parameters” and “No arbitrary interpolation dictionary, language mutation, i18next types or provider resources are exposed to screens”.
- [x] T006 [P] Write and execute catalog-validator tests in `apps/mobile/src/localization/catalog.test.ts` before T008: independently enumerate 51 required entries, delete each entry in turn, reject blank/non-string/object values and unknown/extra/count markers. Quote/enforce “Required static entries must be strings containing non-whitespace text and no unresolved substitution syntax” and “Retry forms must each contain exactly one approved count marker”; save behavioral RED in `specs/005-mobile-i18n/evidence/catalog-red.txt`.
- [x] T007 [P] Write and execute static safe-English tests in `apps/mobile/src/localization/safe-english.test.ts` before T009: canonical text, corrupt/missing entries, exact role/action labels and no raw IDs/markers/blank controls. Quote/enforce “Pure, provider-free, engine-free, Intl-free; preserves the actual action role”; save behavioral RED in `specs/005-mobile-i18n/evidence/safe-english-red.txt`. Retry formatting and recovery-specific integration are tested in US2.
- [x] T008 Populate `apps/mobile/src/localization/resources/en.ts` from all 51 entries in `specs/005-mobile-i18n/contracts/message-inventory.md` and implement `validateEnglishCatalog(candidate: unknown)` in `apps/mobile/src/localization/messages.ts` to GREEN on T006; keep required IDs independent from catalog-derived keys, baseline immutable, diagnostics limited to IDs, and reject “Unknown/extra parameter names and object-valued results”.
- [x] T009 Implement static safe resolution in `apps/mobile/src/localization/safe-english.ts` to GREEN on T007: canonical entry then explicit bounded role-appropriate emergency English; preserve Reload/Try again/Log in/Send code/Verify code/Resend code/Logout/Choose another method/Continue with Google identities and field meanings. Never log resource/user/provider values or create a duplicate complete catalog.
- [x] T010 [P] Write and execute real-engine adapter tests in `apps/mobile/src/localization/infrastructure/i18next-translator.test.ts` before T012: synchronous usable static text, per-instance resource mutation isolation, canonical default on missing instance entries, blank/object/raw-ID/marker rejection and initialization failure. Quote/enforce “Fresh per root; mutable library internals cannot alter baseline or another root”; save behavioral RED in `specs/005-mobile-i18n/evidence/adapter-red.txt`.
- [x] T011 [P] Write and execute locale-adapter tests in `apps/mobile/src/localization/infrastructure/runtime-locale-source.test.ts` before T013: en/en-GB/en-IN/fr-FR/empty/undefined/array/object input, throwing read and missing/throwing Intl methods; all resolve usable en. Quote/enforce “Runtime default-locale read may be absent/invalid/throw; cannot fail startup”; save behavioral RED in `specs/005-mobile-i18n/evidence/locale-red.txt`.
- [x] T012 Implement `apps/mobile/src/localization/infrastructure/i18next-translator.ts` to GREEN on T010 using new i18next instances and copied nested resource trees; apply every configuration option in `specs/005-mobile-i18n/contracts/localization.md`, check synchronous readiness and supply safe canonical/default output. No global instance, clone with shared resources, network/plugin loader, Suspense or auth imports.
- [x] T013 Implement guarded runtime-default-locale sampling and the English-only policy in `apps/mobile/src/localization/infrastructure/runtime-locale-source.ts` to GREEN on T011; accept unknown input and always choose en without claiming ordered native OS preference enumeration, persistence or locale normalization of user/auth values.
- [x] T014 Write and execute runtime/provider/root ownership tests in `apps/mobile/src/localization/localization-runtime.test.ts` and `presentation/localization-context.test.tsx` before T015: ready text on first render, separate root resources, absent-context safe English, failing initialization/factory recovery, no external effects during lazy render, foreground sampling, listener cleanup/replay and fresh keyed Reload. Quote/enforce “Outside auth policy/state; no auth remount on locale sample/foreground”; save genuine RED in `specs/005-mobile-i18n/evidence/provider-red.txt` with existing auth ownership assertions preserved.
- [x] T015 Compose interface-injected dependencies in `apps/mobile/src/localization/localization-runtime.ts`, add `presentation/localization-context.tsx`, and wire `apps/mobile/App.tsx` inside the boundary's normal subtree above AuthProvider, reaching GREEN on T014. Keep concrete adapters in composition, optional interface-typed factory stable per mounted root, effect-owned foreground listener and no auth commands/root-key changes/form clearing on locale samples. Quote/enforce “Effect cleanup removes subscriptions only; it does not make the pure translator unusable”.
- [x] T016 Rerun T006/T007/T010/T011/T014 suites, refactor while green and run mobile lint/typecheck; record commands, expected failures, passing outputs and scenario links in `specs/005-mobile-i18n/evidence/foundation-green.txt` and `evidence.md`. Do not relabel this proven foundation as a new RED in later stories.

**Checkpoint**: Scoped static text and fallback are tested without migrated screens. No authentication controller/domain/Zustand change or new native configuration is required.

## Phase 3: US1 — Keep Existing English Journeys Complete (P1, MVP)

**Goal**: Catalog-driven normal English journeys and accessible copy. S01–S03; FR-001–FR-003, FR-009, FR-010; SC-001, SC-002, SC-004, SC-005.

**Independent test**: Inject distinctive English wording, traverse existing password/email-code/Google/verification/session/Home/sign-out states, and compare visible/spoken copy with independent approved baseline expectations. Controlled locale cases must still display English. Recovery's full failure acceptance is completed in US2.

### Tests before dependent implementation

- [x] T017 [P] [US1] Extend `apps/mobile/src/auth/login.test.tsx` with injected sentinel English for headings/labels/placeholders/tabs/instructions/loading/actions and all three auth methods, retaining independent approved literal expectations and unchanged email/password/code semantics; execute missing catalog-consumption assertions before T023 and save RED in `specs/005-mobile-i18n/evidence/us1-login-red.txt`.
- [x] T018 [P] [US1] Extend `apps/mobile/src/auth/home.test.tsx`, `src/navigation/root-navigator.test.tsx` and `src/auth/presentation/auth-context.test.tsx` with injected Home/logout/session/retry/error strings and live accessibility feedback; retain navigation/native authority and safe-error regressions, execute before T024 and save RED in `specs/005-mobile-i18n/evidence/us1-navigation-red.txt`.
- [x] T019 [P] [US1] Extend `apps/mobile/src/components/code-field.test.tsx` to require caller-supplied label/hint/instructions, keeping six-digit normalization, paste behavior and hidden decorative slots; execute before T022 and save RED in `specs/005-mobile-i18n/evidence/us1-code-field-red.txt`. Provide readonly prop declarations only if needed to reach assertions.
- [x] T020 [P] [US1] Add presentation error-map tests in `apps/mobile/src/auth/presentation/auth-messages.test.ts` covering all 13 existing safe error codes, injected text and safe unknown-code handling; execute before T021 and save RED in `specs/005-mobile-i18n/evidence/us1-errors-red.txt` without passing raw provider errors/user values to translation.

### Implementation and integration

- [x] T021 [US1] Map stable AuthErrorCode values to typed message IDs and resolve through TextTranslator in `apps/mobile/src/auth/presentation/auth-messages.ts` to GREEN on T020; preserve domain/controller/gateway code/messageKey contracts and safe unknown-error behavior, with no localization import into inner auth layers.
- [x] T022 [US1] Make `apps/mobile/src/components/code-field.tsx` consume readonly resolved label/hint/instruction props to GREEN on T019; retain input/autocomplete/accessibility semantics and existing primitives/tokens rather than making generic controls depend on i18next or Context.
- [x] T023 [US1] Migrate copy in `apps/mobile/src/auth/presentation/login-screen.tsx`, `auth-method-tabs.tsx`, `auth-layout.tsx` and `password-transition.tsx` through the scoped translator and supply CodeField text props, reaching GREEN on T017/T019; keep BrandLogo's fixed Weave identity exempt and user email display separate. Leave dynamic retry formatting for US2.
- [x] T024 [US1] Migrate `apps/mobile/src/auth/presentation/home-screen.tsx`, `auth-context.tsx` and `src/navigation/root-navigator.tsx` copy through the translator to GREEN on T018; retain selector/runtime identities, protected routes and generic Button/FormField/Feedback string-prop contracts.
- [x] T025 [US1] Rerun Login/Home/navigation/CodeField/error-map/locale suites and all mobile regressions, refactor while green, and reconcile normal-journey inventory/accessibility coverage in `specs/005-mobile-i18n/contracts/scenario-tests.md`; record S01–S03 normal-journey results (recovery accessibility belongs to S06/US2) in `specs/005-mobile-i18n/evidence/us1-green.txt` and `evidence.md`, keeping native acceptance pending until performed.

**Checkpoint**: US1 is the normal-journey demo MVP. It does not satisfy the whole feature without dynamic feedback, independent recovery and lifecycle/layout acceptance.

## Phase 4: US2 — Show Correct Dynamic Feedback and Safe Fallback (P1)

**Goal**: Exact retry grammar, fault-safe text and provider-independent offline/recovery behavior. S04–S06; FR-003–FR-006, FR-010; SC-001–SC-004, SC-006.

**Independent test**: Real-engine and pure-fallback exact 0/1/2/60 outputs; injected missing/invalid resources and absent Intl; offline and failed-provider recovery with working Reload, no raw keys/data/markers or translation fetches.

### Tests before dependent implementation

- [x] T026 [P] [US2] Add retry formatter/rendered assertions in `apps/mobile/src/localization/retry-feedback.test.ts` and `src/auth/login.test.tsx` before T029/T032: quote/enforce “Retry display accepts only a finite safe integer count >=0; 1 chooses singular, all other valid counts choose plural”; check exact 0/1/2/60 strings/count once, and undefined/negative/fractional/NaN/infinity/unsafe/string input produces “Please wait before trying again.” without changed email/auth data. Save behavioral RED in `specs/005-mobile-i18n/evidence/us2-retry-red.txt`.
- [x] T027 [P] [US2] Extend `apps/mobile/src/localization/infrastructure/i18next-translator.test.ts` with missing plural resources, throwing formatter, absent Intl.PluralRules, duplicate/unresolved count output and empty/malformed engine responses; check exact-action safe English and zero backend/network requests before any T030 fix, saving new behavioral RED or already-green regressions in `specs/005-mobile-i18n/evidence/us2-faults.txt`.
- [x] T028 [P] [US2] Extend `apps/mobile/src/auth/app-recovery.test.tsx` and `src/recovery/app-error-boundary.test.tsx` for provider-free English, absent/throwing localization factory, corrupt canonical recovery entries, offline normal errors, recovery labels/hints/roles/announcements and explicit Reload; verify native auth revalidation and no looping/stale callbacks, execute before T031 and save RED in `specs/005-mobile-i18n/evidence/us2-recovery-red.txt`.

### Implementation and integration

- [x] T029 [US2] Implement validated count formatting in `apps/mobile/src/localization/safe-english.ts` and `infrastructure/i18next-translator.ts` to GREEN on T026's formatter assertions: engine one/other → pure English one/other → safe wait on invalid input; count appears once, one for 1/other otherwise, no Intl dependency in pure fallback and no arbitrary parameters.
- [x] T030 [US2] Complete output/exception guards in `apps/mobile/src/localization/infrastructure/i18next-translator.ts` and `safe-english.ts` only where T027 proves missing behavior; reject blank/object/raw-ID/unresolved/duplicate-marker output and preserve exact role/action wording without recursive engine calls, logging or downloads. Rerun already-green foundation tests as regressions.
- [x] T031 [US2] Add the pure recovery accessor in `apps/mobile/src/localization/safe-english.ts` and migrate `src/recovery/recovery-screen.tsx` to GREEN on T028: canonical title/description/Reload plus bounded literal emergency equivalents, with no React hooks/Context/engine/Intl/device/auth dependencies in text resolution. Preserve existing boundary/Reload ownership in `apps/mobile/App.tsx` and `src/recovery/app-error-boundary.tsx`.
- [x] T032 [US2] Replace inline retry construction in `apps/mobile/src/auth/presentation/login-screen.tsx` with the typed retry method and retain safe-error fallback plus Feedback announcement semantics, reaching GREEN on T026's rendered assertions without passing user/provider values as interpolation parameters.
- [x] T033 [US2] Rerun count/fault/completeness/offline/recovery and all auth/privacy regressions, refactor while green and record S04–S06 evidence in `specs/005-mobile-i18n/evidence/us2-green.txt` and `evidence.md`; distinguish deterministic tests from actual offline/device acceptance and record zero translation requests at the controlled network seam.

**Checkpoint**: Dynamic English and failure recovery work through controlled public seams; runtime safety does not waive delivery catalog completeness.

## Phase 5: US3 — Keep Language Concerns Separate from Session State (P2)

**Goal**: Protect real journey state across locale activation/Reload, prove root isolation and maintain complete readable copy. S07–S08; FR-002, FR-004, FR-007–FR-009; SC-001, SC-002, SC-005, SC-006.

**Independent test**: Two independent roots cannot mutate each other's catalog/context; matched unchanged/changed-locale foreground runs preserve auth runtime identity and parent refresh/revalidation/state/form/navigation behavior with zero additional localization-caused operations/resets. Expanded English and font/dimension fixtures cover the defined phone/tablet matrix, with actual clipping/focus verified separately on both platforms.

### Tests before dependent implementation

- [x] T034 [P] [US3] Add expanded-English journey tests in `apps/mobile/src/auth/localization-layout.test.tsx`, injecting approximately twice normal word count with valid placeholders and the exact size/font-scale matrix from `specs/005-mobile-i18n/contracts/scenario-tests.md`; assert primary-control reachability props, accessible meaning and retained keyboard/input semantics. Save real regressions before T039 fixes or already-green results in `specs/005-mobile-i18n/evidence/us3-layout.txt`; do not call RN layout props proof of physical clipping.
- [x] T035 [P] [US3] Write and execute fixture tests in `apps/mobile/src/localization/testing/native-fixture.test.tsx` before T036/T037: explicit config-only entry/resource routing, unknown scenario rejection, original baseline preservation, complete approximately doubled English with one count marker, real RecoveryScreen expanded copy, deterministic login/verification/home/retry/recovery states and no fixture imports in normal entry bundles. Provide behavior-free seams if necessary; save meaningful RED in `specs/005-mobile-i18n/evidence/us3-native-fixture-red.txt`.
- [x] T036 [US3] Implement `apps/mobile/metro.i18n-fixture.config.cjs` and `src/localization/testing/expanded-en.ts` per `specs/005-mobile-i18n/contracts/native-fixture.md` to GREEN on T035 routing/resource assertions: explicit scenario allowlist, server.rewriteRequestUrl mapping of index bundle requests, resolver delegation/alias with a baseline-import recursion guard, immutable expanded resources and no production config/entry modification. Retain native platform/query parameters and source-map routing.
- [x] T037 [US3] Implement `apps/mobile/src/localization/testing/native-entries/login.tsx`, `verification.tsx`, `home.tsx`, `retry.tsx` and `recovery.tsx` to GREEN on T035 scenario assertions; register the existing app name, use deterministic interface-compatible in-memory auth fixtures, actual App/recovery components and real scoped translators, with no credentials/provider/network work or production debug controls. Validate Android/iOS fixture bundles, record GREEN in `specs/005-mobile-i18n/evidence/us3-native-fixture-green.txt` and document the exact launch/return-to-normal procedure in `specs/005-mobile-i18n/quickstart.md`.
- [x] T038 [P] [US3] Add integrated lifecycle tests in `apps/mobile/src/localization/presentation/localization-journey.test.tsx` using real scoped engines and controlled gateways/locales: matched background/foreground sequences for pending and active journeys, once with unchanged locale and once with changed locale, preserve auth runtime identity and identical parent refresh/revalidation/state/form/navigation transitions; assert zero additional localization-caused auth operations/resets rather than zero total operations, mutate one root's resources without affecting baseline/another root, repeated Reload detaches listeners, and fresh native validation still gates Home. Execute before T040 fixes and save new RED or green regressions in `specs/005-mobile-i18n/evidence/us3-lifecycle.txt`.

### Implementation and integration

- [x] T039 [US3] Fix only newly demonstrated expanded-text/accessibility regressions (after the native fixture in T037 is ready) in `apps/mobile/src/auth/presentation/login-screen.tsx`, `auth-layout.tsx`, `home-screen.tsx` or `src/components/code-field.tsx` using existing primitives/semantic tokens; reach GREEN on T034, preserve parent gaps explicitly in `specs/005-mobile-i18n/evidence.md` and record a regression pass if no new behavior is missing.
- [x] T040 [US3] Complete any T038-proven missing integration in `apps/mobile/src/localization/localization-runtime.ts`, `presentation/localization-context.tsx` and `apps/mobile/App.tsx`; retain “No other production catalog, picker or persisted override”, stable translator/auth identity and listener-only cleanup/replay. Do not add language state to AuthViewState/Zustand or call auth commands for locale-only events; record green regressions if no fix is needed.
- [x] T041 [US3] Audit all app-owned visible/spoken literals against `specs/005-mobile-i18n/contracts/message-inventory.md`, reconcile all 51 entries and narrow brand/decorative/user-data/native-provider exclusions, and update task/test links in `contracts/scenario-tests.md`; exercise sentinel English for every owner and retain deletion tests so catalog omissions fail validation. Record findings in `specs/005-mobile-i18n/evidence/inventory.md` rather than using source-search equality as behavioral proof.
- [x] T042 [US3] Rerun ownership/resource-isolation/expanded-text/locale suites and auth/privacy regressions, refactor while green and record S07–S08 results in `specs/005-mobile-i18n/evidence/us3-green.txt` and `evidence.md`; retain real process restart/device layout/a11y as explicit acceptance checks rather than equating them with fake roots or native compilation.

**Checkpoint**: All stories have deterministic coverage; actual platform acceptance and delivery gates remain.

## Phase 6: Polish and Cross-Cutting Delivery

- [x] T043 Run full mobile tests/privacy probe/lint/typecheck and review authored imports/dependency injection against `docs/standards/architecture.md`, `typescript.md` and `react-native.md`; check no engine/React dependency enters auth inner layers, no mutable singleton/persistence/credential interpolation, and generic controls remain reusable. Record results in `specs/005-mobile-i18n/evidence/mobile-verification.txt`.
- [x] T044 Run `pnpm run verify`, migrate a disposable local PostgreSQL fixture with `pnpm run db:deploy` and execute `pnpm run test:integration` using its DATABASE_URL; record exact commands/environment/results in `specs/005-mobile-i18n/evidence/repository-verification.txt`, treating prerequisite failures as unverified rather than passes and using no external database.
- [x] T045 [P] Run Android Metro bundle, native contract tests and unsigned debug app compilation using `bundle:android`, `test:native:android` and `native:android` from `apps/mobile/package.json`; record actual output and missing prerequisites in `specs/005-mobile-i18n/evidence/android-verification.txt` without changing native configuration unless an evidenced requirement re-enters design.
- [x] T046 [P] Run iOS Metro bundle, native/host contracts and unsigned simulator compilation using `bundle:ios`, `test:native:ios`, `test:native:ios:host` and `native:ios` from `apps/mobile/package.json`; record actual output and missing prerequisites in `specs/005-mobile-i18n/evidence/ios-verification.txt`. Do not run a shared dist-clean command concurrently with T045.
- [ ] T047 Execute Android and iOS S01/S02/S03/S04/S06/S08 journeys plus startup/Reload/lifecycle checks exactly as mapped in `specs/005-mobile-i18n/contracts/scenario-tests.md`, including English/non-English OS preferences, VoiceOver/TalkBack, offline/retry/recovery and all expanded-wording size/font combinations using the T035–T037 fixture and `specs/005-mobile-i18n/contracts/native-fixture.md`; record device/toolchain/fixtures/results or missing prerequisites in `specs/005-mobile-i18n/evidence/device-acceptance.md`. Keep parent acceptance gaps and unrun checks open.
- [x] T048 Update `apps/mobile/README.md`, `specs/005-mobile-i18n/quickstart.md` and `research.md` to the actual resolved dependency, architecture, locale-source limits, inventory extension procedure and reproducible validation commands; reconcile scenario/task/test/evidence links in `contracts/scenario-tests.md` without claiming future-language or device support not verified.
- [x] T049 Review the final authored diff against `specs/005-mobile-i18n/spec.md`, `plan.md`, `tasks.md` and localization contracts; record findings/remediation in `specs/005-mobile-i18n/evidence/review.md`, reproduce any behavioral defect before fixing and rerun affected checks. This review supplements required code-owner/CI review.
- [x] T050 Run speckit-converge against actual source/tests and `specs/005-mobile-i18n/spec.md`, `plan.md`, `tasks.md`; write `specs/005-mobile-i18n/convergence.md`, append genuinely remaining work and reconcile `workflow.json`/evidence statuses without checking off unverified platform acceptance.
- [ ] T051 Verify repository-local personal author/committer and required local checks, create matching imperative Conventional Commits ending `[WEA-28]`, push `feat/WEA-28/mobile-i18n`, create/attach the requested stacked draft against PR #12's verified current branch and update Linear WEA-28 with ticket/spec/evidence/convergence/PR links; record URL and actual CI/review state in `specs/005-mobile-i18n/workflow.json`. Respect develop/main target policy, retarget after parent merge, disclose blocked checks, and use no force push/protection bypass/implicit merge/deployment.

## Dependencies and Execution Order

```text
T001 + T002 → T004                         source/dependency gate
T003 → T004 → T005
T005 → (T006 || T007) → T008 → T009
T008 + T009 → (T010 || T011) → T012 → T013
T012 + T013 → T014 → T015 → T016          foundation complete
T016 → (T017 || T018 || T019 || T020)
     → T021 → T022 → T023 → T024 → T025  US1 normal-journey MVP
T025 → (T026 || T027 || T028)
     → T029 → T030 → T031 → T032 → T033  US2 dynamic/failure integration
T025 → (T034 || T035 || T038)            US3 independent test batch
T035 → T036 → T037                       native fixture before acceptance
T033 + T034 + T037 + T038 → T039 → T040 → T041 → T042
T025 + T033 + T042 → T043 → T044 → (T045 || T046) → T047
     → T048 → T049 → T050 → T051
```

These are dependency batches, not permission to postpone RED until after implementation. Within a batch, tasks write separate test/evidence files; same-file changes in T029/T030/T031 and later consumer migrations are deliberately sequential. T002 may run before T001 because analysis is read-only, but dependent source work waits for both. T003's read-only baseline may also proceed independently. Stories share one integration boundary: US2 and US3 use US1's scoped UI; US3's final regression run also includes US2. Their public seams remain independently runnable after that integration, rather than claiming entirely dependency-free implementation.

## Parallel Execution Examples by Story

- **Foundation**: T006 catalog-validator tests and T007 static-fallback tests are independent after T005. T010 real-engine tests and T011 locale-source tests are independent after T008/T009.
- **US1**: After T016, run T017 Login tests, T018 Home/navigation/auth-context tests, T019 CodeField tests and T020 error-map tests together; they edit different files and save separate logs. Implement T021–T024 after their actual RED, sequentially for shared call sites.
- **US2**: After T025, run T026 retry/Login assertions, T027 engine-fault assertions and T028 recovery assertions together. Do not parallelize the later safe-english/adapter implementations that share files.
- **US3**: After T025, T034 expanded-layout tests, T035 native-fixture tests and T038 lifecycle-journey tests may proceed together, including concurrently with US2's test batch because their files/fixtures are local. Implement T036/T037 sequentially after T035 RED; await US2 and the fixture before final integrated fixes/regressions. Device acceptance is scheduled after native prerequisites, not as a substitute for automation.
- **Delivery**: T045 and T046 use separate platform outputs/evidence and may run together after T044; avoid shared clean/install/mutation commands during them.

## Scenario, Requirement and Success Traceability

| Scenario | Owning story | Main tasks                                 | Outcomes                       |
| -------- | ------------ | ------------------------------------------ | ------------------------------ |
| S01      | US1          | T017–T025, T043–T047                       | FR-001/002/010; SC-001/002/005 |
| S02      | US1          | T011–T016, T025, T047                      | FR-001; SC-002/004             |
| S03      | US1          | T017–T019, T022–T025, T034/T039, T047      | FR-003/009/010; SC-001/002/006 |
| S04      | US2          | T026/T029/T032/T033, T047                  | FR-004/010; SC-002/003/005     |
| S05      | US2          | T006–T010/T012, T027/T030/T033, T041       | FR-005; SC-001/002/004         |
| S06      | US2          | T014/T015, T028/T031/T033, T047            | FR-003/006/010; SC-002/004/006 |
| S07      | US3          | T010/T012, T014–T016, T038/T040/T042, T047 | FR-004/007/008; SC-002/005     |
| S08      | US3          | T034–T037/T039/T041/T042, T047             | FR-002/009; SC-001/002/006     |

Exact message and platform/layout oracles remain in the linked contracts; update those first if discovery changes agreed behavior. Every authored behavior must have scenario/task/test/evidence traceability, including foundational behavior owned by later journeys.

## Implementation Strategy

1. Complete agreement and analysis gates; adopt the dependency and prove the shared foundation through public seams.
2. Deliver US1 as a normal-English demo MVP and run its independent journey checks. Recovery/count/lifecycle requirements remain open; do not mark the ticket complete at MVP.
3. Add US2 dynamic grammar and independent fault recovery, then US3 integrated state isolation/expanded wording; retain all earlier checks as regressions.
4. Run required repository/database/native checks and actual device acceptance; record missing fixtures/devices as open work. Converge before stacked draft delivery, preserving parent limits and target-policy dependencies.
5. Only tick a task when its stated work is actually done. Evidence preparation, a draft PR, or a successful compile does not complete unperformed acceptance checks.

## Phase 7: Convergence

- [ ] T052 Complete the remaining both-platform live-provider, OS-language, screen-reader, offline/recovery/Reload/restart and nine-combination expanded-layout acceptance matrix; supply an Android device/emulator and controlled provider fixtures, execute T047, record actual outcomes in `specs/005-mobile-i18n/evidence/device-acceptance.md` and reproduce/fix any new regression before closing per FR-003/FR-009, SC-002/SC-006, S01–S08 and T047 (partial; HIGH).
- [ ] T053 Publish and attach the stacked draft with verified personal author/committer, local checks and spec/evidence/convergence links; synchronize existing Linear WEA-28, record actual publication/sync outcomes in `specs/005-mobile-i18n/workflow.json`, and disclose open acceptance/CI/review per plan: delivery sequence and T051 (partial; MEDIUM).
- [ ] T054 Obtain the required CI and code-owner review; after parent PR #12 merges, retarget this stack to develop and rerun required checks without a protection bypass, recording actual statuses in `specs/005-mobile-i18n/workflow.json` before treating it as merge-ready per Constitution 9, plan: PR-target policy and T051 (partial; MEDIUM).
