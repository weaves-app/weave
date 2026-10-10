# WEA-10 mobile convergence

2026-10-08. Outcome: implementation present, acceptance partially verified. No full-ticket closure or converged claim.

Assessed40 requirement/scenario items (15 FR,5 SC,20 scenarios),10 plan decisions and10 constitution principles against current source and actual evidence. Four partial findings:3 high,1 medium;0 missing/contradicting/unrequested findings. Scope remains the mobile portion of WEA-10.

T040 requires this saved convergence artifact; the installed converge skill's only permitted write is append-only tasks.md. This report is implementation evidence for T040; the converge operation appends the findings below without rewriting existing tasks or spec/plan/code.

| Finding | Gap / severity   | Source                                                              | Evidence / remaining work                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | partial / HIGH   | FR-012; plan secure-storage failure mapping; T035                   | Native secure storage and observable-failure tests pass, but both pinned SDKs silently absorb some per-key cached-client persistence errors. Implement/test a maintained observable failure seam or update the agreed plan through clarification; do not equate synthetic health access with every SDK write.                                                                                                                                        |
| F2      | partial / HIGH   | FR-002/003/004/006/013/014/015; SC-001/004/005; T025/T030/T034/T037 | All method/session/logout/recovery contract tests pass; development public key/methods, Android registration and all three callbacks configured; live fixture/provider acceptance still unrun and iOS application registration deferred pending App ID Prefix. Verify real password/OTP/Google, device trust/unsupported verification, zero new accounts, saved/revoked sessions, logout/restart and recovery against actual native singleton state. |
| F3      | partial / HIGH   | FR-011; SC-002/005; S15; T036                                       | Accessible labels/states/safe-area/keyboard structure is automated; screen-reader/enlarged text/focus, healthy-service timing, process/activity/callback lifecycle and iOS17 runtime checks remain unrun.                                                                                                                                                                                                                                            |
| F4      | partial / MEDIUM | Constitution9; plan native CI/toolchain; T008/T038/T041             | Full local verify, both native builds/tests, Metro and isolated DB integration pass. CI commands/results retention are wired; actual GitHub required checks/code-owner review and Postgres17 CI have not run.                                                                                                                                                                                                                                        |

## Scenario reconciliation

| Scenarios | Current implementation / automated proof                                                                | Acceptance gap                                       |
| --------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| S01       | Only Login registered when signed out                                                                   | Live cold launch                                     |
| S02       | Three methods/native no-transfer; conditional Home/history                                              | All methods live on both platforms                   |
| S03       | Local validation, safe native rejection, accessible feedback                                            | Real invalid credentials                             |
| S04       | Fail-closed resolution,30s deadline and retry                                                           | Network/device failures                              |
| S05       | Fresh reopen/foreground resolution; idle OTP preserved                                                  | Secure persistence/restart/device proof              |
| S06       | Direct Home action denied; auth URLs not mapped to routes                                               | Device unknown/stale-link checks                     |
| S07       | Revision/epoch ordering, malformed event fail-closed, native invalidation/compensation                  | Provider revocation/lifecycle                        |
| S08       | Controller/native duplicate guards, method abandonment, SDK pending-Google cancellation                 | Rapid taps/provider callbacks on device              |
| S09       | Current-session Logout, removed history, fresh reopen fixture                                           | Live logout/restart                                  |
| S10       | Accurate active/cleared/unavailable partial failure; no foreground race                                 | Physical storage/provider fault checks               |
| S11       | One pending logout; Home has only one action                                                            | Device repeated taps                                 |
| S12       | Boundary catches root/provider/render/lifecycle faults; static fallback; all diagnostic sinks sanitized | Captured device logs/fault fixtures                  |
| S13       | Guarded full remount, disposal/abandon, fresh greater-generation resolution                             | Actual SDK-session Reload on devices                 |
| S14       | Repeated failure returns fallback; stale Reload rejected; no automatic loop                             | Device repeated fault validation                     |
| S15       | Primitive/screen accessibility, scrolling, safe-area and keyboard wiring                                | VoiceOver/TalkBack, enlarged text/focus/contrast     |
| S16       | Opaque OTP request/verify/resend + invalid/expired/rate-limit mapping                                   | Delivered live email code and limits                 |
| S17       | Sign-in-only Google, safe cancellation/timeout, foreground clock, usable password return                | Real browser cancellation/retry and callback handoff |
| S18       | No signup transfer; safe existing-account feedback                                                      | Read-only zero-account-creation proof                |
| S19       | Password email-device-trust challenge/resend/verify and foreground preservation                         | Owner existing device-trust account                  |
| S20       | Unsupported challenges/session tasks blocked; method selection remains usable                           | Owner unsupported-verification account               |

