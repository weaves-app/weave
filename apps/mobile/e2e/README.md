# Native authentication acceptance

Use the real development Clerk configuration and a running Metro server. Build/install
`si.tryweave` with the configured native SDKs on an Android emulator or an iOS simulator.
The iOS build needs Xcode-generated simulator entitlements for the Keychain health check.
These flows require a signed-out app; they do not clear an owner's saved session.

Acceptance currently uses Maestro 2.11.0 from the official
[mobile-dev-inc release](https://github.com/mobile-dev-inc/maestro/releases/tag/cli-2.11.0).
It is an external test tool, not an application dependency. Select a device explicitly:

```sh
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  maestro --device <device-id> test apps/mobile/e2e/flows/signed-out.yaml \
  --format junit --output <temporary-report.xml> \
  --test-output-dir <temporary-artifacts>
```

Use JDK 17 for the CLI. Run from the workspace root. Run only the matching platform
variant for cancellation and unregistered-account tests:

| Flow                         | Scenario coverage                                                    |
| ---------------------------- | -------------------------------------------------------------------- |
| `signed-out.yaml`            | S01 signed-out launch; S03 empty-input feedback and method switching |
| `google-cancel-android.yaml` | S17 Chrome browser dismissal returns usable Login                    |
| `google-cancel-ios.yaml`     | S17 Safari browser dismissal returns usable Login                    |
| `unregistered-android.yaml`  | S18 password/email-code rejection of an unregistered identifier      |
| `unregistered-ios.yaml`      | S18 password/email-code rejection of an unregistered identifier      |

The unregistered fixture uses Clerk's non-delivering `+clerk_test` email convention.
It must not exist in the development instance. Check the provider user count before
and after running it; UI rejection alone does not prove zero account creation.
The password in these flows is a public invalid test value, not a credential.

For owner authentication, enter passwords, delivered codes and Google credentials
directly on the device. Never put them into flow files, arguments, reports, screenshots
or committed logs. Retain only sanitized acceptance results. These flows establish
partial live acceptance; successful login, session restoration/revocation, recovery,
accessibility and remaining callback cases require separate evidence.

Stable public input selectors are `field-email`, `field-password`, and
`field-verification-code`. iOS flows dismiss the keyboard using Return; Maestro's
`hideKeyboard` gesture can hit the login method controls on this layout.

The T049 login/OTP presentation check additionally renders the production app through its public `App.createController` seam with a temporary deterministic provider. That provider returns only a code challenge or a safe invalid-code error; it never authenticates. The runner restores `index.ts` in `finally` and relaunches the real Clerk-backed app. Fictional `preview@example.com` and public `123456` inputs cover formatted entry, keyboard reachability, pending feedback, correction/resend and method return. This proves native presentation and interaction only, not successful provider login, delivery or OS autofill. The harness, flow and sanitized screenshots are retained in the feature evidence directory.

T050/T051 follow-up evidence in `specs/003-mobile-auth-recovery/evidence/login-interactions` supersedes T049's explicit OTP-submit behavior: normalized complete insertion verifies automatically. Native flows type five digits, then the sixth, and observe pending/error without tapping Verify. Measured method-switch bounds and a native recording validate stable shared controls, while local field/action motion respects Reduce Motion. The enlarged iOS follow-up checks the resulting invalid-code feedback without a Verify tap; normal-size flows independently establish transient pending feedback. Production entry and device settings are restored by the retained runner; these checks retain the same presentation-only scope.
