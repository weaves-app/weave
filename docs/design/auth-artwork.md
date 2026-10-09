# Woven authentication artwork

WEA-24 / S01–S04. Approved all-sides entrance: 1 second, then the original woven composition. Presentation integration lives in `apps/web/src/features/auth/presentation/artwork/`. No runtime animation dependency. AuthShell defaults to still; AuthView opts sign-in in and keeps the shell mounted during Clerk/form updates.

## Assets and maintenance

| Asset         | Dimensions                    | Bytes  | Purpose                                 |
| ------------- | ----------------------------- | ------ | --------------------------------------- |
| intro.v1.mp4  | 1600 × 1600, 60 fps, 1 second | 169899 | H.264, no audio, faststart; 2× overscan |
| still.v1.webp | 1280 × 1280                   | 137740 | Transparent optimized approved image    |

Both assets live in `apps/web/public/brand/woven/`. Keep image geometry and artwork centered: the video’s final image is 800 × 800 at (400, 400), so the video is displayed at twice the still’s dimensions. No runtime mesh or CSS path geometry. The hero background is baked as the existing `authTokens.colors.hero` value `#D9C9B2`; changing that token requires re-export. The still retains its source alpha. Lossy encoding changes individual pixels; it does not redraw the approved composition.

The [design source archive](woven-design-source.v1.zip) is an immutable snapshot of the approved prototype, exporter, original PNG and vendored Three.js 0.186.1 with its MIT license. Figtree/OFL is included. It is design tooling, outside all application bundles, and is not a template for production TypeScript. No browser runtime imports it. Keep later motion revisions separately versioned instead of editing deployed v1 media in place.

## Reproduce the media

1. Unzip the design source into a temporary directory; serve it on localhost (for example `python3 -m http.server 4318 --bind 127.0.0.1`). Open `woven-export.html` in a WebGL-capable browser.
2. Click **Export 60 master frames**. Extract the downloaded `woven-master-1600-60fps.zip` into `master-frames/`. Renderer resolution is 1600 square, pixel ratio 1. Samples use t=i×1000/60 ms; the final sample explicitly uses t=1000 ms and the original image. Composite over `#D9C9B2`.
3. Encode with FFmpeg 7.1 (libx264):

```sh
ffmpeg -framerate 60 -i master-frames/frame-%03d.png -frames:v 60 \
  -vf 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,colorspace=iall=bt709:itrc=srgb:all=bt709:format=yuv420p' \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -colorspace bt709 -color_trc bt709 -color_primaries bt709 -color_range tv \
  -movflags +faststart -an intro.v1.mp4
```

4. With Pillow, save `assets/woven-paths.png` to WebP using `quality=80, method=6`; preserve 1280 square and alpha. Export tools are not application dependencies.
5. Inspect all frames and final handoff in real browsers. Explicitly convert sRGB pixel values into BT.709 transfer before encoding; tagging alone produced a visible rectangle in the browser. The final conversion matched the hero exactly in the in-app browser screenshot: both sampled as (214, 202, 180) after the display profile conversion. Safari/Firefox comparison remains unverified; the attempted Safari check was interrupted by active browser use.

SHA-256 source PNG: `0aac66dc0782508a7b7304be308c7da087714182f2ae994e1aee5eae4eddeb4f`.

SHA-256 MP4: `414e20c90587dce702abba7b179a1085c20a747680820517c82d9dec070f213c`.

SHA-256 WebP: `f77f7d466a5b1400f3e1196952f7b2d0df7f3ce293ebd9e3502f07247df77393`.

## Lifecycle and tests

The hook assigns a video source only on an eligible first mount: visible document, at least 681 px, normal motion. Media has 500 ms to become ready, then a 1250 ms watchdog around its one-second playback. Failure, end, changing preferences, hiding the page or leaving desktop settles permanently on the still. Unmount removes listeners/timers and releases media. Pending server markup reserves dimensions; a noscript rule restores the still without JavaScript.

Behavior tests use native media events and public form interactions. `test/css-modules.ts` is a small Node test adapter only; browser styles are compiled by Next. Authentication flow tests remain separate. See [scenario specification](../../specs/003-woven-login-artwork/spec.md) and [delivery evidence](../../specs/003-woven-login-artwork/evidence.md) for actual checks and limitations.
