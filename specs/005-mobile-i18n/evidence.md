# WEA-28 implementation evidence

User explicitly confirmed S01–S08 on 2026-10-15 with “confirm”. Source/test/dependency work is now authorized.

## Baseline / T003

- Branch feat/WEA-28/mobile-i18n; HEAD and parent base 04aeaf5ed3946547d55e8e5d32990d8453d95c17.
- Personal repository identity verified: Pravin Raj, pravinrajmb@gmail.com.
- Requirements checklist: 16 checked, 0 unchecked; unchanged by implementation.
- Jest baseline: 17 suites / 108 tests passed; [actual output](evidence/baseline.txt).
- Ignore files already cover Node/native/cache/credential outputs. All packages are private; no npmignore/publishing change required. Fixture CJS lint scope will be checked when authored.
- Preserve the untracked user image and ignored pnpm cache.

## Rulings

- Keep the prepared ticket checkout; no unrelated tracked changes or active worktrees.
- Existing tablet-only brand.story copy was absent from the original inventory. Add it before dependent source changes; 51 required entries (49 static + two plural forms), no new product copy.
- Spec Kit checklist task IDs differ from the inline helper's Task N headings. Extract briefs by Tnnn and keep the same ledger semantics; do not rewrite task format to satisfy a tool.

## Scenario traceability

