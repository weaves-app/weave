# WEA-24 verification evidence

Scope: [spec.md](spec.md), branch `feat/WEA-24/woven-login-artwork`, develop base `f041c95`. Publication checks run 2026-10-09. Production transfer matches the approved local implementation byte-for-byte across its eight source/media files. No dependency, lockfile, authentication policy, native app or WEA-10 spec changes are included.

## Scenario traceability

| Scenario | Requirement                | Public evidence                                                                                                                                                                         |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01      | FR-001/002, SC-001/002     | One-shot video, original still, usable input, stable media element across Clerk readiness/callback changes; historical browser playback and layout samples.                             |
| S02      | FR-003, SC-003             | Rejected autoplay, media error, readiness expiry, playback watchdog and late-event suppression.                                                                                         |
| S03      | FR-003/004, SC-003         | Shared/signup defaults, reduced/mobile/hidden first mounts, changed eligibility and unmount resource cleanup.                                                                           |
| S04      | FR-001/004/005, SC-002/003 | Static shared artwork and no pointer motion; decorative semantics in component; historical real-browser geometry/form inspection. No-JavaScript and broader browser matrix remain T009. |

## RED → GREEN and provenance

The original implementation was built and tested in this conversation before a dedicated ticket was requested. Its original WEA-10 S19/S20/S21/S22 labels map to WEA-24 S01/S02/S03/S04. [Original behavioral RED](evidence/woven-red.txt) and [original GREEN](evidence/woven-green.txt) are copied byte-for-byte. Initial wrong-TSX-configuration and CSS-import failures from that session are not behavioral RED evidence.

On the fresh WEA-24 branch, copied tests were relabeled and run **before** transferring source/assets. [Current-develop regression RED](evidence/base-regression-red.txt): 14 failures for missing video or the old bag image. Then source/media were transferred. [GREEN](evidence/green.txt): 14/14 pass. This is an additional base-regression check, not a claim that the implementation was freshly invented after those tests. One initial command used root-relative paths incorrectly; that command is excluded from behavioral evidence.

The reviewed refactor retains a single AuthShell through loading/form branches, isolates playback in the presentation hook and removes 17 obsolete global CSS lines. Production files remain 42-line component, 117-line hook and 47-line CSS Module. The test-only CSS loader adds no runtime dependency. Auth contracts, palette and typography are unchanged.

## Fresh publication checks

- [Full `npm run verify`](evidence/verify.txt): exit 0; lint/architecture, format, types, tests and production builds pass. Web tests 71/71, policy 32/32, API 2/2. Turbo reused unchanged task caches; the web test and production build ran on this branch.
- [Database/HTTP integration](evidence/integration.txt): exit 0, 3/3 pass against the documented local PostgreSQL environment. Includes unavailable-auth denial and database-outage behavior. No real account credentials were submitted.
- [Initial verify attempt](evidence/verify-format-initial.txt) stopped only because the generated, local `.specify/feature.json` was not formatted. Formatting it and rerunning produced the passing result above; this is not behavioral RED.
- Authored source/documentation passes `git diff --cached --check` with raw terminal logs excluded; captured logs retain their original trailing whitespace for provenance. Author/committer resolve to the pinned personal identity `cvvishnuu <cvishnuu01@gmail.com>`; scoped GitHub API identity verified as `cvvishnuu` before publication.
- The new checkout's offline dependency install completed package extraction but its prepare hook initially lacked permission to update shared Git config. The existing prepare hook was rerun with permission and passed; no hook was bypassed and the lockfile is unchanged.

Commands used the documented local DATABASE_URL for Prisma generation and integration. See [quickstart](quickstart.md). Hook checks run again on commit/push; remote CI and code-owner review are separate gates and are not claimed as completed here.

## Preserved browser and asset evidence

These are **historical observations of the byte-identical approved implementation**, not newly executed browser checks on WEA-24. A production build at localhost:4312 was inspected in the Codex in-app browser. [Playback samples](evidence/woven-browser-playback.json) show native H.264 playing at 22 ms and the terminal still at 1044 ms; sample timing is not an exact event-duration measurement. FFmpeg independently decoded 60 frames / 1.000 seconds with no audio in the original session.

