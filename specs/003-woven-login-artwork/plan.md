# Implementation Plan: Woven login artwork

**Branch**: `feat/WEA-24/woven-login-artwork` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

## Summary

Publish the approved, locally implemented artwork on a dedicated branch from develop `f041c95`. Transfer tests first, demonstrate behavioral failure against the bag, then transfer the implementation and rerun required checks. This is a base-regression check, not a rewrite of original TDD chronology.

## Technical Context

TypeScript 6.0.3, React 19.2.3, Next 16.3.8, existing Node test runner/Testing Library. No new dependency, storage, API, domain model or injected service. Native H.264 preserves the shaded 3D motion; a transparent WebP preserves the final composition. Original prototype/export sources and licenses live in an archive outside the application graph.

## Architecture and Contracts

- `artwork/auth-artwork.tsx`: decorative component, readonly optional `animate`, static default. Existing Next Image plus muted inline video with no initial source.
- `artwork/use-artwork-intro.ts`: pending → playing → terminal still; failure/ineligibility may go directly to still. Only visible, wide, normal-motion sign-in requests media. Readiness budget 500 ms; playback watchdog 1250 ms. Cleanup removes timers/listeners and releases media.
- `artwork/auth-artwork.module.css`: scoped geometry and reduced-motion styles, with a no-JavaScript still rule. Anchor to viewport so Clerk readiness cannot move it; remove obsolete global bag CSS.
- `auth-shell.tsx`/`auth-view.tsx`: opt in only sign-in, retain the shell through SDK/form updates. Existing primitives, captions, tokens and authentication application contracts remain.
- `public/brand/woven/`: immutable `intro.v1.mp4` (169899 bytes) and `still.v1.webp` (137740 bytes). Baked background uses the existing hero token; changing it needs a versioned re-export. Document color conversion and hashes.

## Public Test Seams and Verification

AuthShell/AuthView rendering, native media events, matchMedia/visibility events, form interaction, source presence and unmount cleanup. Tests do not call hook internals. The small CSS Module adapter is test-only. Actual decoding, colors, layout and handoff require browser evidence.

Run targeted tests before/after transplant, web regression tests, `npm run verify` and database/HTTP integration. Preserve original browser samples, layout RED/GREEN, screenshot and initial TDD logs with provenance. Report outstanding Safari/Firefox, real mobile/reduced-motion/no-JavaScript and throttled-network inspection. An isolated JavaScript measurement is not a production route-bundle delta.

## Constitution Check

All ten principles reviewed: prior approval retained; actual RED/GREEN chronology preserved; strict named/readonly TypeScript; application/domain untouched; no new service injection; reused UI/tokens with scoped presentation; dedicated ticket branch from develop; no release/deploy; CI/code-owner review remains required; verified personal identity before publication. No new exception. The generic tasks template says tests are optional, but the authoritative constitution requires TDD and is followed.

## Structure and Complexity

Three production artwork files (42/118/47 lines), two shell integration edits, two assets, targeted tests and design documentation. No global store, per-frame JavaScript, storage write, WebGL/Three runtime or generic animation abstraction. Artifacts live in `specs/003-woven-login-artwork/`. Historical WEA-10 artifacts remain untouched on this branch.

## Publication fixture correction

The normal pre-push hook exposed two existing S21 failures in `tests/policy/git-config.test.mjs`: inherited Git repository environment variables redirected temporary-repository operations into the caller. Preserve the failing push output as S05 RED. Clear only the variables enumerated by `git rev-parse --local-env-vars` in that test file's isolated Node process before fixtures run. Keep production Git identity policy and hooks unchanged. Re-run with an inherited GIT_DIR, assert the caller's personal settings remain intact, then rerun required checks and normal push.

## Motion refinement preview

