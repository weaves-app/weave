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

Three production artwork files (42/117/47 lines), two shell integration edits, two assets, targeted tests and design documentation. No global store, per-frame JavaScript, storage write, WebGL/Three runtime or generic animation abstraction. Artifacts live in `specs/003-woven-login-artwork/`. Historical WEA-10 artifacts remain untouched on this branch.
