# Mobile constants audit — 2026-10-09

Scope: authored mobile TypeScript/TSX application, domain, native adapter, component, navigation and recovery source, plus App.tsx/index.ts. Native Swift/Kotlin implementation and generated/vendor code were not refactored.

- Initial typed lint scan found93 inline option literals, including the reported submit stage. Runtime domain stages/methods/result kinds, wire commands, event names, platform/UI options and timing values now reuse grouped constants.
- `mobile-audit-red.txt`:18 expected policy failures,14 allowed cases passed. A preliminary test-harness tsconfigRootDir error was corrected before this retained behavioral RED.
- `mobile-audit-edge-red.txt`:6 alias/mixed boolean-union failures before correction.
- `mobile-audit-rule-green.txt`:48 typed rule cases pass through mobile/root lint configurations.
- `mobile-audit-policy.txt`:279 policy tests pass, including198 existing comparison/fallback/navigation cases.
- `mobile-audit-tests.txt`:94 mobile tests pass. Renderer privacy probe also passed; Jest uses `--watchman=false` because sandbox access to the Watchman socket is unavailable.
- `mobile-audit-web-tests.txt` / `mobile-audit-api-tests.txt`:58 web and2 API tests pass.
- `mobile-audit-root-lint.txt` / `mobile-audit-app-lint.txt`:successful lint. Mobile typecheck passed after explicitly widening mutable timeout remainder to number.
- `mobile-audit-{android,ios}-bundle.txt`:both production Metro bundles pass. Environment NO_COLOR/FORCE_COLOR warnings remain harmless. Native builds/provider acceptance/database integration were not repeated.

The AST inventory was reviewed after refactoring. Remaining literals are copy/accessibility labels, test IDs, empty/formatting strings, structural property names, typeof checks, exported constant definitions and Symbol descriptions. React Native's module registry name remains literal: installed codegen reads the first argument's literal value in parsers/parsers-commons.js. Independent test fixtures/assertions remain literal to catch accidental wire-value changes.

TypeScript6.0.3 was declared as an ESLint-config peer; offline lockfile update did not change package versions. The sandbox's automatic install attempt could not synchronize dependencies. An authorized offline frozen install outside the sandbox then succeeded using cached packages. The normal full `pnpm test` command passed afterward (`mobile-audit-workspace-tests.txt`), followed by fresh mobile typecheck and mobile/root lint. No package version was upgraded. Changes remain uncommitted; existing feature acceptance gaps remain open.
