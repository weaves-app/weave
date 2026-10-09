# Feature Specification: Mobile Login and Error Recovery

**Feature Branch**: `feat/WEA-10/mobile-auth-recovery`, created from verified remote develop at `27698fb1a257259e12946e1526e57b1c6fc58836` on 2026-10-07. Unmerged WEA-8 work was excluded.

**Ticket**: [WEA-10 — Implement Clerk authentication in Next.js and React Native](https://linear.app/weaveapp/issue/WEA-10/implement-clerk-authentication-in-nextjs-and-react-native). This specification covers the requested React Native slice; Next.js behavior is not specified here. The issue also describes mobile public/invitation signup, which conflicts with this session’s explicit existing-account-only clarification. This slice follows the direct user scope and does not fulfill those broader ticket criteria.

**Created**: 2026-10-07

**Status**: S01–S20 confirmed; implementation setup started; SDK compatibility/adoption decision pending

**Input**: Integrate Clerk login into the React Native app, use React Navigation, provide only public Login and protected Home, put only a logout button on Home, and add a top-level error boundary with a reload screen.

## Clarifications

### Session 2026-10-07

- Q: Which login method should the mobile app support? → A: All three: email/password, email with a one-time verification code, and Google sign-in.
- Q: Should users without an existing account be allowed to create one through email-code or Google sign-in? → A: Existing accounts only; show a clear message for unregistered users and do not create accounts automatically.

- Analysis remediation approved on 2026-10-07: add explicit email device-verification and unsupported verification scenarios; full scenario agreement remains pending.

### Session 2026-10-08

- Owner supplied `tryweave.si` and requested Android/iOS package-name changes. Use reverse-domain `si.tryweave` for both native app identities, keeping the confirmed S01–S20 behavior. Register callbacks for this identity before live acceptance.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sign in and access Home (Priority: P1)

An existing account holder chooses email/password, email with a one-time verification code, or Google sign-in and reaches Home. A signed-out visitor cannot view Home.

**Why this priority**: Authentication and access separation are the purpose of the feature.

**Independent Test**: Open the app with signed-out, signed-in, and unresolved session states; attempt login and direct Home access.

**Acceptance Scenarios**:

1. **S01 — Happy**: **Given** no active session, **When** the app opens, **Then** Login is the only available route and Home is not displayed.
2. **S02 — Happy**: **Given** Login and an existing account, **When** authentication completes successfully using each of email/password, email verification code, and Google sign-in, **Then** Home appears and back navigation cannot return to Login.
3. **S03 — Sad**: **Given** Login, **When** credentials are missing, malformed, or rejected, **Then** an accessible actionable error appears, Home stays unavailable, and the user can correct the input and retry.
4. **S04 — Sad**: **Given** a login attempt or session restoration, **When** connectivity fails or the authentication service is unavailable or times out, **Then** a recoverable error and retry action appear without exposing Home or leaving an indefinite busy state.
5. **S05 — Edge**: **Given** a saved session whose validity is unresolved, **When** the app starts, **Then** a loading state appears without flashing Login or Home; a valid session opens Home and an absent or invalid session opens Login.
6. **S06 — Permission**: **Given** a signed-out user, **When** Home is requested through a direct navigation attempt, stale history, or an incoming link, **Then** Login remains the available route and Home content is never displayed. This does not introduce a new deep-link feature.
7. **S07 — Edge**: **Given** Home, **When** the session becomes invalid or revoked and the app learns of that change, **Then** Login replaces Home and navigation history cannot restore protected content.
8. **S08 — Edge**: **Given** an authentication operation is pending, **When** its action is tapped repeatedly, **Then** only one operation is initiated and pending feedback is shown.
9. **S16 — Happy/edge**: **Given** email-code login, **When** the user requests a code and enters the valid code, **Then** Home appears; invalid or expired codes keep Home unavailable and allow correction or resend, while provider-imposed resend limits are communicated.
10. **S17 — Sad/edge**: **Given** Google sign-in, **When** the user cancels or the provider fails, **Then** the app returns to usable Login without granting Home access; a failed sign-in shows retry feedback and cancellation is not presented as a crash.
11. **S18 — Permission**: **Given** a person without an existing account, **When** they attempt email/password, email-code, or Google sign-in, **Then** no account is created, Home remains unavailable, and Login shows a clear message explaining that an existing account is required without exposing account details.
12. **S19 — Happy/edge**: **Given** an existing account whose password sign-in requires an email device-verification code, **When** the user requests, enters, or resends that code within Login, **Then** Home remains unavailable until verification and authentication complete; a valid code opens Home, invalid or expired codes allow correction or resend, and provider-imposed resend limits are communicated. No new route or MFA enrollment is introduced.
13. **S20 — Sad/permission**: **Given** an authentication flow requiring an unsupported MFA challenge or account/session task other than supported email device verification, **When** that requirement is returned, **Then** Home remains unavailable, Login clearly explains that the required verification cannot be completed in this app, pending controls become usable again, and the user can return to method selection. Retrying or changing methods never bypasses provider requirements or changes account policy.

---

### User Story 2 - Log out (Priority: P1)

A signed-in user leaves their session using the sole action on Home.

**Why this priority**: Users must be able to end access on their device.

**Independent Test**: Start with an active session, press Logout, then use back navigation and reopen the app.

**Acceptance Scenarios**:

1. **S09 — Happy**: **Given** Home with an active session, **When** Logout succeeds, **Then** Login appears, the local session is cleared, and back navigation or reopening cannot restore Home without a new valid session.
2. **S10 — Sad**: **Given** Home, **When** Logout fails before the session is cleared, **Then** an actionable error and retry are shown without falsely reporting success; if the session has already been cleared, Login appears.
3. **S11 — Edge**: **Given** Logout is pending, **When** Logout is tapped repeatedly, **Then** only one logout operation runs and the action communicates its pending state.

---

### User Story 3 - Recover from an unexpected screen failure (Priority: P1)

A user encountering a catchable unexpected screen failure sees a recovery screen with Reload instead of a broken or blank screen.

**Why this priority**: A recoverable failure must leave a usable next action.

**Independent Test**: Trigger catchable failures in Login, Home, and app-level authentication/navigation UI, then activate Reload with valid, absent, and invalid sessions.

**Acceptance Scenarios**:

1. **S12 — Sad**: **Given** normal app UI, **When** a catchable rendering or lifecycle failure occurs beneath the top-level error boundary, **Then** the entire failed UI is replaced with a friendly recovery screen containing Reload and no stack trace, credentials, or protected content.
2. **S13 — Happy**: **Given** the recovery screen and a transient failure that has stopped, **When** Reload is activated, **Then** failed app state is reinitialized, session validity is checked again, and the appropriate Login or Home route appears.
3. **S14 — Edge**: **Given** the recovery screen, **When** Reload is activated and the same failure recurs, **Then** the recovery screen remains usable without an automatic reload loop.
4. **S15 — Accessibility**: **Given** Login, Home, loading/error feedback, or recovery UI, **When** users use a screen reader, enlarged text, or the on-screen keyboard, **Then** controls have meaningful labels, feedback is announced, text and actions remain usable, and login fields remain reachable.

### Edge Cases

- Unknown session validity never grants Home access; offline restoration must not trust an unvalidated session.
- Late authentication results must not restore Home after logout or a newer session invalidation.
- Expected asynchronous login/logout failures use their own feedback; a screen error boundary cannot catch every asynchronous callback, event-handler error, native crash, or failure of the recovery UI itself.
- Recovery rechecks authentication rather than restoring a stale protected route.
- An unregistered identity must not be automatically registered by email-code or Google sign-in, including provider handoff and return.
- Missing authentication configuration must fail closed with actionable recovery feedback, without revealing secret values.
- Password sign-in may require email device verification (S19); unsupported MFA or account/session requirements remain blocked with usable feedback (S20).
- No lists or duplicate records are introduced; repeated actions and concurrent session changes are covered by S08, S11, and the stale-result requirement.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST offer exactly two navigable screens: public Login and protected Home (S01, S02, S06). Loading and recovery are app states, not additional public routes.
- **FR-002**: Login MUST offer email/password, email with a one-time verification code, and Google sign-in for existing accounts; authentication MUST complete before Home becomes available (S02, S03, S16, S17, S19, S20). Email-code entry, required email device verification, and provider handoff belong to the Login flow and do not add application routes. Unsupported verification requirements MUST remain blocked rather than bypassed.
- **FR-013**: Email-code login and required email device verification after password sign-in MUST support requesting, entering, and resending codes, with feedback for invalid/expired codes and provider-imposed resend limits (S16, S19).
- **FR-014**: Google sign-in MUST return to usable Login on cancellation or provider failure, without granting access or retaining an indefinite pending state (S17).
- **FR-015**: All three login methods MUST require an existing account and MUST NOT create an account automatically. Unregistered users MUST remain on Login with a clear existing-account-required message and no account details exposed (S18).
- **FR-003**: The app MUST show session-resolution feedback and fail closed while session validity is unknown; valid saved sessions MUST restore Home on reopening (S04, S05).
- **FR-004**: Authentication state MUST determine available routes, including direct navigation and session invalidation, and transitions MUST remove inaccessible history (S02, S06, S07, S09).
- **FR-005**: Home MUST contain only one interactive action, Logout, with pending and failure feedback as needed (S09–S11).
- **FR-006**: Successful logout MUST clear the local session and return to Login; failure MUST be accurately represented and retryable (S09, S10).
- **FR-007**: Login/logout MUST prevent duplicate pending operations and ignore stale results inconsistent with current session state (S08, S11, S07, S09).
- **FR-008**: Invalid input, rejected login, service failure, and timeout MUST provide accessible feedback and a retry or correction path; unsupported verification requirements MUST provide clear blocked-login feedback and a return to method selection without bypassing requirements; no failed attempt may grant access (S03, S04, S20).
- **FR-009**: A top-level recovery mechanism MUST replace app UI after catchable rendering/lifecycle failures, including failures in authentication and navigation UI, with a friendly screen and Reload action (S12).
- **FR-010**: Reload MUST reinitialize the failed app UI and re-resolve the session; repeated failure MUST show recovery again without an automatic loop (S13, S14).
- **FR-011**: UI MUST provide screen-reader labels, announced feedback, usable enlarged text, keyboard-aware login, safe-area layout, and accessible touch targets (S15).
- **FR-012**: Persisted session credentials MUST use platform-backed secure storage; passwords, session credentials, secret configuration, and stack traces MUST NOT appear in user-facing errors or diagnostic logs (S09, S12; planning must add storage/log verification).

### Key Entities _(include if feature involves data)_

- **Account**: An existing identity eligible to authenticate; registration and account management are outside this feature.
- **Session**: Authentication status for one account, including unresolved, active, and inactive states; governs access and survives reopening only while valid.
- **Recovery state**: A catchable app failure and user-triggered retry state; contains no credentials or protected content.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All signed-out, unresolved, invalid-session, direct-access, and stale-history acceptance cases show zero Home content before a valid session is established.
- **SC-002**: In controlled healthy-service acceptance runs, Login or Home appears within 2 seconds after session resolution, successful sign-in, or successful logout.
- **SC-003**: 100% of injected catchable screen failures display a recovery screen with a usable Reload action; transient failures recover in one activation and persistent failures never enter an automatic retry loop.
- **SC-004**: All rejected credentials, service-failure, timeout, and logout-failure cases provide feedback and a usable correction or retry action without falsely reporting success.
- **SC-005**: All S01–S20 scenarios pass on both supported mobile platforms; screen-reader and enlarged-text checks confirm users can complete sign-in, logout, and recovery without inaccessible controls.

## Assumptions

- User-mandated integration constraints: the existing vanilla React Native app uses [Clerk](https://clerk.com/) for authentication and [React Navigation](https://reactnavigation.org/) for navigation. These are explicit constraints, not inferred implementation choices; version compatibility and integration design belong in planning.
- Only existing accounts can sign in using email/password, email verification code, or Google. Automatic account creation through email-code or Google is prohibited. Registration, password recovery, social providers other than Google, MFA enrollment, additional MFA verification methods beyond email device verification, profile management, backend authorization changes, and additional application routes are outside this initial scope. The target authentication instance must support all three login methods; incompatible account policies, including automatic registration, must be resolved before implementation. If Clerk cannot enforce existing-account-only access for a method, that incompatibility must be resolved before implementing the affected flow.
- An owner supplies a suitable authentication instance and client configuration; secrets must not enter the app bundle. This specification does not create or change remote account configuration.
- Android and iOS 17+ are in scope. User approved iOS 17+ on 2026-10-07; iOS 15/16 support is dropped by this feature. No migration to Expo is authorized.
- Session service timeouts and exact Reload mechanics are planning decisions, provided they satisfy observable recovery and access requirements.
- Crash prevention means containment of errors catchable by the requested top-level boundary, not a guarantee against every JavaScript or native crash.
- WEA-10 ticket branch creation and full S01–S20 agreement completed on 2026-10-07; workflow.json records the exact confirmation. Public seams are mapped; evidence.md records implementation setup and SDK compatibility findings. No completed authentication or live-provider success is claimed.

## Owner-supplied branding follow-up (2026-10-08)

Owner request: “App logo and guidelines are available in /Users/pravinraj/Downloads/kit, Please update apps.” Apply the supplied outlined Weave logo, full-bleed app/browser icons, palette and Figtree UI font to web and native apps. Use cream backgrounds, olive text/buttons and approved full-colour logos with proportional one-band clear space. Preserve S01–S20 behavior and the Home screen’s single Logout action. This is a presentation/configuration update, not a new authentication flow.

## Approved login presentation refinement (2026-10-08)

Owner approved the mobile login/OTP proposal aligned with their web login screenshot. Improve hierarchy with compact branding, selected password/email-code controls, outlined Google sign-in, linen-bordered fields and olive submit actions. Email/device-verification challenges use six visual code slots backed by one accessible native input supporting typing, paste and one-time-code autofill. Verification was initially explicit under T049 and is superseded by the owner-requested automatic six-digit verification below; provider validation and S01–S20 access/session/error invariants continue to apply. Pending/feedback, keyboard scrolling and enlarged text remain usable. No signup, new route, auth-policy change or provider bypass is introduced.

## Owner-requested interaction correction — 2026-10-08

Under S15, changing password/email-code methods must keep the logo, heading, Google action, tabs and email field anchored. Only the changing password/submit region transitions smoothly, with immediate changes under Reduce Motion and safe rapid toggling. Clearing old feedback must not recenter the whole page. Under S16/S19, typing, pasting or autofilling a complete normalized six-digit code automatically starts one verification attempt. Partial codes remain editable; pending blocks duplicates; rejected codes permit correction and another automatic attempt. Existing session/access/security invariants continue to apply. The owner explicitly requested these changes; this supersedes T049's requirement to wait for explicit Verify.

## Owner-requested shared authentication header — 2026-10-09

Under S15/S16/S19, Login and both email verification purposes share an identical centered Weave logo in a top safe-area header. Verification Back sits at the top-left and remains reachable while the form scrolls or the keyboard opens. Pending disables Back; returning to method selection, rejected-code recovery and automatic six-digit verification remain unchanged. The owner directly requested the logo consistency and top Back placement; no additional authentication behavior is introduced.

## Tablet authentication alignment correction — 2026-10-09

Owner reported Login top-aligned versus centered OTP on iPad. Under S15/S16/S19 both forms must use a common origin beneath the same header. Use a centered bounded authentication frame on tablet-width windows, with consistent heading position and Back at its top-left. Phones/narrow windows fill available space. Content scrolls for keyboard/enlarged text, without feedback or method changes recentering the form. Remove the OTP-only decorative icon offset so headings align. No authentication-policy change.

## Responsive authentication layout — 2026-10-09

Owner requests phone alignment near the top, centered portrait tablet layout, and landscape tablet composition like the supplied web reference. Use a linen artwork/tagline panel on the left and cream Login/OTP pane on the right in wide tablet landscape. Both forms keep common header/heading origins; rotation retains entered email/code and authentication state. Phones (including landscape) and narrow windows use the full top-aligned layout. Keyboard and enlarged-text content remain scrollable.
