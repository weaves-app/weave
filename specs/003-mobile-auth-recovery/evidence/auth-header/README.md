# T052 shared authentication header evidence

Owner requested centered consistent Login/OTP branding and top Back. See workflow.json/spec.md and parent evidence.md for scope.

- `regression-red.txt`: both code-purpose tests fail because branding is still inside ScrollView.
- `mobile-green.txt`: all91 mobile tests/13 suites pass.
- `repository-verify.txt`: full repository verification exits0 with the documented local DATABASE_URL.
- Platform JUnit files and run logs: normal Android/iOS and enlarged Android/iOS deterministic challenge flows all pass. The runner restores production entry/preferences and relaunches the app.
- Screenshots use a fictional identity and injected gateway; successful real-provider login is not established.
- `native-bounds.txt` / checker: identical centered bounds across fully rendered Login/OTP/keyboard/error/return captures. Android enlarged initial screenshot occurs during image fade before the logo paints; the report explicitly skips that capture and compares the four later states, including returned Login.
- Both production Metro bundles compile; native installed builds are reused because this slice only changes TypeScript presentation. Full WEA-10 provider/storage/accessibility/lifecycle/iOS17/CI acceptance remains partial.