## Requirement reconciliation

| Requirements                | Result                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-001                      | Implemented; actual navigator registers exactly one of Login/Home                                                                                |
| FR-002,FR-013,FR-014,FR-015 | Implemented/contract-tested; F2 live acceptance                                                                                                  |
| FR-003,FR-004               | Implemented/fresh validation and route-order tests; F2/F3 lifecycle acceptance                                                                   |
| FR-005                      | Implemented; one interactive Logout action                                                                                                       |
| FR-006,FR-007,FR-008        | Implemented/native+controller safe outcome/deadline/duplicate tests; F1/F2/F3 acceptance                                                         |
| FR-009,FR-010               | Implemented/isolated+App recovery tests; F2/F3 actual SDK/device acceptance                                                                      |
| FR-011                      | Partial acceptance; F3                                                                                                                           |
| FR-012                      | SDK/native storage, runtime error projection and renderer privacy probes pass; F1 storage observability and F2/F3 device captured-log acceptance |
| SC-001                      | Controlled actual-navigation tests pass; live/device proof F2/F3                                                                                 |
| SC-002                      | Device timing unmeasured; F3                                                                                                                     |
| SC-003                      | All injected automated catchable-failure cases pass; device proof F3                                                                             |
| SC-004                      | Automated error/retry/partial-failure cases pass; live fault acceptance F2                                                                       |
| SC-005                      | Both platform native suites pass; complete S01–S20 live/accessibility acceptance pending F2/F3                                                   |

Plan decisions: vanilla RN preserved; pinned official native core SDKs and source patches; existing-account-only entrypoints; framework-free model/controller and typed gateway/factory composition; conditional navigation without parameters/persistence; SDK-owned callbacks; secure native persistence with explicit F1 limits; bounded operations/epochs; context-independent root recovery; semantic UI and frozen native/package/required CI wiring. No architecture/design exception was introduced. React Navigation closed route map uses a documented narrow type-alias constraint.

Constitution: scenarios were agreed before source; actual RED/GREEN preserved; strict types/lint/inward imports pass; shared primitives used; ticket branch/personal identity preserved; no publication/deployment/remote policy or account action. Review and required CI remain prerequisites to publishing. Remaining work is appended as T042–T045 and original incomplete tasks remain unchecked.

## Native identity follow-up — 2026-10-08

T046 completed at owner request: `si.tryweave` on Android/iOS with matching codegen/packages/callback defaults. Both native builds and suites, 81 JS tests and root verification passed; built identities/callbacks were inspected. See [native identity evidence](evidence/native-identity.txt). Four prior partial findings remain; local identity selection is resolved, remote Clerk registration and other live/device/storage/CI acceptance are still pending. Task accounting is now 36/46 complete with the same 10 tasks unchecked.

## Clerk configuration follow-up — 2026-10-08

Owner authorized and confirmed development registrations. Android `si.tryweave` / local debug certificate and all three native callback URLs are saved and verified in Clerk. Native API and all three methods were already enabled; the public development key is in ignored local configuration and both rebuilt native apps. F2 now concerns live provider/session/recovery acceptance, suitable fixtures and deferred iOS native application registration, rather than missing Android setup. Other device/storage/CI findings and task accounting remain unchanged.

### Owner branding follow-up

