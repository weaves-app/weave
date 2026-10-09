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

## Motion refinement — 2026-10-09

The user reported an abrupt orange binding, late ground shadow and untidy transition to the approved still, then agreed to try a locally authored refinement and installed Blender. This extends S01/FR-002 within WEA-24, preserving the exact final artwork, all-sides entrance and one-second duration. First produce an inspectable design preview; keep the currently integrated v1 assets immutable.

- **S06 (happy)**: Given an eligible introduction, when the terracotta thread enters, then its leading end and trailing length follow one visible continuous route into the center; it is not introduced by a late material or image swap.
- **S07 (visual regression)**: Given ribbons entering and settling, when they approach the final composition, then the ground shadow develops continuously with their arrival and the settled artwork holds before playback ends. No abrupt silhouette or material replacement occurs in the last frames.
- **S08 (edge/regression)**: Given reduced motion, failed media or the terminal static state, then the original approved still and existing S02–S04 behavior remain unchanged. No new application animation dependency is introduced.

Public checks: lossless rendered frame sequences at 60 fps; the preview's replay, slow playback and scrub controls; comparison with the immutable reference and v1 clip. Automated image-difference checks expose late frame discontinuities; manual inspection is necessary for perceived fluidity and thread continuity. Preserve actual baseline failures before refinement and do not equate a numeric pass with visual approval.

The user accepted the v2 review preview on 2026-10-09 and explicitly requested standards-compliant integration, push and PR. This approves the existing S06–S08 outcomes and the reviewed export; use a new immutable video version while retaining the approved still and existing fallback behavior.

Production inspection found an additional S04 boundary: with classic scrollbars at a 1280 × 720 viewport, Clerk readiness increases page height and introduces a scrollbar. Artwork x changes from 238 to 232.75. Reserve scrollbar space on authentication pages before the form appears so the existing SC-002 position guarantee also holds in this configuration. This is within the previously approved stable-layout behavior.

## Requested PR standards review

The user explicitly requested Matt Pocock's two-axis code review, workspace/Google TypeScript/clean-code compliance, justified design patterns, and a maximum of 500 lines per authored code file. This authorizes review remediation within WEA-24; generated/vendor libraries retain the constitution's exclusion. Count physical lines conservatively, including blank/comment lines.

- **S09 (standards boundary)**: Given an authored code file in this PR (including archived design tooling), when audited, then it has at most 500 physical lines; an over-limit authored source is rejected, and current tooling has one authoritative definition of each ribbon's timing. Original historical source remains recoverable in Git without duplicating obsolete tooling in the current tree.
- **S10 (delivery regression)**: Given the current develop base and published PR metadata, when normal policy/verification runs, then the branch uses develop's package manager and includes exact Linear/Spec/Evidence fields; no hook or policy is bypassed.

These scenarios are the user's review requirements and existing delivery rules, not new product behavior. Existing S01–S08 remain authoritative for motion and fallback.

Review clarification for S01/S03: eligible mounts explicitly request media buffering before waiting for `canplay`; initial and ineligible markup keeps `preload="none"` and no source. A browser may honor the no-preload hint, so waiting for readiness without requesting data is a portability concern. Chromium completed readiness in the review probe; Safari was not observable. This clarification does not treat the concern as a reproduced Safari failure. React StrictMode's setup/cleanup/setup cycle must still permit one subsequent playback attempt and a terminal still.

## External review validation and remediation

The user supplied PR #10 findings F1–F8 and asked to validate them before fixing. This authorizes the confirmed cleanup and existing fallback/responsiveness corrections; do not change the approved artwork or make a speculative handoff fix. Historical media remains recoverable in immutable Git references instead of the deployed public directory.

- **S11 (responsive resource boundary)**: Given a viewport at or below 680 px, when an authentication page loads, then its hidden hero requests neither the full artwork still nor the intro. At 681 px and above, the approved still remains available promptly, including without JavaScript. One shared auth breakpoint governs eligibility and responsive resource selection; CSS literals are checked against that token.
- **S12 (review hygiene)**: Given review findings, validate current PR state, asset references and evidence before remediation. Keep the PR draft while T009/T023 remain open; remove unused deployed artwork with recoverable history, normalize local paths and condense repeated verification logs without changing results or RED/GREEN chronology. Existing matchMedia-unavailable fallback remains tested. A suspected handoff flash only receives a behavior fix if reproduced.
