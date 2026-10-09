# PR #10 code review — WEA-24

Requested by the user on 2026-10-09: Matt Pocock two-axis review; workspace, Google TypeScript, clean-code and appropriate-pattern compliance; maximum 500 lines per authored code file.

Method: installed `code-review` skill (`/Users/vishnu/.codex/skills/code-review/SKILL.md` and its upstream workflow), with independent Standards and Spec subagents, followed by separate re-reviews of the fixes. Original fixed comparison: `f041c9578d070700ad04c4118f4c5b2fc728b8f6...0bf8076ca698bf9c882e9a47a25c2b3b47a6caf9`. Current develop `810974c` was merged normally as `87874b2`; final scope is the feature diff against that develop plus the documented remediation. Spec source is this feature's `spec.md`; the repo's Spec Kit and known Linear ticket take precedence over installing another issue-tracker workflow.

## Standards axis

| Finding                                                                                                                    | Severity / basis                                                          | Resolution                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical authored `woven-export.js` inside the v1 archive had 595 physical lines (562 without blank/comment-only lines). | P2 hard violation of the user's 500-line limit.                           | Removed superseded source archives from the current tree; original bytes remain at immutable Git references in the design documentation. Current v2.1 source is modular and every authored file is at most 500 lines. |
| Current ribbon definitions declared start/duration values that parallel arrays silently replaced.                          | P3 judgment call: duplicated knowledge; architecture standard's DRY rule. | Put effective timing in each ribbon definition and removed obsolete overrides. All seven ribbons retain identical timing, width, feed length and 241 sampled path points each.                                        |

Independent follow-up: **0 remaining standards findings**. All reviewed unpacked and archived authored code complies with the limit; largest current authored archive file is 496 lines, largest application file is `globals.css` at 483. Unmodified vendor/generated sources remain excluded by constitution §3. Shared ESLint now rejects JavaScript/TypeScript files above 500 physical lines, including blank/comment lines; CSS and archive members were explicitly audited. Actual 500/501 boundary RED/GREEN is saved below. Files were not compressed to evade the limit.

Google TypeScript review used `docs/standards/typescript.md`, `google-rule-mapping.md` and the [Google guide](https://google.github.io/styleguide/tsguide.html). New application contracts use readonly interfaces, named exports and explicit result types. Runtime/browser concerns stay in presentation; no new domain/application dependency or unsafe external-data boundary is introduced. The repository's documented framework/generated exceptions still apply; this is not a claim of exception-free Google conformance.

Pattern assessment: `AuthArtwork` handles rendering, the focused hook owns native-media lifecycle/timers/cleanup, and `AuthShell` composition preserves the instance across loading and form changes. These responsibilities are coherent. A DI container, strategy hierarchy, generic player abstraction or additional state-machine dependency would add complexity without a requirement. The existing pending/playing/terminal-still lifecycle is sufficient.

## Spec axis

| Finding                                                                                                                          | Severity / source                                                    | Resolution                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The hook waited for `canplay` while markup requested `preload=none`; a browser honoring that hint could withhold readiness data. | P2 portability concern, S01/FR-002 with S03 eligibility constraints. | Set `video.preload = 'auto'` only after eligibility and before source/load. Source-free initial and ineligible markup remains. A native-hint model failed before the change and passes after it. StrictMode setup/cleanup coverage also passes. |
| Actual browser/device acceptance is incomplete.                                                                                  | P2 verification gap, S03/S04/SC-003, T009/T023.                      | Remains open and explicitly disclosed; keep the PR draft.                                                                                                                                                                                       |

Independent follow-up: **0 remaining code findings; 1 remaining verification finding**. Targeted artwork/motion tests pass 16/16. No further authentication regression, scope creep or unjustified abstraction was identified.

Evidence limits: Chromium reached native readiness despite `preload=none` in the review probe. Safari acquisition produced no UI state and was interrupted; there is no observed Safari failure or pass. The regression fixture models a browser honoring the hint, not Safari itself. [WHATWG media guidance](https://html.spec.whatwg.org/multipage/media.html) treats preload as a hint; [Apple's preload documentation](https://developer.apple.com/documentation/webkitjs/htmlmediaelement/1633059-preload) describes `none` as suggesting no server interaction. The temporary local probe server was stopped.

T009/T023 still require Safari/Firefox codec/color/handoff, real-device and reduced-motion/no-JavaScript behavior, throttled-media visuals, and classic/overlay scrollbar checks. DOM tests do not establish those visual properties. Hosted CI and code-owner approval remain separate gates; agent review does not impersonate a maintainer's approval.

## Delivery compliance

The failed policy run mixed develop's pnpm command with this older branch's npm setup because the policy job checks out the PR head. Merging current develop aligns the workflow, setup and pinned lockfile without changing or bypassing CI policy. The merged branch uses pnpm 11.1.1; a clean frozen install completed. An initial reused npm dependency folder had a non-executable CLI target; recreating the local dependency folder resolved it without dependency/lockfile edits.

The PR description also omitted the exact `Spec:` and `Evidence:` fields parsed by `scripts/pr-policy.mjs`. The actual metadata failed policy before correction. A candidate body with those exact fields passed the real policy script with current develop ancestry. After publication, the actual remote metadata also passes: base `810974c`, head `676bc15`, still draft. Hosted policy, quality, integration and mobile-js pass in [CI run 37920285450](https://github.com/weaves-app/weave/actions/runs/37920285450); the remaining jobs were in progress when this publication record was written. Final required CI and code-owner approval remain outstanding gates.

## Final local verification

`pnpm run verify` passed: policy36/36, web73/73, API2/2, plus all builds, lint/format/types/architecture. Targeted artwork/motion16/16. Database/HTTP3/3. Full logs retain actual warnings, including a React async-act warning; no claim of warning-free tests is made.

## Evidence

- [Final repository checks](evidence/review/final-verify.txt), [database/HTTP checks](evidence/review/final-integration.txt).
- [Archived source-size RED](evidence/review/source-size-red.json), [current authored-file audit](evidence/review/source-size-green.json).
- [500/501-line rule RED](evidence/review/line-rule-red.txt), [GREEN](evidence/review/line-rule-green.txt).
- [Timing/geometry equivalence](evidence/review/timing-equivalence.txt).
- [Readiness RED](evidence/review/readiness-red.txt), [16-test GREEN including StrictMode](evidence/review/readiness-green.txt).
- [Remote package-manager failure](evidence/review/remote-policy-failure.txt), [metadata RED](evidence/review/pr-policy-red.txt), [candidate metadata GREEN](evidence/review/pr-policy-green.txt), [published metadata GREEN](evidence/review/pr-policy-actual-green.txt).

Outcome: Standards — 2 original findings resolved, none remaining. Spec — 1 code concern resolved, 1 verification gap remains (the worst remaining issue in this axis). No additional code correction is required by either reviewer; this is not merge approval.
