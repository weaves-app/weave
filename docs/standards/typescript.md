# TypeScript policy

Baseline: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html). Use named exports, single quotes, semicolons, clear naming, interfaces for object shapes, const for stable bindings, and readonly for unchanged members. Avoid any, unsafe assertions, non-null assertions, and #private fields. Prefer unknown with narrowing. Do not prefix interfaces with I. Review readability and exported API size in addition to automated checks.

## Framework compatibility decisions

Adopted narrow exceptions: default exports only where Next.js route/config, Prisma configuration requires them; decorated classes for Nest transport DTOs where runtime validation requires metadata. Generated Prisma/Next files are excluded from formatting/style enforcement. File names may follow Nest/Next framework conventions. These exceptions must be recorded in the adopted constitution; they are not blanket exclusions for entire apps. Do not claim exact Google compliance while these exceptions exist.

[Google gts](https://github.com/google/gts) supplies a linter/formatter configuration, but it is not proof that every guideline is enforced. Evaluate its compatibility with current ESLint, Next, decorators, and TSX before adoption. A shared ESLint flat config with explicit Google-rule mapping is another option; avoid blindly combining conflicting presets.

Implemented enforcement: type-aware typescript-eslint, React Hooks and Next rules, formatter settings aligned to the adopted policy, and a rule-to-tool matrix. [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/).

Keep strict mode. Evaluate noUncheckedIndexedAccess, noImplicitOverride, noFallthroughCasesInSwitch, and exactOptionalPropertyTypes with generated/client types before enabling. Validate external JSON at runtime; static types do not validate responses. Await promises or intentionally handle rejections; do not silently swallow errors. Production code, tests, and examples should share style, with explicit narrow test exceptions only when needed.

Shared compiler profiles live in @weave/typescript-config. Authored workspace compilation/linting uses TypeScript 6.0.3. Nest CLI's internal 5.9.3 dependency is a documented tooling exception; authored API compilation validates with 6.0.3. Next retains its framework-compatible ES2017 target; strictness is shared, not identical module/runtime settings across platforms.

## Readable spacing

The shared `weave/readability` ESLint rule enforces blank lines between adjacent external, workspace (`@weave/`) and relative import groups, after imports/directives, and between top-level declarations. Import order is preserved. Functions, class methods and callable object members are separated. Inside functions, separate control flow, variable groups, operations, and returns/throws; consecutive related variables and operations may stay together. Keep comments attached to the block they describe. Add additional blank lines when a meaningful change of purpose is not mechanically recognizable. Prettier handles indentation/wrapping and preserves these separators. Both checks are required by `npm run verify`. Generated/vendor exclusions remain unchanged.

## Named comparison values

Use exported, semantically named constants for string and numeric values in comparisons, switch cases, and `??`/`||` fallbacks. Keep values with the domain or adapter that owns them; import existing constants rather than duplicating a shared vocabulary. Mobile session states use `SESSION_STATUS`, with `SessionStatus` derived from that object.

The shared `weave-values/no-literal-comparisons` rule runs in app lint, repository scripts and staged-file lint. It rejects inline string/number operands (including signed numbers, static templates and TypeScript assertions) and directly referenced non-exported static constants. It covers reversed and relational comparisons, switch cases, and right-hand fallback values for `??` and `||`. It leaves null/undefined, booleans, `typeof` checks and literal assertion arguments in tests readable. Runtime values may still be compared with one another. Generated and vendored source is excluded. The rule does not invent names or export declarations automatically.

Navigation identifiers also use exported constants: `Screen.name`, `Screen.navigationKey`, `Group.navigationKey`, and `Navigator.initialRouteName` on JSX member components (for example, `Stack.Screen`). The rule checks both literal attributes and expression containers. Ordinary display text, titles and form `name` props remain readable. Mobile navigation owns `ROUTE_NAME` and `NAVIGATION_KEY`; route parameter keys reuse the route constants.

Mobile runtime options additionally use `weave-values/no-inline-option-values` with TypeScript contextual types in app and root staged-file lint. Use grouped constants in calls, object construction, assignments, defaults, returns, ternaries and JSX, and derive authored finite-string unions from those constants. The rule catches new typed vocabularies without a list of known values, including local static aliases. Tests retain independent literal fixtures/expectations. Display copy, open-ended strings, structural keys and framework codegen literals remain valid. This is type-aware enforcement, not a ban on every string; untyped/open-ended APIs still require review.
