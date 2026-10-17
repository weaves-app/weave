# Convergence: WEA-29 OneSignal notifications

Date: 2026-10-17. Outcome: **tasks_appended**. Code implementation and automated verification are complete; full feature acceptance is not complete.

The assessment used the current spec, plan, all61 original tasks regardless of checkbox state, current code/tests, platform reports and independent review. It checked13 functional requirements,8 success criteria,11 scenario acceptance cases,10 plan decision groups and all10 constitution principles. The groups were mobile state/ownership, native auth transport, signed account binding, permission/presentation, safe opens, server authentication/signing, exact readiness, distributed budget/maintenance, privacy/UI, and verification/configuration.

| Finding | Gap     | Severity | Source                                                               | Evidence                                                                                                                                                                                                                                     | Remaining work                                                                          |
| ------- | ------- | -------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| F1      | partial | HIGH     | FR-012; FR-001–FR-011/FR-013; SC-001–SC-008; S01–S11; T043/T048/T056 | Provider credentials/signing/controlled devices unavailable; [acceptance matrix](evidence.md#requirement-and-acceptance-traceability) and [setup guide](quickstart.md#remaining-controlled-environment-setup) explicitly leave journeys open | T062: provision the controlled environment and record actual device/provider acceptance |

Findings: missing0, partial1, contradicts0, unrequested0; HIGH1, other severities0. No remaining confirmed code defect after independent JavaScript/Android/iOS review and recorded RED/GREEN fixes. The original tasks were preserved by the convergence pass; only Phase9/T062 was appended. This report and T060 bookkeeping were then recorded as implementation handoff work.

## Evidence and boundaries

- Full repository verify passes:311 mobile tests in40 suites,90 API,58 web,279 policy; types, scoped lint, format, architecture and API/web/mobile bundle builds.
- Isolated PostgreSQL integration:13/13. No external database migration was applied.
- Android:75 native tests, debug APK for4 default ABIs, resolved dependency/manifest location audit.
- iOS:71 host and71 simulator tests; actual app/codegen/OneSignal5.8.0 simulator compile/link, modular framework/privacy/autolink audit.
- Exact command transcripts, behavioral REDs, infrastructure failures and already-passing baseline cases are distinguished in [evidence.md](evidence.md), [Android report](evidence/android-implementation.md), [iOS report](evidence/ios-implementation.md), and [backend report](evidence/backend.md).

No actual permission/delivery/tap/physical accessibility or provider diagnostic result is inferred from tests/builds. No production provisioning, send, deployment or merge occurred. The user explicitly requested code completion and remaining-setup documentation; T043/T048/T056/T062 remain open. Run speckit-implement for those acceptance tasks when the controlled environment exists, then converge again.

## Review handoff

Ticket: [WEA-29](https://linear.app/weaveapp/issue/WEA-29/integrate-onesignal-push-notifications-in-the-react-native-app). Branch: `feat/WEA-29/onesignal-push`; approved parent: `feat/WEA-28/mobile-i18n`, PR #13 at `75814ad85894460ddeae46c9aa337f0d09463f5c`. Personal author/committer verified as Pravin Raj <pravinrajmb@gmail.com>. Draft stacked PR requested.

Current CI/PR base policy targets develop/main, so required CI is not available on this feature-branch stack. Retarget to develop after ancestors merge, then obtain required checks and code-owner review. No protection/policy bypass. No extensions.yml exists; before/after convergence and final after-implement hooks have no registered work.
