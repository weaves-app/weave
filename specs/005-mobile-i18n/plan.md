# Implementation Plan: Mobile Internationalization Foundation

**Branch**: `feat/WEA-28/mobile-i18n` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: `specs/005-mobile-i18n/spec.md` — [WEA-28](https://linear.app/weaveapp/issue/WEA-28/add-internationalization-to-the-react-native-app), English only, stacked above PR #12 at 04aeaf5.

## Summary

Move all inventoried app-owned English copy into a typed local catalog and resolve it through an injected presentation-facing TextTranslator. Use a fresh i18next instance and resource tree per root; do not change the auth controller or Zustand model. A small app-owned React Context supplies the translator. Recovery resolves immutable English directly without any provider, initialized engine or network request. Retry counts use English one/other forms; input and credential data never enter translation calls.

Planning is authorized by the user's speckit-plan invocation. The user confirmed English only; S01–S08 agreement remains pending before source edits. This command ends after research and design, without installing packages or implementing behavior.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.2.3, React Native 0.86.3, repository-recommended Node 24 LTS, pnpm 11.1.1.

**Primary Dependencies**: Add i18next 26.4.5 (npm latest verified 2026-10-15; recheck at adoption, save exact resolved stable version). Keep existing Zustand 5.0.15 and React Navigation unchanged. No react-i18next, detector/backend plugin, locale native module or plural polyfill is required for this English-only contract.

**Storage**: Statically bundled English catalog; immutable canonical/emergency copy; per-root in-memory engine resources. No preference persistence, remote catalog fetch or translation state in AuthViewState.

**Testing**: Existing Jest 29.7 / RN Testing Library 13.3; real i18next for adapter tests, controlled locale/resource input and gateway/clock fakes; catalog completeness checks; existing 108-mobile-test baseline; Metro bundles, native tests/compilation and real-platform accessibility/layout journeys. None run during planning.

**Target Platform**: Existing Android API 24+ and iOS 17+. Hermes/Intl behavior is verified on both platforms during implementation; absent Intl/locale/plural capability must retain readable English through the safe resolver.

**Project Type**: Vanilla React Native app in existing monorepo.

**Performance Goals**: Zero network translation requests, zero locale-only auth operations/resets, synchronous usable text before screen render, complete required message coverage and correct 0/1/2/60 count examples. No unmeasured frame-rate promises.

**Constraints**: English only; framework-free inner contracts; stable semantic keys, readonly inputs, named exports/constants; preserve English meaning, state ownership, input clearing, navigation, keyboard/screen-reader behavior and native session authority. Recovery cannot depend on the normal provider. Existing parent gaps do not become passes.

**Scale/Scope**: Existing app-owned Login/verification/Home/loading/error/recovery/accessibility text only. No new screens, language picker, persisted override, RTL work, date/currency formatting, native/provider UI translation, backend/web changes or cross-platform text package.

## Constitution Check

_Assess before Phase 0 and re-evaluate after Phase 1._

| Gate                                   | Before research                             | After design                                                                                                                             |
| -------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ticket and feature isolation           | Pass: WEA-28, new numbered feature          | Pass: feature.json selects 005-mobile-i18n; no WEA-27 artifact rewriting                                                                 |
| BDD agreement before implementation    | Language scope confirmed; scenarios pending | Pending implementation gate; planning explicitly requested, no source edits                                                              |
| Meaningful RED/GREEN/refactor          | Required                                    | Ordered catalog, adapter, UI and lifecycle public seams documented; import failures cannot count as behavioral RED                       |
| Clean boundaries / interface injection | Required                                    | TextTranslator and DeviceLocaleSource interfaces, canonical tokens/factory, concrete engine/Intl wiring in composition                   |
| Reusable UI / semantic tokens          | Required                                    | Existing primitives retained; CodeField receives text props; no i18n dependency forced into generic primitives                           |
| TypeScript policy                      | Required                                    | Typed message IDs and catalogs, unknown at locale/resource boundaries; framework exports remain documented exceptions                    |
| Branch base                            | Explicit user stack on #12                  | Pass authorized exception: feat/WEA-28/mobile-i18n based on the PR #12 head, itself derived from develop                                 |
| Verification / personal publishing     | Required later                              | Full verify, integration/native/device evidence and personal author/committer checks before draft publication; CI/review remain required |
| Release/configuration boundaries       | Pass                                        | No release/deployment or credential/provider configuration changes                                                                       |

No unjustified design violations or unresolved technical clarifications. Scenario agreement, tasks and analyze remain prerequisites to source implementation. The SDD commit hook requires later-phase artifacts and confirmation; do not fabricate them to publish a planning-only change. Existing PR-target policy accepts develop/main only: keep the stacked draft reviewable and retarget after its parent merges without bypass.

## Project Structure

### Documentation (this feature)

```text
specs/005-mobile-i18n/
├── spec.md
├── workflow.json
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── localization.md
    ├── message-inventory.md
    ├── scenario-tests.md
    └── native-fixture.md
```

Task generation adds tasks.md; actual evidence and convergence are subsequent implementation outputs.

### Source Code (repository root, proposed)

```text
apps/mobile/
├── package.json                         # exact i18next dependency
├── App.tsx                              # root composition; independent recovery stays outside
└── src/
    ├── localization/
    │   ├── application/
    │   │   ├── text-translator.ts        # consumer-owned interface; retry count boundary
    │   │   └── device-locale-source.ts   # unknown runtime-locale read contract
    │   ├── messages.ts                  # independent required IDs/roles/parameter contracts
    │   ├── resources/en.ts              # complete canonical English catalog
    │   ├── safe-english.ts              # pure fallback/recovery resolver, no engine/React/Intl
    │   ├── infrastructure/
    │   │   ├── i18next-translator.ts     # fresh engine/resources, safe output wrapper
    │   │   └── runtime-locale-source.ts # guarded Intl default-locale read
    │   ├── localization-runtime.ts      # composition factory and instance lifetime
    │   ├── localization.tokens.ts       # TEXT_TRANSLATOR / DEVICE_LOCALE_SOURCE
    │   └── presentation/localization-context.tsx # stable per-root injection
    ├── auth/presentation/               # migrate existing copy and safe error-ID mapping
    ├── navigation/root-navigator.tsx    # checking/retry/error text
    ├── components/code-field.tsx        # English label/hint/instructions supplied by caller
    └── recovery/recovery-screen.tsx     # provider-free safe English access
pnpm-lock.yaml                           # frozen-install-compatible resolution
```

Adjacent localization and rendered journey tests precede their implementation. Existing source touchpoints include login-screen.tsx, auth-method-tabs.tsx, auth-layout.tsx, password-transition.tsx, home-screen.tsx, auth-messages.ts and auth-context.tsx. BrandLogo's unchanged proper-name accessibility label remains an explicitly inventoried identity string, not translatable prose. Generic Button/FormField/Feedback stay string-prop based.

**Native acceptance fixtures (proposed, test-only)**: `apps/mobile/metro.i18n-fixture.config.cjs`, `apps/mobile/src/localization/testing/expanded-en.ts`, `native-fixture.test.tsx`, and `native-entries/{login,verification,home,retry,recovery}.tsx`. See [native fixture contract](contracts/native-fixture.md). Only an explicitly selected Metro configuration reaches these entries/resources; normal index.ts, Metro configuration, canonical English and native projects retain their production entry graph. The configuration is a documented framework CommonJS exception.

**Structure Decision**: Localization is a mobile presentation capability with inward-owned ports. Existing auth domain error codes remain stable and map to message IDs only at presentation; no localization import enters the auth controller/domain or native adapters. No new workspace package/native project changes are planned.

## Implementation Sequence and Validation

1. Confirm S01–S08, generate tasks and analyze. Record the latest dependency choice, interface seams and message inventory before source changes.
2. Adopt the verified stable i18next release with exact manifest/lockfile, frozen install and separate tooling capability checks.
3. Write meaningful failing tests for completeness validation, count/fallback behavior and instance/resource isolation. Define importable contracts first; implement only the behavior exercised by RED, then refactor green.
4. Before wiring the provider/root, test usable synchronous text, malformed/throwing locale sources, missing-engine/resource behavior, provider-free recovery and zero additional localization-caused auth/form resets. Compare matched foreground sequences with unchanged/changed locale input, retaining the parent's existing refresh/revalidation and resulting state/form/navigation transitions. Allocate only pure local resources during lazy root construction; no subscriptions or native auth work during render. Add/clean up foreground locale sampling in an effect; it never rebuilds auth or changes the sole English selection.
5. Extract copy through typed IDs and migrate rendered journeys. Use injected expanded/sentinel English wording to prove screens and accessibility use the catalog, while preserving independent literal expectations for approved baseline wording. Preserve every existing auth/state/privacy regression.
6. Test missing resources and Intl capabilities, the exact count table, isolated resource trees, offline/failure recovery and lifecycle. Audit all inventory entries and narrow exclusions. Implement the isolated native expanded-English fixture described in contracts/native-fixture.md, then verify the defined phone/tablet and font-scale matrix on both platforms without reclassifying parent failures as passes.
7. Run full verify, database integration, both Metro bundles/native compiles/tests and available live journeys; record blockers. Converge and create the stacked draft with spec/evidence links when authorized by the implementation phase. Retarget after the parent merges; no implicit merge/deployment.

See [research](research.md), [data model](data-model.md), [localization contract](contracts/localization.md), [inventory](contracts/message-inventory.md) and [validation guide](quickstart.md).

## Complexity Tracking

No new architectural exception. The interface/adapter boundary keeps third-party engine types out of auth policy, and an independent pure fallback keeps recovery usable. A custom React Context is sufficient because English is fixed; extra language state, react-i18next global integration and native locale subscriptions would add no current behavior.
