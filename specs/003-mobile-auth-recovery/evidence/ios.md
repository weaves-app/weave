# WEA-10 iOS native evidence

Date: 2026-10-08. The user confirmed S01–S20 and approved the maintained SDK logging patch. Parent owns workflow/task state. No live Clerk configuration, test accounts or remote provisioning was supplied. No commits or pushes were created.

## Source adoption and native integration — T003–T005, T008

- Adopted ClerkKit 1.6.0 at immutable revision `aff2e9019dcc0978d5955fe98bcde9ab935eecb1` from the verified upstream checkout into `apps/mobile/vendor/clerk-ios`. Package.swift, Sources, Tests, LICENSE and README are preserved. The approved `contracts/clerk-ios-1.6.0-logging.patch` is the only upstream source edit; provenance is in WEAVE-PROVENANCE.md.
- App and test targets link ClerkKit using Xcode's local package reference `../vendor/clerk-ios`. Upstream targets and dependency constraints remain unchanged. Vendor and app workspace Package.resolved files record eight immutable transitive revisions; the host harness resolves only its two reachable production dependencies (Nuke and PhoneNumberKit), at the same pinned revisions. Xcode builds use `-disableAutomaticPackageResolution -onlyUsePackageVersionsFromResolvedFile`; Swift CLI uses `--force-resolved-versions`. Final byte comparison against the upstream checkout found only the approved ClerkLogger.swift source difference.
- Podfile, app/project and actual WeaveTests target use iOS17. The old scheme referenced an absent test target; the scheme now references an actual hostless XCTest target compiling the authored native engine, actual SDK adapter and their tests. The scheme also builds the full React Native application. The hostless target requires ClerkKit and system frameworks, so unused inherited React Pods were removed after an actual simulator loader failure exposed that dependency.
- Homebrew Ruby3.4.4 with `BUNDLE_PATH=vendor/bundle bundle install` from apps/mobile installed the locked gems locally, exit0. Gemfile.lock is unchanged. From ios the bundle path must be absolute because it is relative to the Gemfile, not cwd.
- `PATH=/opt/homebrew/opt/ruby/bin:$PATH BUNDLE_PATH=/Users/pravinraj/workspace/weave/apps/mobile/vendor/bundle bundle exec pod install` from apps/mobile/ios exited0. Final integration installed78 dependencies/77 pods, including RNScreens4.28.0, and generated WeaveAuthSpec. Generated signatures match `execute(command,payload)` Promise and `emitOnSessionChanged(NSString*)`; module mapping is WeaveAuth→WeaveAuthModule.
- The Objective-C++ TurboModule forwards to a public Swift engine facade. Its generated Swift header also declares the ReactNativeDelegate superclass; the bridge explicitly imports RCTDefaultReactNativeFactoryDelegate before Weave-Swift.h. This was verified through actual app compilation, rather than assuming the standalone header probe was sufficient.

## Implemented native behavior — T017, T024, T028

The injected AuthProvider and WeaveAuthExecuting seams compile without JavaScript. Production composition uses the pinned Clerk SDK; tests supply deterministic providers at the public native seam.

- Password, email-code and supported device-trust verification use actual SDK methods. Only completed attempts with a freshly refreshed, active session, no pending provider tasks and validated session/account IDs authorize access. Cached identities and fresh validation errors cannot authorize. Unsupported factors remain verificationRequired.
- Opaque native attempt handles survive newer verify/resend generations while retaining signIn/deviceTrust purpose. Forged purposes are rejected before SDK calls. abandon/dispose clear owned attempt references; they preserve SDK session credentials. Operation cancellation cancels the Task owning the SDK's ASWebAuthenticationSession.
- Google explicitly uses `transferable:false`; transferable unknown identities and signup outcomes remain existingAccountRequired. Actual ClerkKit verification/status/error models and ASWebAuthenticationSession cancellation are tested separately from fake provider behavior.
- Generation/epoch guards and ordered revisions suppress obsolete operations. A late abandoned activation compensates only its newly created session. Pending activation and pending logout remain native barriers to fresh authorization, including a new root after abandon. SDK invalidation publishes signedOut promptly; own logout invalidation does not cancel its successful result.
- Logout targets only the requested current session. Storage failure before local clear reports a safe failure; provider failure after proven local clear reports signedOut. An unrelated newer session cannot be cleared by stale logout/activation cleanup.
- The same-service Keychain health probe round-trips a synthetic item, deletes only its own account, verifies removal and maps read/write/clear failures to storage. SDK Keychain errors are mapped without raw descriptions. It uses the configured app service/access group and does not store app credentials itself.
- AppDelegate configures the runtime before React Native startup. Validated publishable key, explicit callback scheme and exact callback URL are required; missing/malformed configuration fails closed. OAuth callbacks are owned by SDK ASWebAuthenticationSession. Clerk.handle(URL) handles magic-link flows and is intentionally not used as an unrelated OAuth callback forwarder. No associated domains or owner identity were invented.

