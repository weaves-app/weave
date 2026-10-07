# Feature Specification: Clerk authentication

**Feature Branch**: `feat/WEA-10/clerk-auth-nextjs-react-native`

**Created**: 2026-10-06

**Status**: Design approved; revised Google scenarios explicitly confirmed; native remains Pravin Raj’s scope

**Input**: [WEA-10](https://linear.app/weaveapp/issue/WEA-10/implement-clerk-authentication-in-nextjs-and-react-native), read in full on 2026-10-06. Implement the smallest usable authentication flow in both the web and existing native applications.

## Clarifications

### Session 2026-10-06

- Ownership: Vishnuu/this session implements Next.js only. Pravin Raj implements React Native on the same WEA-10 ticket; web completion does not complete the ticket.
- Q: Confirm the presented web scenarios? → A: User said "confirm web scenarios". Agreement covers S01–S03 and web portions of S07–S10, including listed web failure/interruption edges. Native coverage is retained as ticket context, not approved or implemented by this session.

### Session 2026-10-07

- User approved the rendered-bag design: "Yes looks good. Go with this design."
- Active web scope: sign-up, sign-in, required verification, and redirect to existing protected Home. Clerk supplies authentication behind custom branded forms. Google authentication is added; no demo harness or screen-switching toolbar is part of the app.
- Branding: Earthy olive #2E3A2F, sage #6B7F58, linen #D9C9B2, terracotta #C96F4F, cream #F8F6EE; supplied Figtree with SIL OFL, logo and favicon. Desktop uses a 70/30 bag/form split; narrow screens prioritize the form. Logo sits above the form. Uniform linen hero; rendered bag with tangible depth. Copy: "Everything, woven together." / "No more loose threads. From order to shelf."
- Invitations are deferred to future organization/settings management. Previous application-invitation story and S03 are historical scope, not current web acceptance. No organization/settings functionality is implemented here. Native scope is not changed on Pravin’s behalf.
- Google happy/sad/edge scenarios were independently confirmed via the user answer "Confirm these scenarios"; design approval is recorded separately.

## User Scenarios & Testing

### User Story 1 — Register and enter Home (Priority: P1)

A new user can register publicly with email/password and verify their email before reaching Home on either platform.

**Why this priority**: Establishes the minimum usable verified account flow.

**Independent Test**: Register an authorized test identity on each platform, verify email, and observe protected Home.

**Acceptance Scenarios**:

- **S01**: Given a signed-out web visitor, when they register with email/password and complete required email verification, then a session is established and protected Home opens with plain `Home` at the top-left.
- **S04**: Given a signed-out native user, when they register with email/password and complete required email verification, then a session is established and protected Home opens with plain `Home` at the top-left.

### User Story 2 — Log in, restore session, and sign out (Priority: P1)

Existing users can enter Home, retain valid sessions across reload/restart, and sign out.

**Why this priority**: Makes authentication usable and protects access throughout its lifecycle.

**Independent Test**: Log in on both platforms, reload/restart, then sign out and attempt direct protected access.

**Acceptance Scenarios**:

- **S02**: Given an existing web user, when valid credentials are submitted, then Home opens; signed-out users cannot access Home or protected server resources by direct URL.
- **S05**: Given an existing native user, when valid credentials are submitted, then Home opens; navigation or deep links cannot bypass authentication.
- **S07**: Given a valid authenticated session, when the web reloads or native app restarts, then the session restores without protected content appearing before authentication resolves. Sign-out clears the active session and prevents Home access. Expired/invalid sessions return to authentication.

### Historical User Story 3 — Application invitation (deferred for web)

An invited recipient can complete signup for the intended identity and reach Home.

**Why this priority**: Application invitations are a required alternative entry path.

**Independent Test**: With an owner-authorized test invitation, verify invitation entry on web and the documented native link handoff.

**Acceptance Scenarios**:

- **S03**: Given a valid application invitation, when its intended recipient opens it on web and completes signup, then the invitation is accepted and Home opens without creating/joining an organization.
- **S06**: Given a valid application invitation, when its recipient opens it through the existing native stack's supported link flow and completes signup, then the intended invitation is accepted and Home opens. Document and verify that handoff, including app closed and app open entry.

### User Story 4 — Recover safely and verify delivery (Priority: P1)

Users receive actionable errors; both integrations preserve one identity application per environment.

**Why this priority**: Prevents failed/interrupted authentication from exposing protected content or losing invitation context.

**Independent Test**: Exercise recoverable failure states on both platforms and verify the same authorized account works on each.

**Acceptance Scenarios**:

- **S08**: Given invalid credentials, duplicate signup, incomplete/failed verification, network failure, or invalid/expired/reused invitation, when authentication cannot complete, then a clear recoverable error appears, loading finishes, and no unauthorized session/access is granted. Repeated submissions and interrupted flows cannot bypass verification/invitation validation.
- **S09**: Given one environment, when an account authenticates on web and native, then both integrations use the same identity application/account. Platform integrations remain separate.
- **S10**: Given completed implementation, when applicable tests, lint, typechecks, builds, and repository verification run, then actual results and meaningful RED/GREEN evidence cover both platforms. Record web/native flow checks and available native bundles/compiles. Blocked/unrun checks remain distinct from passes.

### User Story 5 — Google authentication and approved design (Priority: P1)

- **S11 (confirmed 2026-10-07)**: Given a signed-out visitor on either branded auth page, when they continue with Google and Clerk completes the authentication flow, then the valid session reaches protected Home. Cancellation, rejection, missing configuration, or provider/network failure permits safe retry and never grants protected access. Repeated clicks initiate only one attempt. Callback completion handles required verification without silently activating an incomplete account.
- **S12 (design approved)**: Given sign-up/sign-in/verification on desktop or mobile, then the supplied branding and approved layout appear, controls have accessible labels and focus states, loading/errors remain readable, and no invitation screen, demonstration toolbar, or fake auth success appears.
- Live acceptance sequence: create an authorized new account, complete required verification, observe Home, sign out, then sign in with the same account and observe Home again. Google is exercised in an ordinary system browser.

### Edge Cases

- S08 covers empty/malformed email, missing password/code, rejected passwords, incorrect verification codes, expired codes, and duplicate identities. Correctable inputs retain a usable recovery path.
- S08 covers offline/timeouts, rapid double submission, app interruption during verification, and restoration after interruption. Late results cannot activate a session after cancellation/sign-out.
- S03/S06/S08 cover missing/malformed invitation parameters, expired/reused invitations, and an already signed-in different identity. Preserve invitation context through navigation and reject identity substitution; no silent fallback to ordinary signup.
- S02/S05/S07 cover unresolved, expired, invalid, and signed-out sessions. Home stays hidden until authenticated, including direct/deep link entry and after sign-out.
- Permission boundary is signed-in versus signed-out. Organizations, roles, franchises, multi-tenancy, all invitation management, Expo migration, and deployments are excluded. Approved branded web authentication styling is now in scope.
- No application data collections are introduced, so missing business data, pagination, and concurrent business-record updates do not apply. Authentication concurrency and missing configuration do apply.

## Requirements

### Functional Requirements

- **FR-001**: Both platforms MUST support public email/password signup with required email verification before authenticated Home access (S01/S04).
- **FR-002**: Both platforms MUST support existing-user login and enforce protected access at their platform boundaries (S02/S05).
- **FR-003 (historical/deferred web)**: Previous invitation requirements are retained as ticket history; no invitation acceptance screen is delivered in this web revision. Native scope requires separate agreement with Pravin.
- **FR-004**: Both platforms MUST resolve authentication before revealing Home, restore valid sessions, reject invalid sessions, and clear active sessions on sign-out (S07).
- **FR-005**: Both platforms MUST expose loading/validation/error/recovery states and guard repeated or interrupted submissions (S08).
- **FR-006**: An environment MUST use one identity application/account namespace across platforms, while secrets remain isolated from clients (S09).
- **FR-007**: Delivery MUST record behavioral test chronology and verification outcomes with scenario traceability, including unavailable prerequisites (S10).

- **FR-008**: Web MUST use Clerk-supported Google authentication with safe callback completion, cancellation/failure recovery and protected Home (S11, confirmed 2026-10-07).
- **FR-009**: Web auth MUST match the approved branded design with supplied assets and licence preserved (S12).

### Key Entities

- Account: one intended user identity identified by verified email.
- Authentication attempt: registration/login/invitation progress, pending verification, recoverable failure, or completed session.
- Application invitation: recipient-bound invitation with valid, expired, or consumed state.
- Session: unresolved, authenticated, signed-out, or invalid/expired state.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Current web public signup and same-account login reach protected Home with authorized configuration; Google scenarios are confirmed; real provider acceptance remains blocked on owner configuration. Native success remains independently verified by Pravin.
- **SC-002**: Every agreed direct/deep-link and unresolved/invalid/signed-out session check denies protected access.
- **SC-003**: Every agreed failed/interrupted authentication check finishes loading and provides recovery without granting access.
- **SC-004**: All ten scenario IDs map to recorded automated/manual evidence or an explicit blocker; no blocked check is reported as passing.

## Assumptions

- Owner supplies environment configuration and authorizes any security settings, test accounts, or test invitations required for live checks; none will be provisioned implicitly.
- Native means the current vanilla React Native application, retaining iOS/Android projects. No Expo migration is authorized.
- Approved web branding replaces the minimal auth styling. Home retains its plain top-left label and sign-out only.
- SDK compatibility and invitation handoff are researched against current official documentation during planning. No integration is chosen before that research.
- WEA-8 remains In Progress in Linear; this feature does not migrate package managers or assume that work has merged.

## Proposed Test Seams and Agreement Decision

Web: public form/session interactions plus server protection checks. Native: public screen/session interactions plus link delivery/handling. SDK adapters are isolated for deterministic failures; live checks independently establish provider acceptance and identity consistency.

Web agreement recorded from the explicit user instruction "confirm web scenarios". Continue plan → tasks → analyze → implement → converge for Next.js only. Native S04–S06 and native portions of S07–S10 remain Pravin's responsibility and are not confirmed by this instruction.

Google agreement: 2026-10-07 user answered "Confirm these scenarios" to the specific proposed Google happy/sad/edge coverage.

## Organization onboarding revision — 2026-10-07

User approved the standalone HTML design. This revision supersedes exclusions of organization onboarding above, direct Home destinations immediately after authentication, and the earlier Membership optional recommendation. Keep Clerk Membership required. Sending/managing invitations and organization IAM/settings remain deferred. Native remains Pravin’s scope.

Proposed behavior (awaiting explicit scenario confirmation):

- S13: Given completed web authentication, show one organization picker containing accessible memberships with roles and pending invitations in the same list, plus Create organization. Existing memberships open directly; selected pending invitations are accepted before activation. Accepted memberships do not need another screen.
- S14: Given no organizations, show the picker’s empty state; a valid organization name creates one and activates it before reaching Home. Invalid input, rejected creation, loading/acceptance/activation failures show recoverable states without granting Home access.
- S15: Given concurrent clicks or interrupted operations, perform one mutation at a time and prevent late navigation after cancellation/signout. Server Home and protected resources require verified identity and an active organization; pending/unselected users return to the picker.

FR-010: Web authenticating users enter the approved organization picker and can open existing membership, accept a pending invitation in that list, or create their organization (S13/S14).
FR-011: Web Home and protected resources require verified authentication and active organization; organization failures and duplicate/interrupted actions remain recoverable (S14/S15).
SC-005: Confirmed organization scenarios map to automated evidence and separately recorded real Clerk acceptance.