T047 is complete: supplied masters/license retained; shared colour/font tokens, logo placements, native/browser icons and iOS launch branding built and verified. Existing 81 mobile tests and root verification passed. Web preview passed. Native unsigned simulator rendering reaches the existing secure-storage error before Login; missing Keychain entitlements are observed, and a temporary signing experiment was rejected by SpringBoard. The native Login visual/provider/device acceptance remains within open F2/F3 (T043/T044); no authentication completion claim or scope waiver is made.

### Xcode-managed simulator signing follow-up

Owner signed into Xcode and selected team 44E9RE43KD. Xcode-managed ad-hoc simulator build/launch succeeds and the branded Login screen is visually verified; startup Keychain storage check passes. The previous unsigned-preview blocker is superseded. F2/F3 remain partial for live/provider/device acceptance and Clerk iOS registration; no full feature-completion claim is made.

### Owner-saved Clerk iOS registration

Read-only dashboard verification confirms prefix 44E9RE43KD / bundle si.tryweave in the development instance after owner submission. The registration prerequisite under F2 is resolved for both platforms. F2 remains partial for live account/provider acceptance; F1, F3 and F4 are unchanged.

## Approved Login/OTP refinement reconciliation — 2026-10-08

T049 is complete within the owner-approved presentation scope. Meaningful selected-method/formatted-code/native-hint and cursor/range RED→GREEN evidence is retained. The reviewed implementation passes86 mobile tests, full root verification and actual Android API35 / iOS26.2 presentation checks at normal and enlarged text sizes, including native numeric keyboards, pending/error and scrolling. The review finding is resolved; production Clerk source and temporary simulator preferences are restored. See `evidence/login-ux/README.md` and the T049 section in evidence.md.

Task accounting is38/49 complete with11 unchecked. F1–F4 and original full-provider/lifecycle/accessibility/minimum-iOS/CI gates remain partial under T042–T045. T048 custom Google credential linking and branded handoff verification also remain open. This bounded reconciliation adds no duplicate tasks and does not declare full WEA-10 convergence. No commit, publication or remote CI action was performed.

## Login interaction correction reconciliation — 2026-10-08

T050/T051 are complete for the explicitly requested S15 stable method transition and S16/S19 automatic complete-code verification. Both code-purpose/duplicate/retry and scroll extent regressions pass; native method bounds and normal Android/iOS automatic-verification flows pass. Android enlarged-text/Reduce Motion/rapid switching passed. Final scoped review has no remaining issues, and full root verification passes89 mobile tests plus web/both Metro builds. Evidence is retained in `evidence/login-interactions`.

Task accounting is40/51 complete with the same11 original acceptance/follow-up tasks unchecked. F1–F4 and T048 remain open; fixture presentation results do not complete real-account, secure-storage observability, full accessibility/lifecycle/minimum-iOS17 or CI acceptance. No duplicate convergence tasks or publication were introduced.

Final iOS accessibility-large interaction flow also passed in1minute: the sixth digit reaches invalid-code feedback automatically without a Verify tap; Resend and password return pass. Retained `ios-enlarged.xml` has zero failures, with screenshots. Shared method-control positions are visually identical; scrolling had dismissed the keyboard before those stationary screenshots. The production entry and original text size were restored.

## Custom Google credential linking follow-up — 2026-10-08

Owner saved the Weave Google client credentials in Clerk; read-only verification confirms enabled custom credentials, populated fields, matching public Client ID and no unsaved changes. The configuration prerequisite for T048 is resolved. T048 stays unchecked for native consent branding and both-platform successful Google authentication; F1–F4 and40/51 task accounting are unchanged. See the latest evidence section and credential-free screenshot.

## Google brand display reconciliation — 2026-10-08

The supplied symbol is saved correctly and owner custom credentials are linked, but the actual Google screen shows accounts.dev. Google rejected both owner-authorized exact names Weave and Weave App; accepted saved name Weave (tryweave.si) was retained. Clerk development-domain behavior and Google unverified branding explain the current display. Google Testing exposes no brand-verification action, branding public-page fields are empty and tryweave.si currently serves a parked-domain page. T048 remains partial for public-site/domain/production-brand prerequisites and both-platform acceptance. No new source behavior/task, publication or security-sensitive access change was introduced;40/51 tasks remain complete.