## Meaningful RED → GREEN evidence

All behavioral RED runs below compiled successfully and failed expected assertions against the authored public seams. Toolchain, header, product-name and simulator loader errors are separate integration failures and are not behavioral RED. Logs contain synthetic fixture identities only and are retained locally under `/private/tmp`.

Command for every host run:

```sh
WEAVE_IOS_CONTRACT_BUILD_PATH=/private/tmp/weave-ios-contract-build apps/mobile/scripts/ios-host-contracts.sh
```

| Slice                                                             | RED log, tests/assertion failures                   | GREEN log, passing tests                |
| ----------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| T014/T017 auth/fresh validation/OTP/Google safe errors            | weave-ios-t014-red.log,10 tests/25 failures         | weave-ios-t017-green.log,10/10          |
| Actual pinned SDK status/error mapping                            | weave-ios-sdk-mapping-red.log,12 tests/11 failures  | weave-ios-sdk-mapping-green.log,12/12   |
| Actual OAuth transfer status                                      | weave-ios-oauth-red.log,13 tests/2 failures         | weave-ios-oauth-green.log,13/13         |
| Ordered invalidation and obsolete activation cleanup              | weave-ios-events-red.log,15 tests/4 failures        | weave-ios-events-green.log,15/15        |
| Pending activation barrier and Keychain access faults             | weave-ios-storage-red.log,18 tests/6 failures       | weave-ios-storage-green.log,18/18       |
| T024 explicit callback/bootstrap configuration                    | weave-ios-t024-red.log,20 tests/3 failures          | weave-ios-t024-green.log,20/20          |
| T026/T028 current-only logout and before/after-clear failures     | weave-ios-t026-red.log,24 tests/6 failures          | weave-ios-t028-green.log,24/24          |
| Own logout invalidation and SDK storage NSError                   | weave-ios-logout-events-red.log,25 tests/2 failures | weave-ios-logout-events-green.log,25/25 |
| Task cancellation, pending logout across reload, attempt disposal | weave-ios-lifecycle-red.log,28 tests/4 failures     | weave-ios-lifecycle-green.log,28/28     |
| Learned local clear while logout network pending                  | weave-ios-local-clear-red.log,29 tests/1 failure    | weave-ios-local-clear-green.log,29/29   |

Representative T014 assertions were active snapshot nil versus expected active, fresh-validation call0 versus1, error versus challenge, Google transferable nil versus false, and configuration versus verificationRequired. The original shell test passed in that RED run.

Final host regression run, `/private/tmp/weave-ios-final-host.log`, exit0:31 XCTest cases,0 failures. Coverage includes the above behaviors plus deviceTrust resend/invalid/expired/rateLimited retry handling, forged purpose and dispose preserving credentials. This is macOS host testing, separate from the actual iOS build/test result below.

## Approved SDK logging privacy proof

`apps/mobile/scripts/ios-sdk-privacy.sh /private/tmp/weave-auth-upstream/ios/Sources/ClerkKit/Logging/ClerkLogger.swift` compiled the unchanged exact upstream logger with a capture sink/handler and exited1: `FAIL: SDK diagnostic sink or handler exposed seeded data`.

`apps/mobile/scripts/ios-sdk-privacy.sh` compiles the tracked patched source and exits0: `PASS: SDK diagnostic sink and handler redact seeded message/error`. It is also run before every native simulator test script. No real secret was supplied. The approved patch leaves an upstream unused timestampString warning; no unapproved edit was made to silence it.

