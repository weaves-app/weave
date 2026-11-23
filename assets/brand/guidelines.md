# Weave — Logo Guidelines

## 1. The logo

**Idea:** cloth and a spreadsheet are the same grid. Two terracotta threads (the warp) weave over and under three olive rows (the weft). It shows fashion and ERP in one shape.

**Versions**

| Version              | Use it for                                      | File                       |
| -------------------- | ----------------------------------------------- | -------------------------- |
| Horizontal (primary) | Website header, app sidebar, documents, decks   | `svg/weave-horizontal.svg` |
| Stacked              | Square spaces: social posts, packaging, signage | `svg/weave-stacked.svg`    |
| Symbol only          | App icon, favicon, avatars, small spaces        | `svg/weave-symbol.svg`     |
| Wordmark only        | Places where the symbol is already nearby       | `svg/weave-wordmark.svg`   |

Every version has a `-reversed` file for dark backgrounds, plus `-black`, `-white` and `-mono-2e3a2f` one-colour files.

**Construction:** the logo uses only rectangles. Each band is 48 units thick on a 256-unit grid. At a crossing the thread underneath stops 10 units short, so the over-and-under stays visible.

## 2. Clear space

Leave a clear zone of **one band** on every side of the logo, where one band is the height of one olive row. The zone grows and shrinks with the logo, so never use a fixed distance.

## 3. Minimum size

| Version    | Screen     | Print      |
| ---------- | ---------- | ---------- |
| Horizontal | 96 px wide | 25 mm wide |
| Stacked    | 64 px wide | 18 mm wide |
| Symbol     | 16 px      | 6 mm       |

Below 32 px, use the **small-size version** (`svg/weave-symbol-small*.svg`, or the favicon files). Its gaps are wider so the weave still shows.

## 4. Colour

| Name       | Role                                | HEX     | RGB           | CMYK (starting point) |
| ---------- | ----------------------------------- | ------- | ------------- | --------------------- |
| Olive      | Weft rows, wordmark                 | #2E3A2F | 46, 58, 47    | 21, 0, 19, 77         |
| Terracotta | Warp threads                        | #C96F4F | 201, 111, 79  | 0, 45, 61, 21         |
| Linen      | Weft rows on dark                   | #D9C9B2 | 217, 201, 178 | 0, 7, 18, 15          |
| Cream      | Background, wordmark on dark        | #F8F6EE | 248, 246, 238 | 0, 1, 4, 3            |
| Sage       | Supporting colour (not in the logo) | #6B7F58 | 107, 127, 88  | 16, 0, 31, 50         |

The CMYK values are converted automatically from HEX. Before the first print job, have the printer proof them and match Pantone spot colours. No Pantone values have been picked yet.

**Approved logo and background pairs**

| Background                                     | Logo                                                        |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Cream #F8F6EE or white                         | Full colour: olive rows, terracotta threads, olive wordmark |
| Olive #2E3A2F                                  | Reversed: linen rows, terracotta threads, cream wordmark    |
| Photos or busy backgrounds                     | One colour (white or black) on a calm area of the image     |
| One-colour printing (embroidery, foil, stamps) | `-black`, `-white` or `-mono-2e3a2f`                        |

**Contrast (WCAG):**

| Pair                | Ratio    | Result                                  |
| ------------------- | -------- | --------------------------------------- |
| Olive on cream      | 11.0 : 1 | Passes for text                         |
| Linen on olive      | 7.3 : 1  | Passes                                  |
| Terracotta on cream | 3.3 : 1  | Passes the 3 : 1 rule for graphics only |

Use terracotta for the threads and for accents. Don't use it for small text.

## 5. Don'ts

- Don't swap the colours. Threads are always terracotta, and rows are olive (on light) or linen (on dark).
- Don't put the full-colour logo on terracotta, sage or a busy photo. Use a one-colour version instead.
- Don't stretch, rotate, outline, add shadows or add gradients.
- Don't fill in the gaps at the crossings. The gaps are what make it a weave.
- Don't add, remove or rearrange rows or threads in the logo. Patterns are fine, as described in section 6.
- Don't retype the wordmark. Always use the supplied files.

## 6. Pattern

You can repeat the weave as a background pattern for packaging, swing tags, slides and the app's empty states, using the same band size, gap and colours. Keep the logo itself separate from the pattern, with full clear space.

## 7. Type

The wordmark is set in **Figtree** at weight 620 with tracking of −12 units, and converted to outlines. Figtree uses the SIL Open Font License (`src/OFL.txt`), which allows logo use. Figtree also works as the brand's interface and marketing font.

## 8. Files

```
svg/     vector masters (use these whenever you can)
png/     transparent PNGs: symbol 1024 px, lockups at 2000 px wide
web/     favicon.ico, favicon.svg, apple-touch-icon, PWA icons, site.webmanifest, head-snippet.html
board/   presentation (weave-board.html) and slides/*.png
src/     build script, font, licence, board spec
```

App stores: use `png/weave-app-icon.png`. It is square and full-bleed with no transparency, and the operating system rounds the corners itself.

## 9. Before launch

- **Trademark:** "Weave" is already used by Weave Communications (NYSE: WEAV, a US software company). Get a professional trademark search for both the name and the mark in your markets before launch.
- **Print:** no print-ready PDF or EPS masters have been made yet. Export them from the SVGs in Illustrator or Inkscape when a printer asks.
