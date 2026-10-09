# S13: Mobile logo alignment

Date: 2026-10-09. Task: T036. Baseline: c6ffa9f. Check: production Chromium DOM geometry on `/sign-in`; manual browser check is appropriate for this reversible CSS-only presentation change.

## RED before implementation

At 553 x 977: logo x=79, width=125; form x=79, width=380. Logo center was 127.5 px left of form center. At 681 px the desktop logo was left-aligned with the form (both x=427.59375, logo width=133, bottom margin=42).

## GREEN after implementation

The one-line margin change was tested in a fresh production build with its public and static assets copied to an isolated runtime.

| Viewport width | Logo x    | Logo width | Form x    | Form width  | Result                           |
| -------------- | --------- | ---------- | --------- | ----------- | -------------------------------- |
| 375            | 117.5     | 125        | 28        | 304         | Centers identical                |
| 553            | 206.5     | 125        | 79        | 380         | Centers identical                |
| 680            | 270       | 125        | 142.5     | 380         | Centers identical                |
| 681            | 427.59375 | 133        | 427.59375 | 210.3984375 | Desktop left alignment unchanged |

At 553 px the heading remains aligned with the form's left edge and the logo bottom margin remains 40 px. Screenshot inspection confirmed the centered logo. Temporary viewport overrides were reset. No authentication state or animation behavior changed.

## Verification and refactor

- `pnpm run verify`: passed (lint, formatting, typecheck, tests and production builds).
- `pnpm run test:integration`: 3/3 passed against local PostgreSQL.
- `node scripts/check-sdd.mjs`: passed.
- `git diff --check`: passed.
- `globals.css` remains 484 physical lines, below the 500-line limit. The existing media query and class are reused; no extra abstraction, stylesheet or dependency is needed.

These are local results. Existing T009/T023/T035 browser verification and required CI/code-owner gates remain open; this check does not claim to complete them.
