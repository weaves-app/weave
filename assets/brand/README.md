# Weave brand assets

The owner supplied these masters in `Downloads/kit` on 2026-10-08. Follow [guidelines.md](guidelines.md). The original SVGs contain outlined wordmarks; do not recreate them as text. Full-colour lockups belong on cream or white, and reversed lockups belong on olive. Clear space is at least one 48-unit band, proportional to the rendered 702.086-unit horizontal lockup. Terracotta is an accent, not small text.

The original Figtree variable font spans weights 300–900. [OFL.txt](OFL.txt) accompanies the font and its platform derivatives. Web uses `next/font/local`; native uses Regular (400), SemiBold (600), and Bold (700) instances generated with FontTools 4.61.1 `instantiateVariableFont(..., {'wght': weight}, updateFontNames=True)`. Their PostScript names match the shared font tokens. Android bundles these in `assets/fonts`; iOS copies the mobile font assets through its Resources phase and registers them in `UIAppFonts`.

Platform icon and logo derivatives use Pillow 12.0.0 LANCZOS resizing, with the masters' aspect ratios retained:

- Native horizontal logo: 1000 × 319 transparent PNG. iOS launch screen and React Native use aspect-preserving rendering.
- Android legacy launcher icons: 48, 72, 96, 144, 192 pixels. Use the square opaque app icon, allowing the OS to mask it.
- Android adaptive launcher: original app-icon SVG paths and colours, over an olive background. The SVG's group scale remains 0.66; its translation becomes 107.52 on a centred 384-unit viewport, leaving the mark inside the circular safe zone. No corners are baked into the foreground.
- iOS app icon: opaque RGB PNG derivatives for all committed iPhone/iPad slots and the 1024-pixel store slot.
- Web favicon, Apple touch and manifest icons: unchanged files from the supplied kit, in the Next App Router metadata files and `public` directory.

Use the masters for future exports. Do not edit generated artwork to change the mark's colours, gaps, rows or proportions. Rounded kit artwork is not used for OS launcher/store icons.

The native Google sign-in action uses the official coloured G PNG from [Google Identity](https://developers.google.com/static/identity/images/g-logo.png), stored at `apps/mobile/assets/brand/google-g.png`. Follow the [Google sign-in branding guidance](https://developers.google.com/identity/branding-guidelines) for future changes. The asset belongs to Google and is used only for the Google sign-in action, with a white outlined button and the explicit “Continue with Google” label; it is not a Weave brand derivative.

The landscape-tablet authentication hero at `apps/mobile/assets/brand/weave-bag-hero.png` was generated on2026-10-09 with the image-generation tool, using the owner-supplied web Login screenshot as a visual reference (T054). It depicts an olive shopping bag on linen; it is decorative campaign artwork, not a replacement for the supplied logo master. The interface continues to render the original kit lockup.
