# Woven authentication artwork

WEA-24 / S01–S04, S06–S08. Approved all-sides entrance: 1 second, then the original woven composition. Presentation integration lives in `apps/web/src/features/auth/presentation/artwork/`. No runtime animation dependency. AuthShell defaults to still; AuthView opts sign-in in and keeps the shell mounted during Clerk/form updates.

## Assets and maintenance

| Asset         | Dimensions                    | Bytes  | Purpose                                               |
| ------------- | ----------------------------- | ------ | ----------------------------------------------------- |
| intro.v2.mp4  | 1600 × 1600, 60 fps, 1 second | 178318 | Current H.264 intro, no audio, faststart; 2× overscan |
| still.v1.webp | 1254 × 1254                   | 137740 | Transparent optimized approved image                  |

Retired public assets remain recoverable at immutable Git references: [original bag](https://github.com/weaves-app/weave/blob/2c3d6a83c664033ddef6fbe642d0d108c5118ee1/apps/web/public/brand/weave-bag-render.png) and [v1 intro](https://github.com/weaves-app/weave/blob/2c3d6a83c664033ddef6fbe642d0d108c5118ee1/apps/web/public/brand/woven/intro.v1.mp4). They are no longer deployed.

All current assets live in `apps/web/public/brand/woven/`. Keep image geometry and artwork centered: the video’s final image is 800 × 800 at (400, 400), so the video is displayed at twice the still’s dimensions. No runtime mesh or CSS path geometry. The hero background is baked as the existing `authTokens.colors.hero` value `#D9C9B2`; changing that token requires re-export. The still retains its source alpha. Lossy encoding changes individual pixels; it does not redraw the approved composition.

The [current v2.1 design source archive](woven-design-source.v2.1.zip) contains the approved modular authoring/export code, comparison page, original PNG, frame checker, Blender inspection script and vendored Three.js 0.186.1 with its MIT license. The original [v1 archive](https://github.com/weaves-app/weave/blob/0bf8076ca698bf9c882e9a47a25c2b3b47a6caf9/docs/design/woven-design-source.v1.zip) and [v2 archive](https://github.com/weaves-app/weave/blob/0bf8076ca698bf9c882e9a47a25c2b3b47a6caf9/docs/design/woven-design-source.v2.zip) remain recoverable at immutable Git references. Superseded source archives are removed from the current tree; v2.1 keeps one authoritative timing definition per ribbon, and its authored files stay within 500 lines. Deployed media is unchanged. Figtree/OFL is included. It is design tooling, outside all application bundles, and is not a template for production TypeScript. No browser runtime imports it. Keep later motion revisions separately versioned instead of editing deployed media in place. Generated master frames, geometry JSON and Blender scenes are excluded from the archive and can be regenerated through its export controls. Blender inspects sampled geometry; Three.js renders this video. Neither tool ships in the app.

## Reproduce the media

1. Unzip the design source into a temporary directory; serve it on localhost (for example `python3 -m http.server 4318 --bind 127.0.0.1`). Open `woven-refinement-v2/index.html` in a WebGL-capable browser; `review.html` in that directory compares the encoded clips.
2. Click **Export 60 master frames**. Extract the downloaded `woven-v2-master-1600-60fps.zip` into `master-frames/`. Renderer resolution is 1600 square, pixel ratio 1. Samples use t=i×1000/60 ms; all samples follow this regular cadence, with the original image held for the final 100 ms. Composite over `#D9C9B2`.
3. Encode with FFmpeg 7.1 (libx264):

```sh
ffmpeg -framerate 60 -i master-frames/frame-%03d.png -frames:v 60 \
  -vf 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,colorspace=iall=bt709:itrc=srgb:all=bt709:format=yuv420p' \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -colorspace bt709 -color_trc bt709 -color_primaries bt709 -color_range tv \
  -movflags +faststart -an intro.v2.mp4
```

4. Run `python3 woven-refinement-v2/check_frames.py master-frames` with Pillow/NumPy installed. The final-hold artwork-region mean change must stay below 0.75 code values. Preserve the deployed still byte-for-byte; it was generated with Pillow using `quality=80, method=6`, retaining the 1254-square alpha image. Export tools are not application dependencies.
5. Inspect all frames and final handoff in real browsers. Explicitly convert sRGB pixel values into BT.709 transfer before encoding; tagging alone produced a visible rectangle in the browser. The final conversion matched the hero exactly in the in-app browser screenshot: both sampled as (214, 202, 180) after the display profile conversion. Safari/Firefox comparison remains unverified; the attempted Safari check was interrupted by active browser use.

SHA-256 source PNG: `0aac66dc0782508a7b7304be308c7da087714182f2ae994e1aee5eae4eddeb4f`.

SHA-256 previous v1 MP4: `414e20c90587dce702abba7b179a1085c20a747680820517c82d9dec070f213c`.

SHA-256 current v2 MP4: `9cb78bb965dc1b646414dba2c67775e92fdb336ee6c4b74b40c45893094b8bd3`.

SHA-256 WebP: `f77f7d466a5b1400f3e1196952f7b2d0df7f3ce293ebd9e3502f07247df77393`.

## Refined motion

The reviewed v2 brings the orange thread in earlier along its existing route, develops the shadow during arrival and aligns the 1254-square source with the historical 1280-square trace coordinates. An opaque final composite avoids the brightness dip from overlapping transparent fades. The final 100 ms holds the approved image. The clip is 8419 bytes larger than v1; the production change is a versioned media URL, with no added JavaScript or package dependency. A separate four-line authentication-scoped CSS rule reserves scrollbar space so form readiness cannot move the artwork horizontally.

## Lifecycle and tests

The hook assigns a video source only on an eligible first mount: visible document, at least 681 px, normal motion. After eligibility, the hook sets `preload=auto` before assigning the source, so browsers that honor preload hints can buffer enough data for readiness. Initial/ineligible markup keeps `preload=none` and no source. Media has 500 ms to become ready, then a 1250 ms watchdog around its one-second playback. Failure, end, changing preferences, hiding the page or leaving desktop settles permanently on the still. Unmount removes listeners/timers and releases media. Pending server markup reserves dimensions; a noscript rule restores the still without JavaScript.

Behavior tests use native media events and public form interactions. `test/css-modules.ts` is a small Node test adapter only; browser styles are compiled by Next. Authentication flow tests remain separate. See [scenario specification](../../specs/003-woven-login-artwork/spec.md) and [delivery evidence](../../specs/003-woven-login-artwork/evidence.md) for actual checks and limitations.
