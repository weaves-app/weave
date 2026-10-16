# WEA-28 convergence

Outcome: **tasks_appended**, not fully converged. English-only source implementation and local automated verification are complete; actual device acceptance and required CI/review remain open.

## Assessment

Assessed the present source/tests against spec.md, plan.md and all 51 original tasks, governed by all ten constitution principles. Checked ten functional requirements, six success criteria, eight scenarios and ten design decisions: exact dependency adoption; typed inventory; root-local engine/resources; interface injection; guarded locale source; provider lifetime; independent pure recovery; presentation-only migration; isolated expanded-text fixture; delivery/verification boundaries.

| Finding | Type    | Severity | Source                                      | Evidence and follow-up                                                                                                                                                                                                            |
| ------- | ------- | -------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | partial | HIGH     | FR-003/FR-009, SC-002/SC-006, S01–S08, T047 | Automated text/accessibility/layout tests and bundles pass; full both-platform matrix is unrun. No Android device/profile or controlled real-provider fixture. See evidence/device-acceptance.md. T052 appended; T047 stays open. |
| F2      | partial | MEDIUM   | plan: delivery sequence, T051               | Draft/Linear publication pending at assessment. T053 appended and may be completed by subsequent delivery; actual URL/status must be recorded.                                                                                    |
| F3      | partial | MEDIUM   | Constitution 9, plan: target policy, T051   | Required external CI/code-owner review pending. Parent PR #12 remains open; stacked base must retarget to develop after parent merge. T054 appended; no bypass.                                                                   |

Three partial findings: one HIGH, two MEDIUM; zero missing, contradictory or unrequested source gaps found. This is a bounded assessment, not proof of unexecuted native UI behavior. Historical planning gates remain documented as planning history; workflow.json records the user's actual confirmation and current execution status.

## Evidence

- 51 independent required messages validated, with shipped-catalog approved-wording oracle. Presentation consumers use typed IDs; BrandLogo's invariant Weave identity is the documented exclusion.
- Exact 0/1/2/60 retry grammar, invalid boundaries, complete numeric tokens and nested-key rejection; provider-free safe fallback/Reload; root/resource isolation and matched foreground runs covered by observed RED/GREEN and regressions. See evidence.md and contracts/scenario-tests.md.
- Final repository verification: policy 279, web 58, API 2, mobile 227 tests; lint, format, types, builds and normal bundles passed. Disposable local PostgreSQL migrations and three integration tests passed.
- Android native contract task and debug APK passed (Gradle reused unchanged native test outputs). iOS 31 native plus 31 host contracts passed; unsigned simulator build passed. Ten fixture bundles include their selected entries/expanded catalog; both normal graphs exclude fixture/auth-fake modules.
- Fresh feature review found two important and one minor issue. Regression RED/GREEN and final 227 tests verify the fixes; external code-owner review remains required.

No extensions.yml exists; before/after convergence hooks are absent. Convergence only appended Phase 7 to tasks.md; this report is subsequent implementation bookkeeping for T050. Continue implementation of T053 now. Complete T052/T054 when their actual prerequisites and required review are available, then rerun convergence. Do not mark the ticket done or merge-ready before those obligations pass.

## Delivery follow-up

F2 is resolved: [draft PR #13](https://github.com/weaves-app/weave/pull/13) was created above PR #12, attached to this chat, and linked to existing Linear WEA-28 with status In Progress. Personal author/committer and GitHub credential were verified, and required pre-push lint/typecheck/tests passed. See workflow.json. F1 and F3 remain open. No check results or review decision were reported at the delivery snapshot. This follow-up is implementation bookkeeping, not a clean rerun of convergence.
