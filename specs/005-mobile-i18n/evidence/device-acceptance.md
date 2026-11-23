# Device acceptance status

WEA-28 S01–S08 agreement is confirmed. T047 is **open**, not passed.

## Available prerequisites

- Android SDK and Java 17 are installed. Android native contracts and debug APK build passed. `adb devices -l` returned no devices; `emulator -list-avds` returned no profiles. No Android UI journey was executed.
- Xcode and iOS 26.2 simulators are available. The native test runner executed 31 contracts on an iOS simulator; 31 host contracts and unsigned simulator compilation passed. No full i18n UI acceptance journey was executed.
- No controlled real-provider accounts/challenges were established for this run. The test-only expanded-English fixture supplies synthetic Login, verification, Home, retry and recovery without provider/network access, and all ten platform bundle configurations passed. Synthetic results do not verify real providers.

## Remaining matrix

| Scenarios | Android                               | iOS                                   | Required evidence                                                                                    |
| --------- | ------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| S01       | Unrun                                 | Unrun                                 | Password/email-code/Google, verification, Home, sign-out and feedback with controlled accounts       |
| S02       | Unrun                                 | Unrun                                 | English and non-English OS settings, activation and foreground English                               |
| S03       | Unrun                                 | Unrun                                 | TalkBack / VoiceOver labels, hints, focus, actions and announcements                                 |
| S04       | Unrun                                 | Unrun                                 | Native retry feedback; exact numeric boundaries already pass deterministically                       |
| S05       | Automated pass                        | Automated pass                        | Resource faults are deterministic shared tests; supplement with startup/recovery journeys            |
| S06       | Unrun                                 | Unrun                                 | Offline startup/error, provider-free recovery and functioning Reload with accessibility              |
| S07       | Automated pass; native journeys unrun | Automated pass; native journeys unrun | Foreground, root Reload and real restart preserve native session gate                                |
| S08       | Unrun                                 | Unrun                                 | Baseline/expanded copy at all nine phone/tablet orientation/font combinations from scenario-tests.md |

The two automated-pass rows refer to shared tests, not execution on a physical device. All layout-prop and accessibility-tree tests pass but do not prove actual clipping, focus or announcements. Keep the parent WEA-10/WEA-27 live-auth, enlarged-text landscape and accessibility acceptance gaps attributed to those tickets. New regressions, if found during this matrix, must be reproduced and fixed before marking acceptance complete.

Run the explicit fixture commands in [quickstart](../quickstart.md#native-expanded-english-fixture), then restore normal Metro by restarting without the fixture config. Record device/OS/font/language/fixture and actual outcomes here. No simulated or inferred result may close T047.