## Native compile and toolchain results

Xcode27.0 (27A266a), Swift6.4, iPhoneSimulator27.0 SDK are installed. The original xcodebuild project-load exit70 was an IDESimulatorFoundation/DVTDownloads missing `developerDocumentation` symbol, reproduced with explicit DEVELOPER_DIR and bundled xcodebuild. Later `xcrun simctl list` automatically reported Install Started/Install Succeeded for Xcode support content and cleared that failure. No admin, firstLaunch or system-repair command was run. That historical failure is not a current build blocker.

1. Frozen full patched ClerkKit macOS source build exited0, `Build complete! (8.23 secs)`, `/private/tmp/weave-ios-sdk-build.log`:

   ```sh
   CLANG_MODULE_CACHE_PATH=/private/tmp/weave-clang-cache SWIFTPM_MODULECACHE_OVERRIDE=/private/tmp/weave-swift-module-cache swift build --disable-sandbox --package-path apps/mobile/vendor/clerk-ios --scratch-path /private/tmp/weave-ios-swift-build --force-resolved-versions --target ClerkKit
   ```

2. Actual iOS17 simulator Swift cross-build of the full ClerkKit SDK plus authored native contract/service/runtime sources exited0, `Build complete! (9.12 secs)`, `/private/tmp/weave-ios-swift-simulator-build.log`:

   ```sh
   CLANG_MODULE_CACHE_PATH=/private/tmp/weave-clang-cache SWIFTPM_MODULECACHE_OVERRIDE=/private/tmp/weave-swift-module-cache swift build --disable-sandbox --package-path apps/mobile/ios --scratch-path /private/tmp/weave-ios-simulator-swift-build --force-resolved-versions --triple arm64-apple-ios17.0-simulator --sdk /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator27.0.sdk --target WeaveAuthContract
   ```

3. Actual Objective-C++ bridge syntax compile against generated WeaveAuthSpec, generated Swift facade, React VFS and simulator SDK exited0, `/private/tmp/weave-ios-bridge-compile.log`. This narrow probe did not include AppDelegate's generated declaration; the full app subsequently exposed and verified the additional superclass header import.

4. `apps/mobile/scripts/ios-native-tests.sh` exited0 at13:00:33 with `** TEST SUCCEEDED **`: full RN app and real test bundle built,31 XCTest cases passed with0 failures on iPhone17 Pro, iOS26.2 simulator, using the iOS27 SDK and iOS17 deployment target. Frozen locks and no signing were used. Initial integration failures identified missing test PRODUCT_NAME, the generated Swift superclass import, and unnecessary inherited React linkage in a hostless test target; all were corrected before this successful run. Full local log: `/private/tmp/weave-ios-native-tests.log`; result bundle: `apps/mobile/ios/build/native-contracts.xcresult` (ignored build output). This verifies the actual native bridge and simulator contract harness; it does not perform live provider authentication or screen accessibility acceptance.

5. `npm run native:ios --workspace @weave/mobile` exited0 with `** BUILD SUCCEEDED **`, `/private/tmp/weave-ios-final-app-build.log`. This verifies the documented generic iOS simulator app build command and both arm64/x86_64 architectures with frozen package resolution. Existing upstream deprecation/script-phase warnings and a preexisting empty location-usage-description warning remain; none prevented compilation.

## Remaining live/device acceptance limitations

No real Clerk environment, account or owner callback configuration is present. Missing-config behavior is implemented; live S02/S05/S07/S09/S16–S20 authentication/provider acceptance, secure-storage fault injection on a physical device, Google cancellation/recovery on device, VoiceOver, keyboard and large-text checks remain unrun. Native harnesses use synthetic fixtures and actual SDK models; they do not substitute for those acceptance checks. CI itself has not run.

SDK device-token persistence errors can propagate, but the pinned SDK swallows/logs cached-client save errors during identity commit. The authored health probe demonstrates access to a synthetic item and guards observable faults; it cannot prove every later per-key SDK cached-client write/clear succeeds. No SDK persistence behavior patch was authorized or applied. Do not interpret the native tests as proof of that unobservable storage path.
