# T054 responsive authentication layout

Owner request (2026-10-09): run latest code on iPhone/iPad, top-align mobile, retain centered portrait tablets, and use the shared web reference for landscape tablets. S15/S16/S19 remain the public behavior contracts.

`AuthLayout` uses the shorter window dimension (600-point tablet threshold), with the split limited to landscape widths of at least960 points. This prevents a rotated phone from accidentally gaining tablet artwork. The shared form subtree preserves email and partial code across dimensions changes. Portrait tablets use the existing480×740-point bounded frame; phones keep a full-size top-aligned frame. The generated decorative hero is documented in `assets/brand/README.md`; original kit logos remain the interface source.

## Automated regression

- `red.log`: actual new rotation test fails because the requested landscape tagline is missing;19 existing Login tests pass.
- `green.log`: all94 mobile tests/13 suites pass, including email/code preservation through landscape tablet → portrait tablet → landscape tablet → rotated phone, with one code request.
- Production captures: `iphone.png`, `ipad-portrait.png`, `ipad-landscape.png`.
- Native fixture capture: `ipad-landscape-otp.png`; Login/OTP share logo and heading origin within the right pane.

Native presentation runs use the real App/controller and a deterministic gateway with fictional `preview@example.com`. Complete codes return a delayed rejection, never an authenticated account. They verify layout, scrolling and interactions, not real-provider sign-in. Each runner restores production index.ts and any text-size preferences in finally, then relaunches the app.

Full provider, storage observability, screen-reader/lifecycle, minimum-iOS17 and remote CI acceptance remain tracked by the existing open tasks.

## Bottom safe-area correction

Owner pointed out the cream strip below the landscape artwork. The former outer SafeAreaView inset the entire composition. The new outer View paints artwork to the edges; a separate SafeAreaView protects the form, and the artwork copy retains left/bottom safe-area padding over the linen background. `inset-red.log` records one real regression failure (tagline incorrectly within the form safe area,19 prior tests pass). `final-green.log` records all94 tests passing after correction.

The initial enlarged-text harness swiped from the screen center, outside the form pane, and falsely treated an offscreen input as visible. Its failure is retained in `ipad-large-initial.log`; a subsequent overly long right-pane swipe overshot the method selector. Neither is claimed as a production behavior RED. The adjusted flow selects the visible method first and then scrolls within the form pane.