Retain the approved image and existing native-video integration. Author a separately versioned preview beside the original visualizations, using the existing Three.js source for identity-aligned geometry and Blender 5.2.2 LTS for structured scene inspection. Improve the timeline, binding entrance, shading continuity and shadow development; do not substitute a newly styled sculpture. Validate decoded baseline frames first, then lossless candidate frames and actual browser playback. Design tooling remains outside the application dependency graph. Publish neither replacement production media nor a claim of visual approval until the preview passes its continuity checks and is presented for review.

No new domain model, service, API, credentials or dependency installation is needed. Reproducible scripts and frame/scene reports accompany the preview. S06–S08 map to T012–T015; S02–S04 remain covered by the unchanged integration tests.

## Approved v2 integration

The 2026-10-09 approval authorizes promoting the reviewed 178318-byte clip byte-for-byte to `public/brand/woven/intro.v2.mp4`. Update the existing public media-selection assertion first, record its failure against v1, then switch the hook's source. Preserve `still.v1.webp`, immutable v1 media, lifecycle, component and CSS. Package reproducible v2 authoring modules and licenses in `docs/design/woven-design-source.v2.zip`; exclude regenerated frame sequences and sampled Blender files. Document geometry inspection honestly; Blender is not an application runtime or the video renderer. Run required repository/database checks and update existing PR #10 into develop under the verified personal identity. T009 remains a disclosed browser/device release gate.

For the S04 classic-scrollbar regression, add one authentication-scoped root rule (`html:has(.auth-shell)`) using `scrollbar-gutter: stable`. Reserve layout space without adding JavaScript, duplicating responsive grid ratios or changing the form. Record actual browser bounds before/after, then rerun required checks.

## PR review remediation

Run independent Matt Pocock Standards and Spec reviews against fixed head `0bf8076` and merge-base `f041c95`. S09: audit all PR-authored code including source archives; retire superseded source archives from the current tree with immutable Git links, keep one separately versioned current source archive, and consolidate timing metadata without changing sampled geometry or deployed media. Enforce the 500-line boundary in shared JS/TS lint rules and retain an explicit CSS/archive audit. S10: merge current develop `810974c` through normal history, use its pinned pnpm environment, restore exact PR traceability fields and run actual policy validation plus final required checks. Do not invent new animation abstractions or change authentication contracts.

## External review response

Validate F1–F8 against head `2c3d6a8`. F1: restore draft state. F2: remove obsolete public assets, update the container asset contract to current WebP/MP4, and retain immutable Git references. F3/F7: normalize only local path prefixes, preserve original assertion outcomes and scenario ordering, retain distinct behavioral RED logs, and replace repeated full verification output with concise records linking immutable originals. Keep the current 2 MB reproducible source archive; moving it to a release would introduce release/tooling policy without a runtime benefit.

F4: reproduce the hidden-image fetch at 375 px before implementation. Use native responsive picture selection with a local transparent mobile candidate and a desktop-only preload, preserving the exact WebP on desktop. Merely conditioning preload would still leave an eager img request; optimizing the image changes bytes and still requests a mobile variant. F6: add an auth layout breakpoint token and CSS-consistency regression checks; retain CSS media literals because CSS custom properties cannot drive media conditions. F8: simplify fragments and tighten test selectors; test the already implemented unsupported-matchMedia fallback. F5: inspect the actual handoff where browser tooling permits; if no flash is reproduced, leave lifecycle behavior unchanged and disclose unrun throttled/Safari/Firefox checks under T009.

Run targeted tests per concern, production responsive checks, `pnpm run verify`, database integration and container asset verification. Keep the running preview isolated from verification output. No new runtime package, domain model or application contract.

## Mobile logo alignment

S13/T036: reproduce the marked mobile misalignment through public browser bounds, then replace the existing mobile logo bottom-margin declaration with an equivalent shorthand that adds automatic horizontal margins. Reuse the current 680 px media query and preserve all sizes and vertical spacing. Verify mobile and breakpoint geometry in the production build, run existing checks, and record convergence. No additional stylesheet, component, abstraction or runtime dependency.
