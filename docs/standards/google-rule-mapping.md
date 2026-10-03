# Google TypeScript enforcement mapping

| Policy                                          | Automated enforcement                                                     | Review                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Single quotes, semicolons, two-space formatting | Prettier                                                                  | Readability                                                 |
| Named exports                                   | ESLint restricted default exports                                         | Next/Expo entrypoint and Prisma config exceptions only      |
| Object contracts use interfaces                 | consistent-type-definitions, constructor AST interface checks             | Port ownership/semantics                                    |
| Strict types and safe unknown boundaries        | strict compiler, no-explicit-any, no-unsafe rules, no non-null assertions | External-input validation coverage                          |
| Await/handle promises                           | no-floating-promises, no-misused-promises                                 | Error semantics                                             |
| Type-only imports                               | consistent-type-imports                                                   | Runtime-decorated DTO exceptions when actually required     |
| TypeScript private, readonly members            | No PrivateIdentifier, prefer-readonly                                     | Readonly interface properties and immutable inputs          |
| Dependency direction, no cycles                 | TypeScript-resolved import/constructor policy                             | Architectural usefulness and dynamic integration exceptions |

Root `eslint.config.mjs` and `.prettierrc.json` are implementation sources. Generated/vendor code is excluded. All authored TS, including test/config files, has a configured lint project. Tests relax explicit callback return annotations only. We do not claim that static checks prove every [Google guideline](https://google.github.io/styleguide/tsguide.html), SOLID, DRY or DDD principle; review covers non-mechanical rules. JS policy scripts also pass ESLint/Prettier.
