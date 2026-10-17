# Feature Specification: Mobile Push Notifications

**Feature Branch**: `feat/WEA-29/onesignal-push`

**Created**: 2026-10-16

**Status**: Implemented and automated checks passed; controlled provider/device acceptance remains open

**Input**: User description: "Integrate One Signal for push notification".

**Scope clarification (2026-10-16)**: The user selected server-confirmed status, expanding scope with a backend verification component before showing ready. Local permission or SDK state alone is insufficient.

**Ticket**: [WEA-29](https://linear.app/weaveapp/issue/WEA-29/integrate-onesignal-push-notifications-in-the-react-native-app)

**Baseline and prerequisites**: Ticket branch starts from `develop` at `810974c36deafd8bddb23828d1adedfc14b3999e`, following repository policy. The validated mobile authentication, local-store and English-message work through [PR #13](https://github.com/weaves-app/weave/pull/13) is required before implementation. Wait for that work to reach develop or use an explicitly confirmed stacked base; this spec does not duplicate it. The user explicitly confirmed S01–S11 and stacking on PR #13 on 2026-10-17; the branch contains parent head `75814ad85894460ddeae46c9aa337f0d09463f5c`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Choose whether to receive notifications (Priority: P1)

As a signed-in Weave mobile user, I can understand and control notification permission, and continue using the app if I decline.

**Why this priority**: Notifications are optional. Users need a clear choice without losing access to their normal work.

**Independent Test**: On each supported mobile platform, start with no permission decision, use the notification control on Home, allow or deny permission, and verify the displayed state and uninterrupted app access.

**Acceptance Scenarios**:

1. **S01 — Happy / explicit choice**: **Given** a signed-in user on Home who has not decided about notifications, **When** they select the English, accessibly labelled Enable notifications control after reading its explanation, **Then** the app requests the platform permission where required. It distinguishes permission allowed but setup pending from ready to receive. Opening the app, signing in, returning to the foreground or dismissing the explanation alone does not open a permission prompt.
2. **S02 — Sad / denial and settings**: **Given** permission is denied, dismissed, restricted or later disabled in device settings, **When** the user continues using Weave or returns from settings, **Then** the app displays the corresponding safe notification state, does not repeatedly prompt automatically, and leaves authentication and ordinary app actions usable. A user-initiated action opens the app's notification settings when another permission request is unavailable. On platforms without a runtime prompt, the app reflects the actual notification setting rather than inventing a prompt.

---

### User Story 2 - Receive notifications for the correct account (Priority: P1)

As a signed-in user, I can receive a notification on an enabled device, and my device stops being selected for the previous account after I sign out or change accounts.

**Why this priority**: Reliable account association and shared-device safety are essential before notifications can support real business events.

**Independent Test**: Use two controlled accounts and two test devices. Target one account with a non-sensitive test notification, verify only its eligible devices receive it, then sign out or switch accounts and repeat after the delivery service confirms the new association.

**Acceptance Scenarios**:

1. **S03 — Happy / account association**: **Given** permission is allowed and the existing authentication process has validated account A, **When** notification registration and account association succeed and the backend freshly confirms this installation for the validated account, **Then** this installation is eligible for account A's notifications. An anonymous, checking, pending-verification, failed or expired session does not establish a new eligible account association. A returning validated account with permission already allowed can reconnect without another permission prompt.
2. **S04 — Edge / logout and account switching**: **Given** the installation belongs to account A, **When** the user signs out or changes to account B, **Then** the app requests suspension and removal of A's delivery eligibility, discards pending A-specific notification actions, and does not mark B ready until the backend confirms the new association. A late completion for A cannot restore A's eligibility in the app. Once the delivery service acknowledges the change, a newly sent A-targeted test notification excludes this installation, while B-targeted notifications can reach it. Signing out one installation does not disable the same account's other eligible installations.
3. **S05 — Happy / receiving**: **Given** a correctly associated, permission-enabled test installation and a non-sensitive plain notification, **When** the notification arrives while the app is foregrounded, backgrounded or normally terminated, **Then** it is presented through the platform's normal notification UI when the controlled test settings permit presentation. The app does not add a duplicate banner, interrupt an in-progress form or reset authentication. Force-stop, device power restrictions, notification summaries and focus modes are recorded separately from normal delivery acceptance.

---

### User Story 3 - Open notifications safely (Priority: P1)

As a notification recipient, I can tap a notification to open Weave through its normal authentication checks, without reaching another account's information or an unexpected destination.

**Why this priority**: A notification is an entry point to the app and must preserve the existing access rules.

**Independent Test**: Tap controlled notifications with the app already open, backgrounded and normally terminated; vary session validity and destination data. Verify the app's normal Login/Home outcome without protected-screen flashes or duplicate navigation.

**Acceptance Scenarios**:

1. **S06 — Happy / cold and warm opens**: **Given** a notification is tapped, **When** Weave opens or resumes, **Then** it first follows the existing session-validation gate and shows Home only for a validated session; otherwise it shows the existing sign-in or recovery flow. Home is the only supported notification destination in this ticket. A tap neither signs in a user nor changes the active account.
2. **S07 — Sad / malformed and repeated input**: **Given** notification data is missing, malformed, repeated, for an old account, or requests an unsupported destination or external address, **When** the app handles the tap or receives the callback more than once, **Then** it ignores unsupported instructions, retains the normal authenticated landing behavior and performs no external navigation or business mutation. The same tap produces at most one app-owned navigation effect during an app lifetime. Old-account actions are not replayed after a new login.

---

### User Story 4 - Keep the app usable when notifications are unavailable (Priority: P2)

As a user, I can sign in, work, sign out and recover the app even if notification setup or delivery is unavailable, with readable feedback when I use notification controls.

**Why this priority**: Push delivery is an optional external capability and must not become a prerequisite for the existing app.

**Independent Test**: Simulate missing configuration, no connectivity, delayed or failing registration, permission changes and repeated root/foreground cycles. Verify safe states, normal app journeys and no duplicate app-owned effects.

**Acceptance Scenarios**:

1. **S08 — Sad / offline and unavailable setup**: **Given** the app is offline, notification configuration is absent or invalid, or the delivery service fails or delays setup, **When** the user starts the app or uses a notification control, **Then** the app remains usable, does not falsely report ready, and shows a concise English pending/unavailable state where relevant. Retry or a later activation can recover without an automatic permission prompt. Each user retry or activation starts at most one app-owned setup attempt, and simultaneous requests are coalesced. Signing out is never blocked waiting for the notification service; remote cleanup pending offline is reconciled when connectivity permits.
2. **S09 — Edge / lifetime and concurrency**: **Given** repeated foreground events, a root Reload, a permission change during setup or rapid account changes, **When** delayed results and notification callbacks arrive, **Then** only the current app/account state can update the visible notification state or act on a tap. Setup/listener duplication does not multiply prompts, banners or navigation. Notification changes do not independently reset authentication, navigation history or component-local inputs.
3. **S10 — Accessibility / privacy**: **Given** enlarged text or a screen reader is enabled, **When** the user reads notification status and uses Enable notifications, Retry or notification-settings actions, **Then** all app-owned copy is English, controls remain reachable, and labels, roles and status announcements convey the action and result. Notification content and normal diagnostic output contain no passwords, verification codes, access/session tokens, private order data or raw provider errors. Controlled test messages use only generic non-sensitive content.

### User Story 5 - Trust notification readiness (Priority: P1)

As a signed-in user, I see ready only after the server confirms that this installation is currently enabled for my account.

**Why this priority**: A local permission grant or cached account identifier cannot establish remote delivery readiness.

**Independent Test**: Exercise authenticated confirmation with correct, missing, disabled and other-account installations; repeat with unavailable verification and after a concurrent account switch.

**Acceptance Scenarios**:

1. **S11 — Happy / sad / edge, server confirmation**: **Given** a validated account and locally eligible installation, **When** readiness is checked, **Then** ready appears only after a fresh authenticated server check confirms that exact installation is enabled for that account. Anonymous, expired or forged credentials cannot obtain confirmation; caller-supplied account identities cannot select another account. Unknown, disabled, malformed, stale or mismatching provider records and unavailable or rate-limited verification remain pending/unavailable. Account, installation, permission or app-lifetime changes invalidate an earlier confirmation. Server credentials never enter the distributed app, and account-binding credentials do not enter app-owned UI state or logs.

### Edge Cases

- Permission allowed does not necessarily mean registration succeeded; no token/registration, disabled device settings or an unconfirmed account association remains pending/unavailable rather than ready.
- Permission requests overlap with sign-out, a root Reload, a settings change or another request. A stale result cannot restore an earlier account or trigger another prompt.
- Reinstall, device registration changes and multiple devices for one account must converge on the current installation and validated account without disabling unrelated devices.
- A notification can already be queued or displayed by the operating system when a user signs out. The app cannot guarantee recall of an already submitted notification while offline. This foundation therefore uses generic non-sensitive payloads, refuses old-account actions and verifies future targeting after remote cleanup acknowledgement; it does not claim immediate remote revocation.
- Notification data is an untrusted hint, never proof of identity, membership or permission. Unsupported links and instructions cannot bypass the normal landing and session checks.
- A delivery-service outage, missing platform credentials, missing test device or user-disabled notifications is an explicit acceptance prerequisite/failure state, not a passing delivery test.
- Notification delivery has no unconditional timing or exactly-once guarantee. Controlled acceptance records connectivity, device settings, app state, send time and observed receipt; duplicates must not multiply app-owned actions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Weave MUST integrate OneSignal push notifications for its existing Android and iOS mobile app. This ticket covers the mobile foundation, authenticated server verification and controlled plain test notifications, with English as the sole app-owned display language (S01–S11).
- **FR-002**: Permission requests MUST follow an explicit user action from an explained, accessible control on signed-in Home. App launch, sign-in, foreground and recovery MUST NOT automatically show a permission prompt. Existing granted permission can be reused without prompting (S01, S02, S03, S08).
- **FR-003**: Notification controls MUST distinguish permission undecided, denied/disabled, setup pending, ready and unavailable. Ready MUST require fresh server confirmation of the exact installation for the current validated account; allowed permission or local registration alone MUST NOT count. Confirmation MUST expire and be invalidated on account, installation, permission or app-lifetime changes (S11). Device-setting changes MUST be reflected on the next activation; repeated taps MUST NOT create simultaneous permission requests (S01, S02, S08, S09).
- **FR-004**: Notification eligibility MUST use the stable identity of the currently validated Weave account and respect the existing authentication authority. Anonymous, checking, expired, failed and incomplete sign-in states MUST NOT establish a new eligible association (S03, S04, S06).
- **FR-005**: Sign-out and account changes MUST request suspension and removal of the previous account’s delivery eligibility, clear its pending actions, reject stale completions and reconcile failed/offline cleanup. Sign-out MUST remain usable during a notification-service outage. Future delivery tests MUST verify exclusion after remote acknowledgement without claiming recall of notifications already queued or displayed (S04, S07, S08, S09).
- **FR-006**: Correctly associated, enabled installations MUST support plain notifications while foregrounded, backgrounded and normally terminated, subject to platform delivery rules and user settings. The app MUST avoid duplicate app-owned banners and preserve current app/form state on receipt (S05, S09).
- **FR-007**: Notification taps MUST pass through normal authentication checks and resolve only to the existing authenticated Home or normal signed-out/recovery flow. Unsupported destinations, external addresses, malformed data and old-account actions MUST NOT navigate to protected content, change accounts or execute business operations (S06, S07).
- **FR-008**: Repeated notification callbacks and app-lifetime events MUST NOT multiply app-owned prompts, banners or navigation, nor create additional authentication operations solely because a notification was received or permission changed. Normal existing foreground/restart session validation remains required (S05–S09).
- **FR-009**: Missing configuration, denied permission, offline operation and notification-service failures MUST leave existing authentication, Home, sign-out and app recovery usable. The app MUST use safe English status/error feedback and permit recovery through at most one app-owned setup attempt per user Retry or activation, coalescing overlapping requests (S02, S08, S09).
- **FR-010**: Notification registration and diagnostics MUST expose only the minimum installation/account information needed for delivery. Credentials, verification codes, private business data and notification-sending secrets MUST NOT be included in notifications, normal logs or distributed application credentials. Location collection, contact import and unrelated profile enrichment are outside this feature (S03, S10).
- **FR-011**: All new app-owned notification copy MUST belong to the existing English message inventory and use accessible controls with supported enlarged-text layouts and meaningful announcements (S01, S02, S08, S10).
- **FR-012**: Implementation acceptance MUST include controlled Android and iOS permission, receipt, tap, logout/account-switch, offline/recovery and accessibility journeys. Automated state/fault tests and compilation MUST supplement, rather than replace, actual delivery evidence. Missing external prerequisites MUST remain recorded as open work (S01–S11).

- **FR-013**: An authenticated backend component MUST derive account identity from validated credentials, confirm only the requesting account’s installation readiness, prevent arbitrary account binding, protect server credentials, and return minimal bounded status. Verification faults and capacity limits MUST fail safely without blocking ordinary app use. Confirmation is a recent observation, not a guarantee of future delivery or instantaneous remote cleanup (S03, S04, S08, S11).

### Key Entities

- **Notification permission**: The current platform decision about presenting notifications; it is distinct from successful delivery registration.
- **Installation subscription**: Delivery eligibility for one installed copy of the app, including registration readiness and the currently associated account.
- **Account association**: The relationship between a validated Weave account and its eligible installations; it grants no authentication authority.
- **Notification**: A plain non-sensitive title/body and optional destination hints from the delivery service; Home is the only supported destination for this foundation.
- **Notification interaction**: A receipt or tap tied to an app/account lifetime, with enough identity to avoid repeating the same app-owned effect.
- **Readiness confirmation**: A time-limited server observation for one current account and installation, invalidated when its context changes.
- **Notification status**: A user-facing English summary of permission and readiness, including pending/unavailable states and available user actions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In the Android and iOS permission matrix, 100% of launch/sign-in/foreground/Reload cases show zero unsolicited permission prompts; user-initiated requests follow the current platform allowance, and denial never removes normal app access.
- **SC-002**: On each platform, an enabled controlled test installation receives a generic test notification in all three normal app states: foreground, background and terminated. Receipt and settings are recorded; an unreceived message remains a failed/unverified acceptance case, not an inferred pass.
- **SC-003**: Across two controlled accounts and two installations, all newly sent targeted test messages select only the eligible intended installations after association/cleanup acknowledgement. Switching or signing out one installation leaves the other installation's eligibility unchanged.
- **SC-004**: Across valid, invalid, duplicate, stale-account and cold/warm tap cases, zero protected-screen bypasses, external opens, account changes or business mutations occur, and each repeated tap causes at most one app-owned navigation effect per app lifetime.
- **SC-005**: All agreed offline, configuration-failure, delayed-result and lifetime scenarios preserve existing sign-in, Home, sign-out and recovery behavior, with zero notification-caused session/form resets or false ready states.
- **SC-006**: 100% of new app-owned visible and spoken messages are inventoried in English. Notification controls remain operable with supported enlarged text and VoiceOver/TalkBack in the agreed Android/iOS acceptance matrix.
- **SC-007**: All eleven scenarios have traceable automated or actual device evidence appropriate to their claims. Private credentials/business data appear in zero approved test payloads or reviewed normal diagnostic samples; unperformed platform checks remain explicitly open.

- **SC-008**: In the server-verification matrix, zero anonymous, forged, other-account, expired, stale or malformed results produce ready. No private server credential or provider profile appears in mobile responses, state or reviewed logs. Verification outages preserve normal app access.

## Assumptions

- Mobile scope follows the current RN conversation. Both existing Android and iOS targets are included; web push is excluded. OneSignal is the requested delivery provider, while package versions and platform setup are planning decisions.
- This is a mobile integration foundation with authenticated backend readiness verification and secure account binding, as selected by the user. Business-triggered notifications, reminder schedules, recipient-role rules and business-specific destinations remain with their own tickets, including WEA-13 delivery reminders. No backend sending endpoint, scheduler, notification inbox, campaign automation, analytics project, rich media, action buttons, badges, silent/background work, email/SMS or additional production language is included.
- The smallest user-facing addition is a notification status/control area on existing Home, with contextual Enable notifications, Retry and device-settings actions as applicable. A new general Settings screen or preference centre is not required.
- Existing validated account identity, session authority and the English message inventory are prerequisites. Notification eligibility is installation-scoped and does not redefine authentication or device-wide permission. A grant on the device can be reused after successful reauthentication without another prompt.
- App-level configuration and provider-side platform credentials must be available in the intended environment before real delivery can be accepted. Provider administration, credentials, platform capabilities and suitable test devices are planning prerequisites; absence of any is documented rather than masked by test doubles. No production notification or credential provisioning occurs during specification or planning.
- Test payloads are generic and non-sensitive. Business notifications carrying account-specific details require a separate approved privacy/authorization design. Already queued operating-system messages cannot be reliably recalled while offline.
- This specification defines behavior, not a consent/legal compliance conclusion. It requires an explicit notification choice and minimum delivery data; any additional organizational data-consent requirement must be identified during planning before registration is enabled.
- The user's feature request authorizes specification. S01–S11 agreement remains pending in workflow.json before source/dependency changes; scope selection alone is not scenario agreement.

## Clarifications

- 2026-10-16 — Notification readiness: user chose “Server-confirmed status: expand scope with a backend verification component before showing ready.” This approves the scope decision; it does not confirm the full S01–S11 scenario set.
- Removal of delivery eligibility means disabling or moving this installation so future account-targeted delivery excludes it after provider acknowledgement; retaining a disabled provider record is acceptable.