## Shared authentication header reconciliation — 2026-10-09

T052 is complete for the directly requested S15/S16/S19 centered shared logo and top safe-area Back. Both code-purpose LoginScreen regressions demonstrated RED before implementation and GREEN afterward; pending guards/return and existing automatic-code behavior pass. Both normal and enlarged native flows pass on Android API35/iOS26.2; fully rendered captures show stationary centered logo bounds while the form scrolls and errors change. Root verification passes91 mobile tests/13 suites and web/both Metro builds. Evidence: `evidence/auth-header`.

Task accounting is41/52 complete with11 original acceptance/follow-up tasks unchecked. F1–F4 and T048 remain open, with no duplicate convergence tasks. Owner clarified that Weave is B2B/invitation-only; potential Apple Guideline4.8 enterprise-account exemption is recorded conditionally, without changing authentication scope or claiming App Review approval.

## Tablet alignment correction reconciliation — 2026-10-09

T053 completes the owner's reported iPad Login/OTP mismatch under S15/S16/S19. Shared centered tablet frame and common form heading origin replace challenge-dependent centering. Both code-purpose regressions demonstrate expected RED then GREEN;93 mobile tests/13 suites pass. iPad portrait, landscape and enlarged-text flows plus iPhone/Android phone regressions pass; normal iPad pixel comparisons show identical logo/heading origins across five states. Root verification and production web/both Metro builds pass. Production entry, iPad portrait/text preference and real app restored. Evidence: `evidence/tablet-alignment`.

Task accounting:42/53 complete,11 original acceptance/follow-up tasks open. Existing F1–F4 and T048 remain partial. Native presentation fixtures do not establish full provider/storage/lifecycle/screen-reader/minimum-iOS/CI acceptance; no duplicate tasks or publication added.

## Responsive phone/tablet follow-up — 2026-10-09

T054 source is implemented with meaningful rotation and safe-area RED→GREEN evidence.94 mobile tests and full repository verification pass. Phone top alignment, portrait tablet centering and landscape artwork/form composition are visually checked; normal iPad/iPhone presentation flows pass. The owner-reported bottom gap is corrected by keeping artwork outside the form safe area. Production source and normal iPad text size are restored, and both real apps relaunched.

T054 remains unchecked while enlarged-text landscape interaction verification is incomplete: the automation gestures interfered with the iPad window controls, and owner assistance was requested to maximize the window after programmatic attempts had no effect. This is not a passing accessibility result or a new provider failure. Accounting is42/54 complete with12 open, including T054. Original F1–F4/T048 remain partial; no duplicate acceptance tasks or publication introduced.

## Publication validation — 2026-10-09

Owner requested commit and PR. Integrated develop `810974c`, retaining web authentication and the approved pnpm 11.1.1 migration. Frozen install, full repository verification, 3 database integration checks, Android native contracts/build and iOS simulator build/31 host contracts passed. Local database is PostgreSQL18; PostgreSQL17 CI and code-owner review remain pending. Results: [publication evidence](evidence/publication/summary.txt). Existing F1–F4, T048 and T054 acceptance gaps remain open; draft publication does not imply full-ticket completion.

## Exported comparison constants — 2026-10-09

T055 satisfies approved S21–S23: exported constants replace inline string/numeric comparison values across authored mobile/web/scripts; SessionStatus is derived from SESSION_STATUS. The shared rule runs in app/root lint and preserves language/runtime/test-assertion exceptions. Its132 cases have meaningful RED→GREEN evidence, including export ownership and runtime-object false positives. Final full verification,3 database integration checks and iPhone/iPad Login rendering pass. Evidence: `evidence/comparison-constants`. No new runtime behavior or acceptance gap was identified for this follow-up.

Task accounting is43/55 complete with the same12 earlier tasks open. F1–F4, T048 and T054 acceptance limits remain unchanged; this bounded refactor does not close WEA-10 or establish full provider/native acceptance.

### T055 fallback correction

