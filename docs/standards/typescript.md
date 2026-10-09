# TypeScript policy

Baseline: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html). Use named exports, single quotes, semicolons, clear naming, interfaces for object shapes, const for stable bindings, and readonly for unchanged members. Avoid any, unsafe assertions, non-null assertions, and #private fields. Prefer unknown with narrowing. Do not prefix interfaces with I. Review readability and exported API size in addition to automated checks.

## Framework compatibility decisions

Adopted narrow exceptions: default exports only where Next.js route/config, Prisma configuration requires them; decorated classes for Nest transport DTOs where runtime validation requires metadata. Generated Prisma/Next files are excluded from formatting/style enforcement. File names may follow Nest/Next framework conventions. These exceptions must be recorded in the adopted constitution; they are not blanket exclusions for entire apps. Do not claim exact Google compliance while these exceptions exist.

[Google gts](https://github.com/google/gts) supplies a linter/formatter configuration, but it is not proof that every guideline is enforced. Evaluate its compatibility with current ESLint, Next, decorators, and TSX before adoption. A shared ESLint flat config with explicit Google-rule mapping is another option; avoid blindly combining conflicting presets.

Implemented enforcement: type-aware typescript-eslint, React Hooks and Next rules, formatter settings aligned to the adopted policy, and a rule-to-tool matrix. [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/).

Keep strict mode. Evaluate noUncheckedIndexedAccess, noImplicitOverride, noFallthroughCasesInSwitch, and exactOptionalPropertyTypes with generated/client types before enabling. Validate external JSON at runtime; static types do not validate responses. Await promises or intentionally handle rejections; do not silently swallow errors. Production code, tests, and examples should share style, with explicit narrow test exceptions only when needed.

Shared compiler profiles live in @weave/typescript-config. Authored workspace compilation/linting uses TypeScript 6.0.3. Nest CLI's internal 5.9.3 dependency is a documented tooling exception; authored API compilation validates with 6.0.3. Next retains its framework-compatible ES2017 target; strictness is shared, not identical module/runtime settings across platforms.

## Readable spacing

Authored code files must contain at most 500 physical lines, including comments and blank lines. Split by coherent responsibility; do not compress statements to evade the limit. The shared ESLint configuration enforces the boundary for JavaScript/TypeScript. Review CSS and archived authored design sources against the same limit. Generated/vendor sources retain the constitution's exclusion.

The shared `weave/readability` ESLint rule enforces blank lines between adjacent external, workspace (`@weave/`) and relative import groups, after imports/directives, and between top-level declarations. Import order is preserved. Functions, class methods and callable object members are separated. Inside functions, separate control flow, variable groups, operations, and returns/throws; consecutive related variables and operations may stay together. Keep comments attached to the block they describe. Add additional blank lines when a meaningful change of purpose is not mechanically recognizable. Prettier handles indentation/wrapping and preserves these separators. Both checks are required by `pnpm run verify`. Generated/vendor exclusions remain unchanged.
