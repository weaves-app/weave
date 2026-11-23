# Feature Specification: Mobile Local State

**Feature Branch**: `feat/WEA-27/zustand-local-store`

**Created**: 2026-10-15

**Status**: Implemented — automated/native verification passed; live acceptance pending

**Input**: User description: "I want to integrate Zustand as a local store for Weave RN app. Take PR #11 as a base and do a stacked PR on top. Create a ticket in linear."

**Ticket**: [WEA-27](https://linear.app/weaveapp/issue/WEA-27/integrate-zustand-local-state-in-the-react-native-app)

**Dependency**: [PR #11](https://github.com/weaves-app/weave/pull/11), branch `feat/WEA-10/mobile-auth-recovery`, observed head `c9998b4af2af8762c6c2ea10dbc756263aab1e9c`. Stack against that branch; retarget develop after its merge. Parent acceptance gaps remain parent obligations.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See consistent authentication state (Priority: P1)

As a mobile user, I see consistent authentication progress, errors and access across Login, Home and navigation as I interact with the app.

**Why this priority**: Shared local state must preserve the existing usable sign-in journey.

**Independent Test**: Exercise the existing sign-in methods and observe all consumers of authentication state.

**Acceptance Scenarios**:

1. **S01 — Happy**: **Given** two consumers observing the same running app, **When** authentication transitions from resolving to signed out, pending and active, **Then** each sees the same accepted current state and protected Home appears only for an active session.
2. **S02 — Sad**: **Given** a signed-out user, **When** invalid credentials, a network failure or duplicate submission occurs, **Then** existing recoverable errors and pending controls are preserved, duplicate operations are not started, and protected access is not granted.
3. **S03 — Edge**: **Given** an authentication operation has been replaced or its app root disposed, **When** an older callback arrives, **Then** it cannot change the current state or restore protected access.

---

### User Story 2 - Start safely after sign-out and recovery (Priority: P1)

As a mobile user, my previous transient authentication state does not leak into a fresh app lifetime or another user's session.

**Why this priority**: Reset and isolation protect both correctness and user privacy.

**Independent Test**: Sign out, trigger recovery Reload, and restart with controlled authentication responses.

**Acceptance Scenarios**:

1. **S04 — Happy**: **Given** an active session, **When** sign-out succeeds, **Then** protected Home is removed and transient attempt, pending and error state reset according to the existing sign-out behavior. Failed sign-out retains the existing safe recovery behavior.
2. **S05 — Edge**: **Given** catchable application failure and transient state, **When** Reload creates a fresh app root, **Then** it starts resolving authentication without reusing the old root's state, listeners or callbacks.
3. **S07 — Edge**: **Given** the app was terminated during an authentication attempt, **When** it restarts, **Then** the existing authentication authority resolves the session before protected content appears; unfinished attempts, passwords, codes and prior errors are not restored from the local store.

---

### User Story 3 - Isolate local state consumers (Priority: P2)

As a contributor, I can use shared local state without coupling unrelated consumers or independent app lifetimes.

**Why this priority**: Predictable subscriptions and isolation allow future mobile features to build on this foundation.

**Independent Test**: Create two independent lifetimes, subscribe to a selected value, update unrelated values and remove subscriptions.

**Acceptance Scenarios**:

1. **S06 — Edge**: **Given** independent app lifetimes and consumers interested in different state values, **When** one lifetime changes or a consumer unsubscribes, **Then** the other lifetime is unchanged, removed listeners receive no updates, and unchanged selected values cause no consumer update.

### Edge Cases

- Stale operation generations and out-of-order revisions remain rejected (S03).
- Repeated sign-in, verification, sign-out and Reload preserve existing duplicate protection (S02, S05).
- Foreground/background transitions and interrupted provider sign-in retain parent behavior (S01–S03).
- A disposed lifetime cannot write into a new one (S03, S05, S06).
- Offline failures remain recoverable; this feature adds no offline session authority (S02, S07).
- Empty initial state resolves authentication before rendering protected content (S01, S07).
- New permissions, server data conflicts and bulk data boundaries do not apply: no new remote operations or datasets are introduced.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The mobile app MUST expose one coherent current shared authentication presentation state per app-root lifetime (S01).
- **FR-002**: Existing sign-in methods, verification, session resolution, navigation protection, errors and lifecycle behavior MUST remain unchanged (S01–S04, S07).
- **FR-003**: Replaced or disposed operations MUST NOT modify current state (S03, S05).
- **FR-004**: Successful sign-out MUST clear transient user state; unsuccessful sign-out MUST preserve the parent's safe error/recovery behavior (S04).
- **FR-005**: Recovery Reload MUST create an isolated lifetime and release subscriptions owned by the previous lifetime (S05, S06).
- **FR-006**: Consumers MUST be able to observe only their selected state values and unsubscribe without affecting other consumers (S06).
- **FR-007**: Shared local state MUST remain in memory. Passwords, verification codes and authentication credentials MUST NOT enter it; session persistence and validity MUST remain owned by the existing native authentication authority (S07).
- **FR-008**: Independent app instances and test lifetimes MUST NOT share mutable state (S06).

### Key Entities

- **App lifetime**: One mounted app root and its owned local state and subscriptions.
- **Authentication presentation state**: Current safe session summary, selected method, attempt stage, pending indicator and recoverable error. Contains no credentials.
- **State consumer**: A view or coordinator observing selected current values for one lifetime.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All seven agreed acceptance scenarios must pass: shared automated checks cover S01–S07, and Android and iOS journeys cover S01–S05 and S07. S06 is verified by deterministic shared adapter/React tests; production platform compatibility is checked by both bundles and native builds.
- **SC-002**: Zero protected Home displays occur before session resolution or after successful sign-out in the agreed journeys.
- **SC-003**: Across 20 successive root resets, zero prior-root callbacks or listeners alter the new lifetime.
- **SC-004**: Across 100 unrelated state changes, a consumer whose selected value stays equal receives zero updates.
- **SC-005**: All existing automated mobile authentication and navigation regression checks pass, preserving the same visible outcomes.

## Assumptions

- The user explicitly selects Zustand; this technology constraint belongs to planning, while the requirements above describe observable behavior.
- Initial adoption migrates existing shared authentication presentation state rather than adding artificial demo state or new product features.
- Component-local form input stays local. No persisted application store, server-data cache, new screens, web/backend migration or new authentication methods are included.
- Domain/application behavior remains framework-free through published interface contracts; concrete store wiring belongs in the composition boundary.
- PR #11 is the authorized stacked base even though ordinary ticket branches start from develop. Its unverified live/device acceptance does not become verified by this change.
- Specification quality validation is not scenario approval. Confirmation must be recorded before source changes, followed by clarify, plan, tasks, analyze, implement and converge.
