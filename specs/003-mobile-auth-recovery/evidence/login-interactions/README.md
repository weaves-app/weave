# T050/T051 login interaction evidence

Owner explicitly requested stable method switching with local animation and automatic verification on the last OTP digit. S03/S08/S15/S16/S19 remain the confirmed public seams.

## Behavioral evidence

- `native-layout-red.txt`: before the fix, Android shared logo/heading/Google/tabs/email bounds all moved132px when switching methods.
- `auto-code-red.txt`: both sign-in and device-trust tests observed zero verification requests after complete code insertion.
- `scroll-extent-red.txt`: clearing feedback and reducing content size discarded the previous1800px scroll extent. The native ScrollView boundary now preserves it within the current Login viewport.
- `repository-verify.txt`: final production source passes full repository verification, including89 mobile tests in13 suites, lint/architecture/format/types, policy/application tests, web production build and both Metro bundles. This was run with the original production entry, before temporary native fixtures.
- `review.txt`: both scroll extent findings were corrected; scoped follow-up review found no remaining actionable issue.

## Native presentation checks

Android Pixel7 API35 and iPhone17Pro iOS26.2 use the real App/Login/CodeField with an injected deterministic public controller seam. The fixture returns only challenge or invalid-code outcomes; it never authenticates. Fictional email and public code values are not owner credentials. `android-ui.xml` and `ios-ui.xml` have zero failures: five digits remain editable, the sixth digit initiates verification without a Verify tap, the keyboard dismisses, pending actions disable, invalid feedback appears, Resend works and returning to password Login works.

`native-layout-green.txt` retains identical shared control bounds in both directions. `native-edge-green.txt` checks Android enlarged text (fontScale1.6), platform Reduce Motion and rapid toggling. `android-method-animation.mp4` records the normal220ms local password fade/collapse and submit action movement while shared controls stay fixed.

`native-fixture.ts.txt` uses a12-second simulated verification request for the normal-size flows. The enlarged iOS follow-up observes the automatic invalid-code outcome without a Verify tap; transient pending feedback is independently established by both normal-size flows. Attempts to reach the transient message at enlarged text sizes are not retained as passing flows. The native runner restores the production entry and original simulator preferences in `finally`, propagates the test exit code and relaunches the real Clerk-backed app. Use these only on disposable local test devices; they do not clear an owner session.

These are presentation/interaction checks. Successful real authentication, delivered-code OS autofill, full accessibility/lifecycle/minimum-iOS17 acceptance and custom Google credential branding remain separate open tasks. Startup/selector/scroll-tool and transient-fixture timing failures are not product behavioral RED evidence. No new database integration, GitHub CI, commit or publication is claimed.

Final iOS accessibility-large flow passed in1minute (`ios-enlarged.xml`), observing invalid-code feedback after the sixth digit without a Verify tap, Resend and method return. The two retained stationary method screenshots have identical shared-control positions. Scroll gestures had already dismissed the keyboard in those images; they are not claimed as open-keyboard offset proof. The actual partial-entry screenshot separately shows the native keyboard. Production `index.ts` and original iOS text size `large` were restored on every run.
