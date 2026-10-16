# English Message Inventory

WEA-28 · Baseline inspected from PR #12 head 04aeaf5 on 2026-10-15.

There are **51 required catalog entries**: 49 static messages and two retry plural forms. Stable IDs are proposed contracts; approved English retains existing meaning. The singular retry form is the specified grammatical correction. Source shorthand is relative to apps/mobile/src/auth/presentation unless prefixed components/, navigation/ or recovery/ (relative to src/).

| Message ID                         | Role                    | Canonical English                                                                                                       | Existing owner                                  |
| ---------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| brand.tagline                      | Information             | Everything, woven together.                                                                                             | auth-layout.tsx                                 |
| brand.story                        | Information             | No more loose threads.\nFrom order to shelf.                                                                            | auth-layout.tsx                                 |
| login.title                        | Heading                 | Welcome back                                                                                                            | login-screen.tsx                                |
| login.subtitle                     | Information             | Sign in to your Weave workspace.                                                                                        | login-screen.tsx                                |
| login.google                       | Action                  | Continue with Google                                                                                                    | login-screen.tsx                                |
| login.emailDivider                 | Information             | or continue with email                                                                                                  | login-screen.tsx                                |
| login.emailLabel                   | Field/accessible label  | Email                                                                                                                   | login-screen.tsx                                |
| login.emailPlaceholder             | Placeholder             | you@company.com                                                                                                         | login-screen.tsx                                |
| login.passwordLabel                | Field/accessible label  | Password                                                                                                                | password-transition.tsx                         |
| login.passwordPlaceholder          | Placeholder             | Enter your password                                                                                                     | password-transition.tsx                         |
| login.passwordMethod               | Tab label               | Password                                                                                                                | auth-method-tabs.tsx                            |
| login.passwordMethodLabel          | Accessible label        | Email and password                                                                                                      | auth-method-tabs.tsx                            |
| login.emailCodeMethod              | Tab/accessible label    | Email code                                                                                                              | auth-method-tabs.tsx                            |
| login.sendCode                     | Action                  | Send code                                                                                                               | login-screen.tsx                                |
| login.submit                       | Action                  | Log in                                                                                                                  | login-screen.tsx                                |
| verification.anotherMethod         | Action/accessible label | Choose another method                                                                                                   | login-screen.tsx                                |
| verification.deviceTitle           | Heading                 | Verify this device                                                                                                      | login-screen.tsx                                |
| verification.emailTitle            | Heading                 | Check your email                                                                                                        | login-screen.tsx                                |
| verification.description           | Information             | Enter the verification code sent to                                                                                     | login-screen.tsx                                |
| verification.codeLabel             | Field/accessible label  | Verification code                                                                                                       | components/code-field.tsx                       |
| verification.codeHint              | Accessible hint         | Enter or paste the six-digit code from your email                                                                       | components/code-field.tsx                       |
| verification.codeInstructions      | Information             | Enter the 6-digit code from your email.                                                                                 | components/code-field.tsx                       |
| verification.submit                | Action                  | Verify code                                                                                                             | login-screen.tsx                                |
| verification.notReceived           | Information             | Didn't receive it?                                                                                                      | login-screen.tsx                                |
| verification.resend                | Action                  | Resend code                                                                                                             | login-screen.tsx                                |
| status.checkingSession             | Live feedback           | Checking your session…                                                                                                  | auth-context.tsx; navigation/root-navigator.tsx |
| status.verifyingCode               | Live feedback           | Verifying code…                                                                                                         | login-screen.tsx                                |
| status.sendingCode                 | Live feedback           | Sending code…                                                                                                           | login-screen.tsx                                |
| status.signingIn                   | Live feedback           | Signing in…                                                                                                             | login-screen.tsx                                |
| status.signingOut                  | Live feedback           | Signing out…                                                                                                            | home-screen.tsx                                 |
| home.title                         | Heading                 | Home                                                                                                                    | home-screen.tsx                                 |
| home.logout                        | Action                  | Logout                                                                                                                  | home-screen.tsx                                 |
| common.tryAgain                    | Action                  | Try again                                                                                                               | navigation/root-navigator.tsx                   |
| retry.after_one                    | Live feedback/count     | Try again after {{count}} second.                                                                                       | login-screen.tsx; singular grammar correction   |
| retry.after_other                  | Live feedback/count     | Try again after {{count}} seconds.                                                                                      | login-screen.tsx                                |
| recovery.title                     | Heading                 | Something went wrong                                                                                                    | recovery/recovery-screen.tsx                    |
| recovery.description               | Information             | The app could not display this screen. Reload to try again.                                                             | recovery/recovery-screen.tsx                    |
| recovery.reload                    | Action                  | Reload                                                                                                                  | recovery/recovery-screen.tsx                    |
| auth.error.invalidInput            | Safe error              | Enter a valid email address and the required password or code.                                                          | auth-messages.ts                                |
| auth.error.rejectedCredentials     | Safe error              | The email or password was not accepted. Try again.                                                                      | auth-messages.ts                                |
| auth.error.codeInvalid             | Safe error              | That code was not accepted. Check it and try again.                                                                     | auth-messages.ts                                |
| auth.error.codeExpired             | Safe error              | That code has expired. Request another code.                                                                            | auth-messages.ts                                |
| auth.error.rateLimited             | Safe error              | Please wait before trying again.                                                                                        | auth-messages.ts                                |
| auth.error.existingAccountRequired | Safe error              | An existing account is required. Contact your administrator.                                                            | auth-messages.ts                                |
| auth.error.cancelled               | Safe error              | Sign-in was cancelled. Choose a method to try again.                                                                    | auth-messages.ts                                |
| auth.error.network                 | Safe error              | Unable to connect. Check your connection and try again.                                                                 | auth-messages.ts                                |
| auth.error.timeout                 | Safe error              | The request took too long. Please try again.                                                                            | auth-messages.ts                                |
| auth.error.configuration           | Safe error              | Login is unavailable. Contact your administrator.                                                                       | auth-messages.ts                                |
| auth.error.verificationRequired    | Safe error              | Your account requires verification that this app does not support. Choose another method or contact your administrator. | auth-messages.ts                                |
| auth.error.storage                 | Safe error              | Unable to access secure session storage. Please try again.                                                              | auth-messages.ts                                |
| auth.error.unexpected              | Safe error              | Something went wrong. Please try again.                                                                                 | auth-messages.ts                                |

## Invariant exclusions

- BrandLogo accessible identity "Weave" remains fixed English; brand artwork and the Google logo remain unmodified.
- Decorative arrow glyphs, technical route/test IDs, constants, code-slot digits and keyboard/autocomplete configuration are not translatable prose. Decorative elements retain their accessibility exclusions.
- Existing user email/account display and credential/code input values are data, not messages. No localization substitution or logging of those values.
- Internal programmer errors such as "Authentication context unavailable" remain internal safe diagnostics; they are not shown as provider errors or translated into user copy.
- OS dialogs, keyboards and third-party provider pages are outside app-owned copy.

## Coverage mechanism

The required-ID manifest is independent from resources/en.ts. Static IDs require nonempty string entries; both retry forms require exactly one count marker. Tests delete each required catalog entry in turn and must observe validation failure. Rendered journey tests inject distinctive English wording at IDs to catch literal-copy bypasses; an inventory review checks remaining app-owned literals and documents any new exclusions rather than asserting source text equality.

Ordinary controls take resolved strings. CodeField's label/hint/instructions are passed by verification composition. Feedback's accessible announcement is its resolved visible message. Extra accessibility-specific wording is retained where its meaning differs from the shorter visible tab label.
