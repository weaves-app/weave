# T049 Login/OTP evidence

These screenshots exercise real native Login/CodeField rendering through the public controller factory. The temporary gateway uses fictional `preview@example.com`, returns only a challenge or invalid-code error, and never creates an account or active session. `native-runner.py.txt` restores the original Clerk entrypoint before relaunching the app. JUnit reports must show zero failures; a test tool setup failure is not behavioral RED.

- `component-red.txt`: three initial missing presentation behaviors.
- `selection-red.txt`: two meaningful cursor/range focus failures.
- `component-green.txt`: 86 mobile tests in 13 suites pass after the correction.
- `review.txt`: scoped review finding and resolved follow-up.
- `repository-verify.txt`: complete root verification with production entrypoint.
- `android-overlay-red.png`: actual overlapping native text before the transparent-white fix.
- `android-ui.xml` and `android-otp-*.png`: final reviewed normal-text Android run, including native numeric keyboard.
- `ios-ui.xml` and `ios-otp-*.png`: final reviewed normal-text iOS run, including native numeric keyboard.
- `android-enlarged.xml` and `android-otp-large-*.png`: Android fontScale1.6 fallback/scrolling verification.
- `ios-enlarged.xml` and `ios-otp-large-*.png`: enlarged text scrolling/fallback verification.
- `ios-signed-out.xml`: actual Clerk-backed signed-out validation.
- `native-flow.yaml`, `enlarged-flow.yaml`, `android-enlarged-flow.yaml`: presentation test steps.

The agent-owned Android emulator temporarily disables stylus handwriting and enables the software keyboard during presentation checks, then restores both preferences. Metro's Watchman service failed during verification; the final run uses a temporary filesystem-watcher configuration outside the repository. No production Metro configuration is changed.

Actual delivered-code autofill, OS clipboard menu paste, successful credentials/provider sessions, VoiceOver/TalkBack, minimum iOS17 and full S01–S20 acceptance are not inferred from this presentation fixture. They remain under T043/T044. No account credentials are retained here.