The initial integration moved artwork 15.0625 px when Clerk's form appeared: [layout RED](evidence/woven-layout-red.json). Viewport anchoring corrected this: [layout GREEN](evidence/woven-layout-green.json) records identical x=238, y=120, width=420, height=420 before/after at 1280×720. Input editing/password visibility did not replay media. No credentials were submitted.

A first video candidate showed a lighter rectangle. Explicit sRGB-to-BT.709 pixel conversion corrected it; sampled hero/video background matched at RGB (214,202,180) after display-profile conversion. The final composition and all-side entrance were visually inspected. [Design documentation](../../docs/design/auth-artwork.md) contains export steps, source archive/licenses and media hashes. SHA-256 matches were rechecked on WEA-24.

![Approved integrated login](evidence/woven-login.png)

## Sizes and limitations

The shipped MP4 is 169899 bytes (165.9 KiB); transparent WebP is 137740 bytes (134.5 KiB). No runtime animation package, WebGL renderer, frame loop, global store or storage write is introduced. The archived design source is outside the application graph. A prior isolated authored-entry measurement was 2127 minified bytes / 996 gzip with React/Next Image/CSS external; this is **not** a production route-bundle delta.

T009 remains open: Safari/Firefox codec/color/handoff, real mobile/reduced-motion/no-JavaScript rendering and actual throttled-network inspection. The original browser viewport API did not change the measured viewport, so that attempt is not counted as mobile verification. The Safari attempt was interrupted by active browser use. DOM tests cover eligibility/failure events but do not prove visual behavior across browsers. Remote CI/code-owner review must still pass. Open a draft PR; do not claim deployment or merge readiness.

## Publication hook regression: S05

The first normal push was rejected by existing S21 policy tests: [actual hook RED](evidence/push-hook-red.txt), 2 failures / 30 passes. Git's inherited repository variables caused a test's temporary-repository operations to target the real checkout. This also wrote the fixture GitHub username into the caller configuration; the previously verified `cvvishnuu` setting was restored, and all personal identity settings were checked afterward.

The fix adds a `before` hook only in `tests/policy/git-config.test.mjs`, clearing repository-local variable names reported by `git rev-parse --local-env-vars` inside the test file's isolated Node process. Production identity policy and Git hooks are unchanged. [GREEN with inherited GIT_DIR](evidence/push-hook-fixture-green.txt): 2/2 pass; parent personal Git settings remain unchanged. [Final full verification](evidence/final-verify.txt): exit 0 after the fixture correction. The unchanged artwork and integration behavior retain the earlier passing database/HTTP evidence. This is required publication-gate maintenance, not a new application feature.

## 2026-10-09: Local motion refinement preview (S06–S08)

Blender 5.2.2 LTS is installed and usable. First run inside the sandbox crashed in Metal backend initialization before Python; rerunning the same local script with approved graphics access succeeded. No Blender add-on, application dependency or system preference was added.

Actual baseline RED is in `evidence/motion-refinement/baseline-red.txt`: the decoded v1 clip's final frame changes the artwork-region mean by 9.3886 code values. Inspection found a 1254-square source being drawn unscaled into a 1280-square layer canvas, then scaled differently for the final poster. The original final layer fade also fell between the last regular export sample and its special-cased final poster. Separate transparent layer fades reduced combined opacity and caused a brightness pulse. These are observed causes, not a claim that every visible motion artifact is solved.

The candidate preserves the original guides/entrances, advances the orange start from 321 to 132 ms and extends its travel, keeps its backing in front at Z=64, develops the source shadow across the arrival, normalizes the scene to the actual image dimensions and blends opaque complete frames into the approved reference. Its last 100 ms holds unchanged. The authoring source is split into small modules outside the app. All 60 frame hashes were unchanged by that refactor.

