# TypeScript policy

Baseline: [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html). Use named exports, single quotes, semicolons, clear naming, interfaces for object shapes, const for stable bindings, and readonly for unchanged members. Avoid any, unsafe assertions, non-null assertions, and #private fields. Prefer unknown with narrowing. Do not prefix interfaces with I. Review readability and exported API size in addition to automated checks.

## Framework compatibility decisions

Adopted narrow exceptions: default exports only where Next.js route/config, Expo App entrypoint or Prisma configuration requires them; decorated classes for Nest transport DTOs where runtime validation requires metadata. Generated Prisma/Next files are excluded from formatting/style enforcement. File names may follow Nest/Next framework conventions. These exceptions must be recorded in the adopted constitution; they are not blanket exclusions for entire apps. Do not claim exact Google compliance while these exceptions exist.

[Google gts](https://github.com/google/gts) supplies a linter/formatter configuration, but it is not proof that every guideline is enforced. Evaluate its compatibility with current ESLint, Next, decorators, and TSX before adoption. A shared ESLint flat config with explicit Google-rule mapping is another option; avoid blindly combining conflicting presets.

Implemented enforcement: type-aware typescript-eslint, React Hooks and Next rules, formatter settings aligned to the adopted policy, and a rule-to-tool matrix. [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/).

Keep strict mode. Evaluate noUncheckedIndexedAccess, noImplicitOverride, noFallthroughCasesInSwitch, and exactOptionalPropertyTypes with generated/client types before enabling. Validate external JSON at runtime; static types do not validate responses. Await promises or intentionally handle rejections; do not silently swallow errors. Production code, tests, and examples should share style, with explicit narrow test exceptions only when needed.
