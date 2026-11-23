# Feature Specification: Mobile Internationalization Foundation

**Feature Branch**: `feat/WEA-28/mobile-i18n`

**Created**: 2026-10-15

**Status**: Approved for implementation — English-only S01–S08 confirmed by the user on 2026-10-15

**Input**: User description: "implement i18n create a ticket for it in linear". Follow-up: "english only". Prior instruction: stack the next task on PR #12.

**Ticket**: [WEA-28](https://linear.app/weaveapp/issue/WEA-28/add-internationalization-to-the-react-native-app)

**Dependency**: [PR #12](https://github.com/weaves-app/weave/pull/12), branch `feat/WEA-27/zustand-local-store`, verified head `04aeaf5ed3946547d55e8e5d32990d8453d95c17`. Use its head as the stacked base. Preserve parent acceptance gaps; retarget develop after the parent merges to satisfy current PR-target policy.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Keep existing English journeys complete (Priority: P1)

As a mobile user, I can read the existing Login, verification and Home journeys, including screen-reader descriptions, in clear English while the app gains a consistent foundation for future translations.

**Why this priority**: Internationalization must preserve today's usable authentication experience; English is the only production language requested.

**Independent Test**: Exercise all existing sign-in methods, verification, session loading, Home, sign-out and normal authentication errors; compare all app-owned visible and spoken copy with the approved English message inventory.

**Acceptance Scenarios**:

1. **S01 — Happy**: **Given** the app is opened with a supported English device preference, **When** users traverse Login, password/email-code/Google sign-in, verification, Home and sign-out, **Then** existing app-owned labels, instructions, placeholders, loading feedback and safe authentication errors appear in English with their existing meaning, roles and actions.
2. **S02 — Edge**: **Given** a non-English, region-specific English, empty or invalid device-language preference, **When** the app selects its display language, **Then** it consistently uses the sole supported English language without a picker, blank copy, untranslated message identifiers or startup failure.
3. **S03 — Accessibility**: **Given** VoiceOver or TalkBack is enabled, **When** a user focuses authentication, verification or navigation controls, **Then** labels, hints and announced feedback convey the same English meaning as the visible controls; hidden decorative code slots remain excluded.

---

### User Story 2 - Show correct dynamic feedback and safe fallback (Priority: P1)

As a mobile user, I understand dynamic retry information and can recover safely if text resources are unexpectedly unavailable.

**Why this priority**: Incorrect substitution or failed recovery text can prevent users from completing authentication.

**Independent Test**: Exercise retry counts and missing-resource conditions through controlled test inputs, including offline startup, provider-independent application recovery and Reload. Verify recovery labels, hints and announcements with VoiceOver/TalkBack; this is US2 acceptance, separate from US1 normal-journey accessibility.

**Acceptance Scenarios**:

1. **S04 — Happy/edge**: **Given** retry feedback with counts 0, 1, 2 or 60, **When** the message is shown, **Then** the count is substituted exactly once, 1 uses singular "second", other counts use "seconds", and no formatting markers appear. Existing separately displayed email/account data remains unchanged.
2. **S05 — Sad**: **Given** an unexpectedly unavailable language resource or missing message, **When** the app needs text, **Then** it uses the complete English fallback where available, otherwise a predefined safe English fallback appropriate to the message role, without displaying a raw identifier, blank control, raw error or credential. Missing required English messages must also be detected before delivery.
3. **S06 — Recovery/offline**: **Given** the device is offline or the app's normal presentation subtree fails, **When** the user opens the app or reaches the recovery screen, **Then** session/loading/error/recovery text remains readable in English without a translation download, and Reload remains usable even if the normal language context is unavailable. Recovery controls retain their accessible English labels, hints, roles and announced feedback. Authentication still follows its existing offline/recovery rules.

---

### User Story 3 - Keep language concerns separate from session state (Priority: P2)

As a mobile user, changes to device preferences or text resources do not disrupt my authentication journey. As a contributor, I can maintain the app's messages consistently and prepare future language additions without scattering copy across screens.

**Why this priority**: A reusable foundation needs predictable ownership while protecting the state and recovery behavior introduced by the parent PR.

**Independent Test**: Recreate the app with changed device preferences, run two independent app lifetimes, and inject expanded English test wording while checking session/form behavior and layouts.

**Acceptance Scenarios**:

1. **S07 — Lifecycle/isolation**: **Given** an active or pending authentication journey, **When** device-language preferences change and are evaluated on the next activation, **Then** the app continues to display English, never logs out or resets an active root solely because of that preference change, and independent app lifetimes cannot alter each other's display-language context. Compare matched background/foreground sequences with unchanged versus changed locale inputs: preserve the parent's existing refresh, native revalidation and resulting state/form/navigation transitions in both runs, with zero additional operations or resets attributable to localization. A real process restart still revalidates native authentication as before.
2. **S08 — Layout/maintainability**: **Given** longer English test wording and supported enlarged-text settings, **When** users view existing phone/tablet layouts, **Then** labels and feedback remain readable, primary controls remain reachable, and screen-reader meaning remains complete. Existing messages are identified in a complete inventory so omissions can be detected and wording can be maintained consistently.

### Edge Cases

- Region-specific English preferences such as en-GB and en-IN resolve to the sole English message set; unsupported preferences fall back to it (S02).
- No language preference, malformed locale input or an unavailable device-preference source must prevent startup (S02).
- Missing English resources use role-appropriate emergency wording at runtime and fail completeness validation before delivery (S05).
- Count 1 uses singular retry feedback; 0 and larger counts use plural. Invalid or absent retry counts retain the existing safe-error behavior rather than exposing malformed values (S04, S05).
- Passwords, verification codes, callback identifiers and other machine-readable authentication values must not be translated or locale-normalized. User email/account content is not translated, modified or logged (S04, S07).
- Recovery is outside the normal auth provider and must remain usable when normal language initialization or its context fails (S06).
- Root Reload, background/foreground and repeated actions preserve the parent's authentication and stale-callback protections (S01, S07).
- Expanded wording and large text are tested on phone/tablet layouts; this feature must introduce no new layout regression. Pre-existing parent acceptance gaps remain attributed to the parent (S08).
- Right-to-left layout, remote translation outages, translation editing permissions and persisted language conflicts are outside scope: production supports English only, bundled text and no language override.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The mobile app MUST support English as its only production display language for this ticket; any absent, unsupported or unusable device-language preference MUST fall back to English (S01, S02).
- **FR-002**: Existing app-owned text in Login, method selection, password/code inputs, verification, session initialization, navigation feedback, Home, sign-out, authentication errors and recovery MUST belong to a complete, consistently maintained message inventory (S01, S08).
- **FR-003**: App-owned accessibility labels, hints and announced feedback MUST use that same language policy and preserve existing roles, focus semantics and decorative-content exclusions (S03, S06).
- **FR-004**: Dynamic messages MUST substitute intended display values correctly and use the English singular/plural forms specified by S04. User-provided text and machine-readable authentication values MUST remain unchanged by localization (S04, S07).
- **FR-005**: Missing or unavailable text MUST resolve to English fallback or a safe predefined English message appropriate to its role. Required English message omissions MUST be detected before delivery; raw identifiers, formatting markers, blank actionable labels and raw provider errors MUST NOT reach users (S05).
- **FR-006**: Display text and recovery actions MUST work without a network translation request and without the normal auth/language context being available on the recovery path (S06).
- **FR-007**: Language initialization, fallback and device-preference changes MUST NOT independently reset authentication, navigation history or component-local form values. Preference selection is evaluated on app activation; the ticket adds no live language-switching workflow (S07).
- **FR-008**: Independent app lifetimes MUST have isolated language context, and root Reload MUST safely initialize a fresh context while preserving existing native session authority (S07).
- **FR-009**: Localization MUST introduce no new clipping, unreachable controls or accessibility regressions in the existing phone/tablet layouts and supported enlarged-text settings (S03, S08).
- **FR-010**: Existing English wording MUST retain its meaning; permitted wording changes are grammatically correct dynamic singular/plural forms and any narrowly documented completeness/accessibility correction. Product names, identity-provider names and user data retain their original identity (S01, S03, S04, S06).

### Key Entities

- **Supported language**: English, the sole production language and fallback language.
- **Device-language preference**: External preference information used to select a supported display language; it grants no authority over authentication or user data.
- **Message inventory**: Stable message identities, approved English wording, any display parameters/plural forms, and the owning visible/accessibility role.
- **Display-language context**: The selected language for an app lifetime; independent of session validity and component-local credentials.
- **Fallback message**: Predefined safe English text that preserves the role of a message/control when normal wording is unexpectedly unavailable.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of the inventoried app-owned visible and accessibility messages in the existing journeys have complete English wording; automated completeness checks reject every missing required entry.
- **SC-002**: All eight agreed scenarios pass in shared automated checks. Android and iOS user journeys verify S01, S02, S03, S04, S06 and S08; controlled missing-resource and independent-lifetime conditions in S05/S07 are verified deterministically, supplemented by both-platform startup, Reload and lifecycle checks.
- **SC-003**: The 0, 1, 2 and 60 retry-count examples produce correct complete English messages with zero unresolved substitutions, wrong singular forms or modified user/authentication values.
- **SC-004**: Across supported/unsupported/missing/invalid preference and missing-resource cases, zero blank actionable labels, raw message identifiers or localization-caused startup/recovery failures occur.
- **SC-005**: All existing authentication, navigation, privacy, recovery and state-isolation regression checks pass, with zero additional authentication operations or session resets caused solely by language selection.
- **SC-006**: English startup and recovery text require zero network translation requests; primary controls remain reachable during the defined expanded-text and accessibility checks on both platforms.

## Assumptions

- The user explicitly confirmed "english only" on 2026-10-15. This ticket builds the mobile internationalization foundation, without shipping any additional language or machine-generated translations.
- Mobile scope is inferred from the current RN feature and the instruction to stack on PR #12. Web/backend internationalization and cross-platform text-package extraction are excluded.
- English is the canonical baseline. Regional date/currency formatting is excluded because the current journeys have no corresponding user-facing values; the existing retry-seconds message is included.
- No in-app language picker, persisted preference override, translation dashboard/service or new product screen is introduced. Future production languages require a separate approved scope.
- App-owned copy is included; operating-system dialogs, native keyboard language and third-party identity-provider pages remain controlled by their owners. Brand names/assets and technical identifiers are not translated.
- Planning chooses libraries, message structure and injected contracts. Domain/application authentication remains framework-free; reusable primitives and semantic design tokens remain in use.
- Expanded English wording in tests is a layout fixture, not a second production language. Existing minimum-platform support, supported text-size behavior and parent acceptance limits remain unchanged.
- Language scope confirmation is not acceptance-scenario agreement. Record agreement for S01–S08 in workflow.json before source changes, then proceed through clarify, plan, tasks, analyze, implement and converge with actual evidence.