`candidate-green.txt` records zero difference across the final hold frames. The final pre-hold-to-hold transition also measured zero mean difference at 1600-square export. This numerical check does not establish subjective fluidity. The refined encoded MP4 is 178318 bytes, 1600 square, H.264 BT.709, 60 fps, 1.000 seconds, no audio; SHA-256 `9cb78bb965dc1b646414dba2c67775e92fdb336ee6c4b74b40c45893094b8bd3`. Actual in-app browser decoding reported duration 1, no media error and working normal/0.2× playback and version switching. Thirteen existing artwork integration tests passed (`integration-regression.txt`). Application source, dependencies and v1 media are unchanged.

Blender imported seven ribbon meshes sampled at 0/200/400/600/750/850/900/1000 ms. `blender-inspection.json` records finite coordinates, mesh bounds and shadow progression (0.035 at 200 ms, 0.465 at 400 ms, 0.940 at 600 ms). It is a geometry study, not a Blender-rendered replacement sculpture or a physical weaving simulation.

Preview and source location: `/Users/vishnu/.codex/visualizations/2026/10/08/01a11baa-fba4-7c80-8b79-5f43df52b2e3/woven-refinement-v2/`. `review.html` compares the old and refined encoded clips; `index.html` exposes the export/scrub/reduced-motion authoring controls; `blender/woven-geometry-study.blend` retains the inspection scene. User visual review is pending, as is the existing T009 browser/device matrix. No replacement production media or PR update is claimed in this preview slice.

## Approved v2 production integration

The user accepted the v2 preview and explicitly requested integration, push and PR. The application now requests the identical approved clip as `intro.v2.mp4`; its SHA-256 is unchanged from the preview. The original v1 clip and still retain their recorded hashes. The new clip is 178318 bytes (8419 bytes larger than v1), decodes as H.264 BT.709 at 1600 square, 60 frames / 1.000 seconds, and contains no audio: [actual media probe](evidence/motion-refinement/media-probe.txt). No dependency or lockfile changes.

[Production selection RED](evidence/motion-refinement/production-red.txt) records the existing public S01 playback test failing because the page still selected v1 when v2 was required; twelve other tests passed. After copying the clip and changing the URL, [GREEN](evidence/motion-refinement/production-green.txt) records all fourteen artwork/motion tests passing. This checks deployment selection; the earlier frame RED/GREEN and accepted preview establish the motion change. It does not claim a new URL assertion proves fluidity. The v2 source archive includes the original image, modular authoring/export scripts, comparison videos, frame checker, Blender inspector and licenses; generated large frames/scenes are reproducible and excluded.

Fresh production-browser inspection found a classic-scrollbar layout boundary: at 1280 × 720, Clerk readiness increased document height and shifted artwork x from 238 to 232.75. [Actual layout RED](evidence/motion-refinement/layout-red.json) preceded the four-line `html:has(.auth-shell)` stable-gutter rule. [GREEN](evidence/motion-refinement/layout-green.json) shows identical x/y/width/height before and after the form appears; normal page scrolling remains. This preserves S04/SC-002 and adds no animation JavaScript.

[Production playback](evidence/motion-refinement/playback.json) observed v2 playing at 96.537 ms, duration 1 and no media error, then the released video source and terminal still. Email editing and password-visibility toggling did not replay the media; test text was cleared without submitting credentials. [Current production screenshot](evidence/motion-refinement/production.png).

Final [repository verification](evidence/motion-refinement/verify-layout.txt) and [database/HTTP integration](evidence/motion-refinement/integration-layout.txt) both exit 0. Verification covers lint/architecture, format, types, tests and production builds; artwork/motion 14/14, web 71/71, policy 32/32, API 2/2, database/HTTP 3/3. Unchanged Turbo tasks may use cached results; the changed web build ran. Earlier verification attempts stopped on missing local DATABASE_URL and generated Blender JSON formatting, then were corrected; those logs are retained and are not behavioral RED.

User approval resolves preview acceptance. T009 still covers unrun Safari/Firefox, real-device/reduced-motion/no-JavaScript and throttled-media visual checks. New scrollbar behavior also requires classic/overlay scrollbar checks across target browsers. Keep the existing PR draft until these checks and required review are complete.
