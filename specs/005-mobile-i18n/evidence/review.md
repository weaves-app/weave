# WEA-28 whole-feature review

One fresh-context read-only reviewer inspected the authored diff plus new source/tests against the spec, plan, tasks and constitution. No files or Git state were changed by the reviewer. Reviewer independently ran 9 localization suites / 83 tests on the pre-fix candidate.

## Findings and remediation

- Important: retry substring checks allowed count 1 to display 10, -1 or 1.0 after resource corruption. New tests reproduce complete numeric-token corruption and incorrect English units for both copied and post-initialization engine resources. Templates are now validated before engine initialization, and runtime/pure output requires exactly one complete intended numeric token and the correct English unit.
- Important: i18next nesting could resolve an unknown nested key into a raw identifier; pure fallback could display the marker. New tests reproduce both paths. Catalog/fallback boundaries now reject nesting syntax, and every engine lookup disables nesting. Unknown nested identifiers cannot reach controls.
- Minor: direct shipped catalog validation/approved wording comparison was implicit through fixture transformation. Added direct checks against the independent complete English fixture.

Actual behavioral failures are in [review-red.txt](review-red.txt). After correction and refactoring, all 29 mobile suites / 227 tests and the renderer privacy probe passed in [review-green.txt](review-green.txt); complete mobile lint/typecheck passed. A missing helper import during the fix was corrected and was not counted as behavioral RED. No second reviewer or new product scope was added.

## Review boundaries retained

Native clipping/touch/keyboard/VoiceOver/TalkBack/enlarged text; real native startup/restart/offline/provider/Intl journeys; native compilation, database/repository validation, CI/code-owner approval; and normal bundle graph exclusion require their own evidence. Reviewer did not claim these ran. The executor separately records bundle graph exclusion and local verification results. TDD evidence records observed tests but is not independent proof of every historical action. Parent foreground refresh/reset behavior and parent acceptance gaps remain preserved. Additional production languages, RTL, remote resources and persisted preference remain out of scope.
