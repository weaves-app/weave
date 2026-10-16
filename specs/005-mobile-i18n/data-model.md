# Data Model: Mobile Internationalization

WEA-28 · [Specification](spec.md) · No persistent schema or migration.

| Entity                  | Fields                                                           | Invariants / ownership                                                          |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Language                | sole supported value en; fallback en                             | No other production catalog, picker or persisted override                       |
| Locale sample           | unknown external result                                          | Runtime default-locale read may be absent/invalid/throw; cannot fail startup    |
| Message definition      | stable semantic ID, role, parameter contract                     | Independent required manifest; display labels are not technical IDs             |
| English catalog         | one complete English string per static ID; retry one/other forms | Nonempty strings, complete key coverage, approved meaning, immutable baseline   |
| Translator              | readonly language en; static text/retry formatting capabilities  | App-owned interface; no global engine, changeLanguage or arbitrary params       |
| Scoped engine resources | copied nested English resource tree                              | Fresh per root; mutable library internals cannot alter baseline or another root |
| Display context         | stable translator for one keyed app root                         | Outside auth policy/state; no auth remount on locale sample/foreground          |
| Emergency copy          | bounded safe recovery/action/feedback English strings            | Pure, provider-free, engine-free, Intl-free; preserves the actual action role   |

## Parameter contract

Static messages accept no parameters. Retry display accepts only a finite safe integer count >=0; 1 chooses singular, all other valid counts choose plural. Counts 0, 1, 2, 60 are required examples. Undefined, negative, fractional, NaN, infinity, unsafe integers and strings never appear as malformed feedback; show "Please wait before trying again." instead. Existing user-data display stays separate; localization never normalizes inputs or translates machine identifiers.

## Transitions and failure behavior

| Trigger                                              | Result                                                                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root construction                                    | Best-effort locale sample → en; fresh local engine/resources → ready translator or safe English translator                                                                             |
| Foreground locale change                             | Sample and normalize to en; retain translator/auth runtime identity; matched foreground runs preserve parent refresh/state/form behavior with zero added locale-caused commands/resets |
| Missing instance resource                            | Canonical English text/default; no raw key                                                                                                                                             |
| Engine initialization/format failure or missing Intl | Pure English resolver; existing app/error actions remain available                                                                                                                     |
| Corrupt/missing required canonical text              | Delivery validator fails; runtime role-specific emergency fallback remains nonempty                                                                                                    |
| Subtree failure                                      | Error boundary unmounts normal providers; recovery obtains pure English directly                                                                                                       |
| Explicit Reload                                      | Fresh localization context and normal native auth revalidation under existing keyed root                                                                                               |
| Real unmount                                         | Remove owned AppState listener; no backend/plugin/third-party engine event subscriptions to retain                                                                                     |

Effect cleanup removes subscriptions only; it does not make the pure translator unusable, so setup/cleanup replay never reuses a terminally disposed engine. Abandoned render may allocate pure local objects, but performs no native authentication, network, persistence or external subscription. Per-root factory construction is not a singleton.

## Completeness validation

Validate resources against the independent message inventory, not against keys discovered from the resource under test. Required static entries must be strings containing non-whitespace text and no unresolved substitution syntax. Retry forms must each contain exactly one approved count marker. Unknown/extra parameter names and object-valued results are rejected. The baseline contains approved English; injected longer/sentinel wording is test-only and does not create a second supported language.