The owner identified the inline `unexpected` nullish fallback. The approved constants policy now covers string/numeric right-hand fallback values for `??` and `||` as well as comparisons. AUTH_ERROR_CODE owns mobile runtime error values; its type and native validation list are derived from the same object.20 new expected RED failures preceded the correction;172 rule cases now pass. Workspace type checks and all tests pass (205 policy,94 mobile,58 web,2 API); mobile/web/shared/scripts lint passes. See `evidence/comparison-constants/fallback-*.txt`. Existing native/provider acceptance gaps remain unchanged. The earlier full production/database checks predate this final behavior-preserving fallback correction; no new build or live-provider claim is made.

### T055 navigation and alignment corrections

S21–S23 now cover exported ROUTE_NAME/NAVIGATION_KEY and navigation identifier JSX props.14 expected RED failures preceded enforcement;198 rule cases and231 policy tests pass. Mobile typecheck and94 mobile tests pass; mobile/web/shared/root lint passes. The initial mobile test command encountered sandbox-blocked Watchman; rerunning with `--watchman=false` passes. This environment failure is not behavioral RED. BrandLogo now groups START/CENTER in exported ALIGNMENT, derives the prop union and defaults to ALIGNMENT.CENTER; behavior is unchanged. Evidence: `evidence/comparison-constants/routes-*.txt`. Production/native builds and database integration were not repeated for this correction; existing acceptance gaps remain open. Changes remain local and uncommitted.

T055/S21 button variant follow-up: owner requested the same grouped vocabulary for PRIMARY_BUTTON_VARIANT. BUTTON_VARIANT now owns PRIMARY/OUTLINE/TEXT; prop type, default, comparisons and Login caller props reuse it. No behavior change. Targeted lint, mobile typecheck and94 mobile tests pass (`evidence/comparison-constants/button-variant-tests.txt`). Existing acceptance gaps remain unchanged.

T055/S21 typography variant follow-up: owner requested VARIANT.TITLE in place of standalone TITLE_VARIANT/HEADING_VARIANT. Exported VARIANT now owns all six typography variants; derived prop type, default, comparisons and caller props reuse it. Rendering and accessibility behavior preserved. Mobile lint, typecheck and94 tests pass (`evidence/comparison-constants/typography-variant-tests.txt`). Existing acceptance gaps remain unchanged.

T055/S21 keyboard type follow-up: shared KEYBOARD_TYPE owns EMAIL_ADDRESS/NUMBER_PAD/DEFAULT. FormField derives its prop type and default from these constants; Login and CodeField reuse them. Existing literal assertion independently verifies the number-pad behavior. Mobile lint, typecheck and94 tests pass (`evidence/comparison-constants/keyboard-type-tests.txt`). Existing acceptance gaps remain unchanged.

### T055 complete mobile constants audit

Owner requested a complete mobile check after identifying the `verifying` submit argument. Audited authored mobile TS/TSX source, including App.tsx and index.ts; runtime options now use grouped domain/native/component constants in calls, assignments, returns, defaults and JSX. LOGIN_STAGE and AUTH_RESULT_KIND also own their types. Native commands have a dedicated typed vocabulary; timeout values are named. Rendering options, event names, accessibility/keyboard settings and colors use shared platform constants.

S21–S23 now include type-aware `weave-values/no-inline-option-values` in mobile and root staged-file lint. It rejects finite-string options using contextual TypeScript types, including local static aliases and mixed boolean/string options.18 meaningful RED failures preceded implementation;6 edge failures preceded alias/mixed-union handling;48 typed-rule cases pass. All279 policy,94 mobile,58 web and2 API tests pass; mobile/root lint, mobile typecheck and both production Metro bundles pass. See [audit evidence](evidence/comparison-constants/mobile-audit.md). No native/provider/database acceptance was repeated or claimed; prior open tasks remain open.

T055 publication verification (2026-10-10): full `pnpm run verify` passes with279 policy,94 mobile,58 web and2 API tests, all lint/format/type checks and API/web/both Metro production builds.3/3 integration tests pass on isolated PostgreSQL18. See `evidence/comparison-constants/publish-verify.txt` and `publish-integration.txt`. No native/provider acceptance gaps are closed by this refactor; CI and code-owner review remain required.
