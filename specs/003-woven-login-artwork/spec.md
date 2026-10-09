# Feature Specification: Woven login artwork

**Ticket**: [WEA-24](https://linear.app/weaveapp/issue/WEA-24/replace-login-bag-with-animated-woven-artwork)
**Branch**: `feat/WEA-24/woven-login-artwork`
**Created**: 2026-10-09
**Status**: Approved scope; publication verification in progress
**Input**: Replace the fashion bag with the approved woven composition, animate threads smoothly from every side in one second, and preserve the existing design system with a clean implementation.

## User Scenarios & Testing

### User Story 1 — Recognize Weave's horizontal vision (P1)

As a visitor, I see threads weaving together into the approved shaded composition, representing supply-chain problems coming together across industries. The bag suggests a fashion-only product; woven artwork communicates the broader identity.

**Independent test**: Open sign-in with normal motion on a wide, visible screen and inspect the entrance and final still.

- **S01 (happy)**: Given an eligible sign-in page load, when artwork is ready promptly, then threads enter smoothly from sides and corners, the one-second introduction plays once, and the exact approved composition remains. Form updates and authentication readiness do not replay it.

### User Story 2 — Sign in without depending on animation (P1)

As a visitor, I can use authentication controls even when motion is unsuitable or artwork cannot play. Decoration must not interrupt the primary task.

**Independent test**: Block playback or change motion/visibility conditions and interact with the form.

- **S02 (sad)**: Given unavailable, delayed, rejected or stalled playback, when the introduction cannot complete, then a bounded fallback reveals the still, releases media and leaves the form usable; late readiness never restarts it.
- **S03 (edge)**: Given reduced motion, a hidden document, a screen narrower than 681 px or a non-sign-in authentication screen, then no introduction is requested or played. Static artwork remains available wherever the hero is visible. Losing eligibility during playback settles permanently; unmount releases resources.
- **S04 (regression)**: Given authentication loading, form interaction or JavaScript-disabled rendering, then the artwork does not move with form height, enter the accessibility/focus order or change existing authentication controls, typography or palette. Without JavaScript the visible hero shows the still.

### Edge Cases

Readiness has a 500 ms budget; playback has a 1250 ms watchdog around its one-second duration. Backgrounding, changed preferences, narrow viewports, unsupported media, rejected autoplay and late events all settle without replay. Narrow-screen hero visibility follows the existing design. No new account, permission, persistence, duplicate-submission or business concurrency behavior is introduced.

## Delivery regression discovered during publication

- **S05 (existing policy gate)**: Given the required pre-push hook supplies Git repository environment variables, when policy tests create temporary repositories or inspect a non-repository directory, then those operations use the temporary locations, distinguish missing keys from Git errors and leave the real repository configuration unchanged. This is fixture isolation for the existing S21 checks, required to publish through normal hooks; it adds no product behavior. The user’s publish request authorizes completing the existing gates without bypassing them.

## Requirements

- **FR-001**: Replace the shared authentication bag with the approved woven composition; preserve the existing palette, typography, form and caption.
- **FR-002**: Play the approved all-sides entrance once on eligible sign-in mounts, finish its motion in one second and retain the approved still without a visible geometry jump.
- **FR-003**: Keep authentication interactive and provide a bounded static fallback when playback fails or is inappropriate; stop and release unused media.
- **FR-004**: Preserve decorative semantics, reduced-motion preferences, responsive layout and static no-JavaScript rendering of the hero.
- **FR-005**: Keep authored presentation code isolated and readable, reuse existing design tokens and primitives, and avoid an additional runtime animation dependency.

## Success Criteria

- **SC-001**: The approved final composition and all-side motion remain recognizable; the animation lasts exactly 1.000 seconds.
- **SC-002**: Form edits and authentication loading cause zero artwork replays or stage-position changes at an unchanged viewport.
- **SC-003**: Every eligibility, failure and cleanup scenario has automated coverage or explicit browser evidence with limitations recorded; no unrun check is claimed as passing.

## Clarifications and Assumptions

The user approved the final composition, fluid all-sides entrance, one-second timing and clean integration proposal, then said “go ahead.” Their 2026-10-09 instruction explicitly authorizes a separate Linear ticket, branch, push and PR into develop. No new design decision is needed. Previous local work and RED/GREEN evidence were recorded under WEA-10 S19–S22; this ticket owns that artwork scope as S01–S04, with original evidence preserved unchanged. WEA-10 authentication is already merged into develop.

Scope is web presentation and its design-source archive. Authentication policy, React Native, deployment, merging and a Lottie conversion are outside this change. Pending browser/device checks will be disclosed in a draft PR.
