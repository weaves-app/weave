# Native Integration and UI Contract

## Configuration

Pin RN OneSignal 5.5.15 and commit resolved package/native locks during implementation. Preserve the existing New Architecture and deployment minimums. Extend current TurboModule codegen configuration to register WeaveNotifications alongside WeaveAuth; retain existing generated auth names/package mappings unless an intentional migration has contract tests. Do not edit generated code by hand.

Android: public app ID and HTTPS backend origin come from the existing app configuration boundary. Enable `com.onesignal.suppressLaunchURLs=true` in application metadata. Leave `com.onesignal.NotificationOpened.DEFAULT` at its default so taps launch the normal activity. Wire the supported native SDK from the RN package rather than a conflicting second SDK version. Configure the default notification channel/icon needed for plain presentation. No silent permission request or location permission is added.

iOS: set `OneSignal_suppress_launch_urls` to Boolean true in the target Info.plist; add Push Notifications entitlement/capability and Remote notifications background mode using the existing project/signing conventions. Resolve the modular `OneSignalXCFramework/OneSignal` dependency through RN integration and lock it; no duplicate aggregate framework. No NSE, App Group, rich-media support or delivery-receipt analytics in this scope. Use `ONESIGNAL_DISABLE_LOCATION=true` for Pod and Gradle integration, verifying the resolved artifacts and permissions rather than assuming the setting removed location.

Use a dedicated compatible OneSignal app per intended environment, public app ID matched on API/native targets, configured APNs/FCM and Identity Verification. Backend signing key remains server-side. Provider dashboard enablement is an acceptance/deployment operation, not an implementation default that may break other clients. No production provider action is authorized by this plan.

Missing public config must disable notification setup safely without crashing normal app startup. Missing server credentials disable the notification endpoints only; health and unrelated app operations remain available. Enforce redaction for both SDK debug logs and authored HTTP/bridge diagnostics; production SDK verbose logging stays off.

## Permission and presentation

Home exposes an explained notification control only after existing session validation. Enabling is an explicit action; startup/login/foreground/Retry have no permission-prompt side effect. Permission denial leaves the user on Home. Open settings is explicit and limited to the system app notification settings; never use a payload URL. SDK default foreground presentation must occur once, without a second app banner. Background/terminated presentation remains OS-controlled.

Signed-out/unknown-account foreground notifications may be suppressed by the native lifecycle handler; do not promise suppression of OS-queued background notifications. Payloads remain generic. A notification tap never forces refresh/login on its own; existing normal activation validation decides the screen.

## English message inventory

Add these keys to the prerequisite English catalog and typed inventory; reuse existing shared labels where equivalent. Do not embed display copy in domain state.

| Key suffix under notifications | English copy / purpose                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| title                          | Notifications                                                                                  |
| explanation                    | Enable notifications to receive updates on this device. You can keep using Weave without them. |
| enable                         | Enable notifications                                                                           |
| settings                       | Open notification settings                                                                     |
| retry                          | Retry notification setup                                                                       |
| checking                       | Checking notification setup…                                                                   |
| pending                        | Notification setup is pending.                                                                 |
| ready                          | Notifications are ready on this device.                                                        |
| disabled                       | Notifications are turned off on this device.                                                   |
| restricted                     | Notifications are restricted on this device.                                                   |
| unavailable                    | Notifications are unavailable right now.                                                       |
| configurationUnavailable       | Notifications are not configured for this app.                                                 |
| retryLater                     | Please try again shortly.                                                                      |

Ready copy is permitted only while the current server confirmation is valid. Do not announce each duplicate observer event or countdown second; announce meaningful status changes politely. Buttons expose roles/labels, disabled/busy states and adequate touch targets. Layout wraps with enlarged text and stays reachable in the existing Home scroll/safe-area structure. Test VoiceOver and TalkBack, contrast and focus order using existing semantic tokens.

## Native auth source baseline

The prerequisite vendors Clerk Android 1.1.11 and iOS 1.6.0. Native credential access is session-bound: Kotlin `Session.fetchToken(GetTokenOptions())` yields a ClerkResult containing `TokenResource.jwt`; Swift captured `Session.getToken(.init())` returns an optional token. Keep this inside the auth transport adapter. Pause token/network completion in tests, switch accounts, and verify no stale binding command or credential reaches JS. Missing token is an unavailable/authentication-required notification result, not a new authentication flow.