S01–S08 map to task IDs in tasks.md and contracts/scenario-tests.md. Executed RED/GREEN/refactor records follow below. Exact scenario/test/log mapping is in [scenario tests](contracts/scenario-tests.md#executed-automated-evidence).

| Scenario | Executed automated evidence                                                                                                             | Native UI acceptance                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| S01      | US1 injected English and approved-copy journey checks; us1-green.txt, review-green.txt                                                  | Open                                           |
| S02      | Locale/adapter/runtime invalid and throwing inputs; adapter-locale-green.txt                                                            | Open                                           |
| S03      | Accessible text, roles and hidden code slots; us1-green.txt                                                                             | Open                                           |
| S04      | Exact retry table, rendered challenge and corrupt-template regressions; us2-green.txt, review-green.txt                                 | Open                                           |
| S05      | Every required deletion, corrupt resources/Intl/engine and safe fallback; catalog-safe-green.txt, us2-green.txt, review-green.txt       | Shared faults pass; supplementary startup open |
| S06      | Provider-free recovery, offline/factory fault and Reload; foundation-green.txt, us2-green.txt                                           | Open                                           |
| S07      | Root/resources/lifecycle ownership and matched foreground regressions; adapter-locale-green.txt, us3-lifecycle.txt                      | Startup/Reload/restart open                    |
| S08      | Expanded layout matrix, fixture routing/scenarios and both normal graph exclusions; us3-fixture-lifecycle-green.txt, bundle-graphs.json | Physical layout/focus open                     |

## Acceptance still unverified

Android/iOS live auth, accessibility, expanded-layout and process-restart checks are unrun. Parent WEA-27/WEA-10 gaps remain open and attributed to their tickets. Repository/database/bundle/native checks subsequently passed as recorded below; these checks do not complete device acceptance.

## T004, T005, T006, T007, T008, T009, T010, T011, T012, T013

Dependency 26.4.5/frozen offline import checks passed (evidence/install.txt). Catalog/static fallback: 20 tests GREEN after observed missing-entry/blank-label RED (catalog-red.txt, safe-english-red.txt, catalog-safe-green.txt). Engine/locale: 17 tests GREEN after 14 behavioral assertion failures (adapter-locale-red.txt → adapter-locale-green.txt); includes real-engine resource isolation and opaque/throwing/absent-Intl locale input. An object-valued engine resource initially exposed an i18next diagnostic; per-call returnObjects lets the app reject the actual object and keep exact canonical labels. Initial missing App test import was corrected before saving provider RED and is not counted as behavioral evidence.

## T014, T015, T016

Provider/runtime ownership observed 11 behavioral failures before wiring (provider-red.txt), then full 23-suite/158-test GREEN (foundation-green.txt), typecheck and scoped lint passed. Missing AppState subscription.remove in the default Jest mock was diagnosed and corrected in the test fixture to match the real framework contract; no production cleanup guards weakened. Root-localization failure/Reload, synchronous text, opaque locale reads and listener replay covered.

## T017, T018, T019, T020, T021, T022, T023, T024, T025

US1 observed missing injected Login/Home/session/CodeField/error-map text before migration (us1-*-red.txt); all 24 suites / 167 tests now GREEN (us1-green.txt), lint/typecheck passed. Catalog-driven normal journeys, password/code semantics and thirteen safe error-code mappings verified. Tablet artwork includes the discovered brand.story entry; full layout/inventory checks remain US3. Existing English expectations preserved.

## Retry fixture ruling

The parent controller stores AuthFailure.retryAfterSeconds on error, while the existing retry display reads attempt.retryAfterSeconds from CodeChallenge. The initial rendered test incorrectly used AuthFailure; that failure is not counted as valid rendered retry RED. Reverted the UI migration, corrected the fixture to the existing challenge path, observed four scoped-text failures in evidence/us2-rendered-retry-red.txt, then reapplied the typed retry call. Native fixture uses that same existing challenge path. Authentication behavior remains unchanged.

## T026, T027, T028, T029, T030, T031, T032, T033

US2 formatter/fault/pure-recovery assertions failed before implementation (us2-retry-red.txt, us2-faults-red.txt, us2-recovery-red.txt). Corrected challenge-path rendered RED captured separately (us2-rendered-retry-red.txt). Full 26 suites / 191 tests GREEN (us2-green.txt), lint/typecheck passed. Real i18next + pure English exact 0/1/2/60, invalid boundaries, corrupt templates, missing Intl, formatter failures, no translation fetch, actual provider-free recovery and Reload verified.

## T034, T035, T036, T038, T039, T040, T041

Expanded-copy and native fixture routing/scenario tests observed 19 expected failures before fixture implementation (us3-layout-red.txt, us3-native-fixture-red.txt); 23 focused checks GREEN (us3-fixture-lifecycle-green.txt), then full 29 suites / 214 tests + privacy probe GREEN (us3-green.txt). Lifecycle fixtures corrected to the parent awaiting-code screen and password request vocabulary; all four matched foreground cases are green regressions, not fabricated RED. No new layout/lifecycle production fixes were required. Copy audit recorded in evidence/inventory.md; native fixture bundles remain T037 work.

## T037, T042, T043

Ten Android/iOS fixture bundles completed and include their selected entry/expanded catalog; both normal bundle source maps exclude all localization/testing and auth/testing/fakes modules (fixture-bundles.txt, bundle-graphs.json). Full mobile 29-suite/214-test privacy run, lint, typecheck and architecture/copy boundary audit passed (us3-green.txt, mobile-lint.txt, mobile-typecheck.txt, inventory.md). No normal entry/native configuration changes or auth domain/application imports introduced. Actual device acceptance remains T047.

## T048, T049

Documentation updated for adopted 26.4.5, 51-entry inventory, locale limits, constrained formatting, native fixture protocol and actual verification evidence. Fresh whole-feature reviewer identified two important and one minor findings; both reproduced before fixes, direct production oracle added, all 227 mobile tests + privacy/lint/typecheck GREEN. See evidence/review.md and review-red.txt → review-green.txt.

## T044

Final post-review pnpm run verify passed: policy 279, web 58, API 2, mobile 227 tests; lint/format/typecheck/all workspace builds and both normal Metro bundles passed (repository-verification.txt). Disposable PostgreSQL 18.1 loopback fixture migrations/integration 3/3 passed (database-integration.txt). No external database used.

## T045, T046

Android native contracts and debug APK passed; iOS 31 native and 31 host contracts plus simulator build passed. Final ten fixture bundles and both normal bundle graphs passed; see platform logs and bundle-graphs.json.

## T050

Convergence assessed source against all original intent; appended T052 device acceptance, T053 publication and T054 external CI/review/retarget. No new source gap found. T047/T052/T054 remain open; see convergence.md.

## T051, T053

Published and attached draft PR #13 above #12 with verified personal identity and passing pre-push hooks. Linear WEA-28 updated In Progress with PR/spec/evidence/convergence links on the one permitted retry. No CI checks/review decision reported; T047/T052/T054 remain open.
