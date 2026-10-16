# Localization Contract

WEA-28 · Proposed interface/lifecycle contract; not implementation code.

## Public app interfaces

`TextTranslator` exposes readonly language en, `text(id: StaticMessageId): string` and `retryAfterSeconds(count: unknown): string`. Static IDs and parameter contracts come from the independent required-message manifest. No arbitrary interpolation dictionary, language mutation, i18next types or provider resources are exposed to screens.

`DeviceLocaleSource` exposes `read(): unknown`. The concrete adapter reads the runtime's resolved Intl locale, guarded against missing methods/throwing access; the pure policy always chooses en for this ticket. This is not a promise to enumerate ordered OS language preferences. `TEXT_TRANSLATOR` and `DEVICE_LOCALE_SOURCE` are canonical tokens; `createLocalizationRuntime` is the composition factory.

`validateEnglishCatalog(candidate: unknown)` reports required missing/blank/non-string entries and invalid count placeholders, numeric adjacency and unsupported nesting by message ID only, without including user values or raw resource contents in diagnostics. The actual catalog must pass. Unknown input is narrowed at runtime; compile-time contracts supplement rather than replace validation.

## i18next adapter

- Create a new instance and a fresh `{en: {translation: copiedEnglishEntries}}` tree for each root. Never pass the imported baseline object directly into mutable resource storage or clone a shared instance.
- Configure lng/fallbackLng en, supportedLngs [en], ns/defaultNS translation, keySeparator/nsSeparator false, initAsync false, partialBundledLanguages false, returnEmptyString/returnNull false, debug/saveMissing false, interpolation.escapeValue false.
- Install no backend, detector, React global plugin or network resource loader. Validate synchronous readiness; initialization failure returns the safe English translator instead of Suspense or an app startup exception.
- Validate candidate entries before copying them into engine resources. Each static lookup supplies canonical English defaultValue, disables nesting with nest false and requests objects as objects so the app can reject them without exposing library diagnostics. Reject non-string, blank, raw-ID or unresolved-marker output; catch library exceptions and resolve safe English directly. Numeric display is the sole interpolation input.
- English retry forms are `retry.after_one` / `retry.after_other`. Pass count only after finite/safe/nonnegative-integer validation; require exactly one complete numeric token equal to the intended count and the correct English second/seconds unit, including after engine-resource mutation. Invalid input produces the existing "Please wait before trying again." feedback and never a raw value.

## Fallback chain and role safety

For a known static ID: valid scoped engine text → valid immutable canonical English entry → explicit emergency English for that ID/role. Emergency actions preserve the actual identity: Reload, Try again, Log in, Send code, Verify code, Resend code, Logout, Choose another method, or Continue with Google as appropriate. Never replace a known destructive/session action with generic Continue. Labels/hints retain their field meaning; informational errors use a safe generic error only when exact wording cannot be recovered.

For retry feedback: valid engine plural output → pure English count formatter → generic safe wait feedback if input is invalid. The pure formatter uses one for count=1, other otherwise, and requires no Intl capability. Empty catalogs and unavailable engine resources are supported runtime fault fixtures; the shipped baseline must still fail delivery validation if incomplete.

Recovery calls a provider-free accessor in safe-english.ts. It reads canonical recovery title/description/Reload wording and owns literal emergency equivalents if those entries are corrupt. It does not call i18next, React hooks/Context, Intl, device preference services or auth state. Emergency handling must not log resource/user/provider values. Bounded repeated recovery/action wording is deliberate fault independence, not a second complete catalog.

## Context, activation and cleanup

`LocalizationProvider` lazily constructs a pure local runtime for the keyed app root inside AppErrorBoundary's normal renderChildren subtree, above AuthProvider. Its typed app-owned Context exposes only TextTranslator. Initialization has no network, persistence or native auth side effects; UI gets usable English synchronously. If context is absent in isolated component use, the app-owned hook returns a stable pure English resolver, never an implicit global i18next instance. Tests exercise explicit injection to prove normal screens use scoped text.

An effect owns foreground AppState sampling and its unsubscribe handle. Read locale again on foreground; en remains selected, so keep translator identity and auth provider instance unchanged. The locale listener must not change root keys, call auth commands, clear forms or replace Zustand state. The independent existing auth foreground listener still follows parent refresh/revalidation policy; any resulting state, navigation or form transitions must match an otherwise identical unchanged-locale run. Require zero additional auth operations/resets caused by localization, not zero operations for the whole foreground event. Cleanup removes this listener; the translator remains a usable pure read service. Effect replay removes/reinstalls only this subscription. Real recovery Reload remounts the existing keyed subtree and creates fresh resources; the fallback screen is outside it and remains independent.

`App` may accept an optional interface-typed localization factory for controlled test resources/sources beside its existing auth runtime factory. Auth domain/controller/gateway types remain unchanged. Injected factories must be stable per mounted root.

## Consumer migration

Presentation maps AuthErrorCode to stable message ID; gateway/domain still return their existing safe code/messageKey values. Login/password/method-tabs/layout/Home/navigation/auth-initialization text resolves through the translator. Generic controls remain string-prop consumers. Verification composition supplies CodeField label, accessibility hint and instruction text via a readonly props contract; CodeField retains input normalization, six-digit boundary and hidden decorative slots. BrandLogo's fixed Weave identity remains an explicitly exempt invariant.

Use only display strings for translation. Existing email display stays separate, with existing trimming rules owned by the current flow; passwords/codes/URLs/IDs never pass through translator APIs. No new locale-normalization logic is permitted.
