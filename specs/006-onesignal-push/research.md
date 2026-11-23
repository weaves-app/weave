# Research: WEA-29 OneSignal

Checked 2026-10-16. Official documentation, released SDK source and repository inspection inform this design. Research does not establish build/device success. SDK research was delegated read-only; the parent consolidated native, backend and architecture decisions.

## SDK adoption

**Decision**: Pin React Native OneSignal 5.5.15, the live npm `latest` at research time. Its released package uses Android 5.10.2 and iOS 5.8.0. Preserve RN 0.86.3 / New Architecture and existing higher platform minimums. Resolve native/package locks during implementation, not now.

**Rationale**: The declared RN peer range includes the existing app; cached documentation showed an older patch. Native compile and real delivery tests still determine compatibility.

**Alternatives**: Do not adopt a cached version, upgrade React Native incidentally, or replace the vanilla native app with Expo.

Sources: [npm metadata](https://registry.npmjs.org/react-native-onesignal/latest), [released package](https://github.com/OneSignal/react-native-onesignal/tree/5.5.15), [setup](https://documentation.onesignal.com/docs/en/react-native-sdk-setup).

## Server observation and capacity

**Decision**: Read the server-derived account with View User, match the exact subscription and return a small fresh status. Never infer remote acknowledgement from local observers or void SDK calls. Use a single shared PostgreSQL provider budget, no positive cache and no autonomous polling.

**Rationale**: Server confirmation was explicitly selected by the user. The provider permits only one View request per second per app; replicas must coordinate. An observation can become outdated after a later provider mutation, so the UI invalidates it on contextual changes and expires it within 60 seconds. This is not guaranteed delivery.

**Alternatives**: Local-only readiness conflicts with the user's choice. Per-device polling exceeds provider capacity. A new Redis service or durable worker queue adds unnecessary infrastructure for this bounded foundation.

Sources: [View User](https://documentation.onesignal.com/reference/view-user), [subscription schema](https://github.com/OneSignal/node-onesignal/blob/main/models/Subscription.ts), [rate limits](https://documentation.onesignal.com/reference/rate-limits), [RN public methods](https://github.com/OneSignal/react-native-onesignal/blob/5.5.15/src/NativeOneSignal.ts).

## Secure account binding

**Decision**: Require OneSignal Token Identity Verification. Use ES256 with `iss` = configured app ID, `exp` in seconds and `identity.external_id` = authenticated account. RN lacks the JWT overload; bridge the supported native overloads. User REST calls then use a matching Bearer identity JWT, not an App API key. Logout disables delivery while retaining the record; login restores subscription state. Refresh invalidated JWTs only for the current session.

**Rationale**: A server read alone cannot prevent a modified client claiming another external ID. Provider beta access and an app-wide compatible rollout are explicit external prerequisites; do not downgrade to unsigned binding if unavailable.

**Alternatives**: Unsigned external IDs do not meet the account-isolation design. App API keys and signing keys must never ship to clients. Existing web/unsigned clients require a separate compatible OneSignal app or migration before enabling the toggle.

Source: [Identity Verification](https://documentation.onesignal.com/docs/en/identity-verification). No dashboard change is made during planning.

## Authentication and credentials

**Decision**: Reuse the prerequisite's native Clerk session authority through a published native authorized-request interface. The notifications coordinator supplies only an allowlisted operation and captured session context; the auth adapter obtains a session token and sends it directly over HTTPS. Native code consumes the binding response, and JavaScript receives sanitized status only. Backend authentication validates a Clerk session token and current session ownership before deriving the external ID. Reuse the locked Clerk backend library; adopt a maintained JWT signing library explicitly in the API manifest.

**Rationale**: Existing mobile auth deliberately keeps credentials native. Neither a client account ID nor a trusted-looking notification payload is server authentication. Signature validation alone is not a live revocation check; the server adapter also checks the session's active status and ownership.

**Alternatives**: Do not export bearer tokens to a React hook/store, create a parallel login flow, trust arbitrary issuer URLs, or authorize using an unsigned account parameter.

Sources: repository `apps/mobile` auth at prerequisite head `75814ad85894460ddeae46c9aa337f0d09463f5c`; [Clerk token verification](https://clerk.com/docs/reference/backend/verify-token). Pinned source and dependency details follow below.

## Permission, lifetime and tap handling

**Decision**: One native process coordinator owns initialization, SDK observers and account commands; each JS root obtains a lease and receives generation-tagged snapshots. Permission prompting only follows the Home Enable action. Avoid automatic `optIn`, which can prompt; signed login restores eligibility, and any extra opt-in is tied to explicit user intent. Unsupported taps cause no app-owned navigation: the normal root navigator decides Login/Home.

**Rationale**: Account/root epochs reject stale UI results, but cannot cancel persisted SDK operations. Reconciliation always follows the latest validated identity, including signed-out suspension. Removing listeners on root disposal does not reset native registration.

**Alternatives**: Separate per-component SDK owners race over one installation. Imperative deep-link navigation adds no value while Home is the only allowed destination. JS URL filtering alone happens too late for native launch behavior.

Sources: [mobile SDK reference](https://documentation.onesignal.com/docs/en/mobile-sdk-reference), [iOS URL suppression](https://documentation.onesignal.com/docs/en/deep-linking), [Android settings source](https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.10.2/OneSignalSDK/onesignal/notifications/src/main/java/com/onesignal/notifications/internal/common/OSNotificationOpenAppSettings.kt).

## Native configuration and plain delivery

**Decision**: Enable push capabilities and required APNs/FCM configuration; disable location at native build integration. Suppress native Launch URLs on both platforms. Keep plain notification presentation under the SDK/OS, with no extra JS banner. Do not add an iOS Notification Service Extension or App Group in this foundation: rich media, badges and provider confirmed-receipt analytics are excluded; record actual device presentation instead.

**Rationale**: This is the smallest configuration for the agreed plain-push scope. Android must retain ordinary activity launch behavior. Build-time integration settings and public app ID may be distributed; provider signing/platform private credentials may not.

**Alternatives**: An NSE would be appropriate for a later rich-notification or confirmed-receipt requirement. Silently adding location, campaign analytics or business senders expands the scope.

Source: [React Native setup](https://documentation.onesignal.com/docs/en/react-native-sdk-setup). The no-NSE choice is a scoped design decision, not a claim that every optional setup feature is implemented.

## Baseline and remaining prerequisites

The branch starts at develop `810974c36deafd8bddb23828d1adedfc14b3999e`; auth/store/i18n are available only on PR #13 at inspected head `75814ad85894460ddeae46c9aa337f0d09463f5c`. Wait for merge or explicit stack approval before source work. This is a known implementation gate, not an unresolved design choice. Full scenario confirmation, provider beta enablement, keys, platform provisioning and suitable controlled devices remain required. No technical design question is being silently treated as a confirmed deployment capability.

## Pinned authentication and signing APIs

**Decision**: Reuse vendored Clerk Android 1.1.11 and iOS 1.6.0 from the prerequisite. Kotlin uses captured `Session.fetchToken(GetTokenOptions())` and `TokenResource.jwt`; Swift uses captured `Session.getToken(.init())`. Add exact `@clerk/backend@3.23.0` to the API (already locked transitively), plus new exact `jose@6.2.12` for `importPKCS8`/`SignJWT`.

**Rationale**: These native APIs were verified in the parent Git tree, not inferred from newer online Clerk examples. Backend session authentication uses `authenticateRequest` with explicit session-token acceptance plus a current active-session check behind the public port. jose's ESM runtime works with supported Node require(esm), but the compiled Nest entrypoint needs an integration test.

**Alternatives**: Do not upgrade vendored auth just to obtain tokens, assume jose is already installed, or implement JWT signing by hand.

Sources: parent `apps/mobile/vendor/clerk-android/PROVENANCE.md`, `apps/mobile/vendor/clerk-ios/PROVENANCE.md`, vendored Session implementations and `pnpm-lock.yaml`; [jose maintained releases](https://github.com/panva/jose/releases), [jose module support](https://github.com/panva/jose).

## Accepted contract refinements — 2026-10-17

The user authorized the recommended analysis remediation. These are Weave design decisions, not additional claims about provider capabilities. Readiness now uses correlated attempts and relative validity across native/JS clock boundaries, capped by each side's own request start. Signing requires 15 whole seconds remaining; low-validity responses do not cause an automatic refresh loop. Native responses are capped at 16 KiB. Account-budget retention is nextAllowedAt + 24 hours; cleanup is at most 100 rows per sweep and once per minute per app, with a one-shot maintenance command and no automatic scheduler. Plan paths now match the existing auth/localization directories. The public user scenarios and provider prerequisites are unchanged.
