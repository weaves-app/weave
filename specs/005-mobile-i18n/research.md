# Research: English-Only Mobile Internationalization

WEA-28 · 2026-10-15 · Phase 0 decisions. No packages installed.

## Engine and published version

**Decision**: Use i18next behind an app-owned TextTranslator interface. npm latest was verified as 26.4.5 on 2026-10-15; its optional TypeScript peer accepts ^5 || ^6 || ^7, including the repository's 6.0.3. Recheck the stable release at adoption and save the exact resolved version. React bindings are not needed for fixed English.

**Rationale**: The [official registry metadata](https://registry.npmjs.org/i18next/latest) identifies the published version; [instance API](https://www.i18next.com/overview/api#instance-creation) provides isolated engines. Existing React/RN stays untouched. Peer compatibility is not evidence of successful Hermes/Metro/device execution.

**Alternatives considered**: A handwritten dictionary is smaller but makes future plural/format behavior app-owned. react-i18next 17.0.17 was also registry-verified, but adds a React integration layer without a live language-switching need. The [official initReactI18next implementation](https://github.com/i18next/react-i18next/blob/master/src/initReactI18next.js) writes global defaults/instance, so it is deliberately omitted rather than weakening root isolation.

## Bundled initialization and isolation

**Decision**: createInstance per root, fresh nested resources per instance, lng/supportedLngs/fallbackLng set to en, one translation namespace, no backend/detector plugin, initAsync false, partialBundledLanguages false, debug/saveMissing false. Check initialization readiness synchronously; on failure expose the safe English resolver instead of throwing or suspending.

**Rationale**: [Configuration options](https://www.i18next.com/overview/configuration-options) support local resources; [migration guidance](https://www.i18next.com/misc/migration-guide) names initAsync as the current replacement for initImmediate. [ResourceStore](https://github.com/i18next/i18next/blob/master/src/ResourceStore.js) retains supplied objects, so separate engines alone are insufficient if a shared imported catalog tree is passed by reference.

**Alternatives considered**: cloneInstance shares resources/plugins by default; a global singleton can contaminate roots/tests; async downloads add startup failure paths outside the ticket.

## Locale source for the sole English policy

**Decision**: Sample the runtime's default locale through guarded Intl.DateTimeFormat().resolvedOptions().locale at root creation and foreground activation. Treat the result as unknown; malformed, absent or throwing inputs resolve en. Every valid input also resolves en in this ticket. Sampling never calls changeLanguage, remounts auth or stores a user override.

**Rationale**: [ECMA-402](https://tc39.es/ecma402/#sec-intl.datetimeformat.prototype.resolvedoptions) exposes a resolved runtime locale, not an ordered OS preference list. This is sufficient only because there is one supported language. [RN 0.65's Intl support announcement](https://reactnative.dev/blog/2021/08/17/version-065) is historical evidence for Hermes Intl availability, not certification of every method on this app's two platforms; the adapter guards it and native checks remain required.

**Alternatives considered**: [react-native-localize](https://github.com/zoontek/react-native-localize) provides ordered native locale preferences but adds a native dependency that cannot change the English-only result. Revisit native ordered preferences before adding a second production language. Do not use private SettingsManager/I18nManager fields, infer locale from location or read native credentials/config.

## Keys, completeness and React boundary

**Decision**: Independent required-message ID/role/parameter contracts plus an English catalog satisfying that contract. A runtime validator rejects missing/empty required entries and malformed plural placeholders in delivery tests. Auth error codes map to these IDs in presentation. The Context exposes only the app-owned translator, not mutable i18next APIs; no global plugin or language store.

**Rationale**: [i18next TypeScript guidance](https://www.i18next.com/overview/typescript) supports typed resources; public app types shield screens from engine API evolution. An independent required ID set detects deletion of a whole catalog entry, which deriving the entire completeness oracle from the same catalog cannot do.

**Alternatives considered**: Raw string keys everywhere are typo-prone. Reusing English sentences as keys couples identity to copy. A shared web/native text package is unnecessary for a mobile-only first adoption.

## Pluralization and approved parameters

**Decision**: Only retry feedback accepts a count: retry.after_one and retry.after_other, with exactly one {{count}}. Counts are finite safe nonnegative integers; invalid/missing values use the existing safe generic retry wording. No email, password, code, session identifier or raw provider object enters interpolation. escapeValue false because rendering is native Text, not HTML.

**Rationale**: [Plural documentation](https://www.i18next.com/translation-function/plurals) uses the count option and one/other forms. [Interpolation guidance](https://www.i18next.com/translation-function/interpolation) distinguishes HTML escaping. The pure English fallback independently selects singular for 1, plural otherwise; it remains usable when engine/Intl plural support fails. Preserve "Try again after …" rather than changing approved copy to "in …".

**Alternatives considered**: Broad arbitrary interpolation parameters create unnecessary data/privacy risk; a polyfill or ICU framework is not required for one English count rule. Future languages must revisit these decisions.

## Missing text and recovery

**Decision**: Normal resolution supplies canonical English defaultValue, rejects unusable output and catches engine failures, then uses pure safe English. Recovery calls the pure resolver directly and has literal emergency recovery title/description/Reload wording if the canonical recovery entries are corrupt. Critical action fallback preserves the exact action identity, not a generic Continue label. No fallback recursively calls the failing engine.

**Rationale**: [i18next fallback behavior](https://www.i18next.com/principles/fallback) can return a key when no resource/default exists; fallbackLng alone cannot meet S05. ReturnEmptyString/returnNull false and wrapper validation are therefore required. Recovery independence follows the actual boundary structure: recovery-screen.tsx renders outside normal providers after a child failure.

**Alternatives considered**: Hook-only recovery can fail with its provider; raw key fallback and translation of provider errors violate the spec. A duplicate full English catalog is unnecessary; only the emergency recovery/action path duplicates bounded safety wording, documented as deliberate fault independence.

## Resolved research questions

Engine/version, locale source limits, resource isolation, synchronous initialization, typing/completeness, count validation, no-credential interpolation and recovery fallbacks are resolved. No technical clarification remains. English-only scope is confirmed; scenario agreement and implementation gates remain separate.

## Implementation adoption and review results

Adopted i18next 26.4.5 with save-exact and frozen offline install; optional TypeScript peer ^5 || ^6 || ^7 accepts TypeScript 6.0.3. Real Metro bundles and real-engine tests exercise the integration; device acceptance remains separate. Catalog now has 51 entries, including the initially missed tablet brand.story.

Review regressions require selected-template validation, complete numeric-token/unit validation after formatting, and no nesting. The installed i18next implementation checks opt.nest before resolving nested expressions, so every lookup sets nest false and boundary validation rejects the unsupported marker. returnObjects true lets the app reject object results instead of exposing the library's diagnostic string. See evidence/review.md for observed RED/GREEN.
