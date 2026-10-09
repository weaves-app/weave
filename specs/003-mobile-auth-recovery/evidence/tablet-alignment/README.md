# T053 tablet authentication alignment

The owner reported Login at the top versus OTP in the middle of iPad. Both now share one centered bounded tablet frame and the same logo/heading origin. Narrow windows retain full safe-area layout.

- `regression-red.txt`: signIn/deviceTrust tests fail on the actual alignment mismatch (flex-start versus center).
- `mobile-green.txt`:93 mobile tests/13 suites pass.
- Portrait/landscape/large JUnit and run files: real iPad simulator presentation checks, including automatic code verification, safe rejection, resend and Back. The provider is deterministic and never authenticates.
- `native-bounds.txt`: portrait/landscape logo and heading bounds match across five states, accounting for PNG orientation metadata. Initial Login captures can include Metro's transient download overlay outside the form.
- Screenshots contain fictional preview@example.com only. The owner's original OTP screenshot is not retained here.
- Native runner restores the production entry and text/keyboard preferences; iPad was returned to portrait. Fixtures/flows are retained for repeatability.

These checks do not complete outstanding real-provider, storage observability, full accessibility/lifecycle, minimum-iOS17 or CI acceptance.
