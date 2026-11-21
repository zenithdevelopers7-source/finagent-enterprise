# Synthetic case acceptance record

**Status: synthetic browser journey passed locally; formal acceptance remains open.** This is not a staging or production approval. Formal acceptance criteria and accountable institutional owners remain open under [DEC-12](../decisions/open-decisions.md).

**Hosted CI for the tested API revision:** [GitHub Actions run #25](https://github.com/zenithdevelopers7-source/finagent-enterprise/actions/runs/44879796510) completed successfully for `d45b60918cdb8cbb67b72d716e51d4838bc3819a`: quality, security, web, infrastructure reference validation, integration, and images jobs passed. These checks complement the local observations below; they do not establish an Azure deployment or formal acceptance. Later commits require their own checks.

**Isolated browser run, 21 November 2026:** the operator reported a successful production web build and **1 passed in 44.11 seconds** for `tests/browser/test_ui_journey.py` at revision `614030f4728d0088542327e3d11e140f4a6f358b`. The runner exported that Git revision into a separate source snapshot, installed the locked web dependencies, built the web app and ran the browser journey against the disposable local `finagent_test` database. The test covers the synthetic analyst, reviewer and supervisor journey; the result is operator-reported and no test report artifact or exact execution time was provided. This is not an Azure or production acceptance test.

**Local API and worker acceptance run, 21 November 2026:** the operator reported **1 passed in 21.06 seconds** for `tests/e2e/test_acceptance_journey.py::test_full_human_reviewed_investigation_journey` at clean revision `d45b60918cdb8cbb67b72d716e51d4838bc3819a`. The runner checked the revision and the identity of the disposable local `finagent_test` database before execution; its schema was reset. This separate synthetic test exercises authorization boundaries, human review, a simulated interruption and worker recovery, a single mock-bank operation, and audit-chain checks. The result is operator-reported; no test report artifact or exact execution time was supplied. It does not establish Azure connectivity, live-bank behavior, staging acceptance, or production readiness.

**Local reconciliation run, 21 November 2026:** the operator reported **1 passed in 30.38 seconds** for `tests/integration/test_aml_workflow.py::test_uncertain_status_write_is_reconciled_never_blindly_retried` at revision `d45b60918cdb8cbb67b72d716e51d4838bc3819a`, with only this evidence document modified. The test uses a disposable local database and a synthetic mock bank. It checks that a timed-out write is held as outcome uncertain, is not automatically retried, and can be reconciled by an operator before the workflow resumes; it asserts a single mock-bank status call. This operator-reported result has no attached test report and does not demonstrate recovery against a real bank.

**Latest local run, 20 November 2026:** the operator ran `tests/browser/test_ui_journey.py` with the browser marker using the isolated `finagent-acceptance-baseline` working tree and disposable `finagent_test` database. The reported result was **1 passed in 43.10 seconds**. The tested web source files matched the corresponding files in `finagent-ready` by SHA-256. The working-tree browser test was subsequently reformatted in its failure diagnostic to satisfy lint; rerun it to establish evidence for that exact file. Both trees contain uncommitted changes based on `2f44700`. This run covers the synthetic analyst, reviewer and supervisor journey implemented in that test, including completion and reopening checks. It is not evidence of a committed release, a live-bank integration, full accessibility assessment, or production readiness.

**Additional local web checks, 20 November 2026:** the working tree passed 59 interface rendering and behavior tests, 88 authentication tests (`npm run test:auth`), and 18 passkey proxy tests (`npm run test:passkeys`). The authentication and passkey suites were run through their dedicated scripts because they prepare their own test dependencies. These local results are separate from the browser journey and the hosted CI baseline.

The workflow changes were subsequently committed locally as `4cf4d4d`. The browser journey was run on the corresponding uncommitted source before the test diagnostic formatting change described above; it has not been rerun against the committed revision. The CI baseline in the portfolio status record predates this commit.

**Patched dependency run, 20 November 2026:** after the pull-request web audit flagged Next.js 15.5.28, the isolated test build was updated to 15.5.29. The operator reran the browser journey against the disposable `finagent_test` database and reported **1 passed in 42.10 seconds**. The web application files involved in the journey, package manifests, and browser test matched `finagent-ready` by SHA-256. Local build and production dependency audit also passed; the audit reported zero vulnerabilities at the time. The change is committed locally as `74b45d2`; GitHub CI must still run on the pushed patch and the eventual merge revision.

**First local attempt, 20 November 2026:** the operator ran the browser test against an isolated copy at commit `2f44700`; it failed at the initial unauthenticated redirect assertion (1 failed). An independently inspected local web response contained a streamed sign-in redirect, and a browser reached the sign-in page. The test was updated locally to wait for that redirect and explicitly select synthetic test authentication. The updated full journey has not yet been rerun; the cause and full outcome remain unconfirmed until it passes.

**Later local attempt, 20 November 2026:** sign-in succeeded and the synthetic workflow was recorded as `WAITING_REVIEW`, but the case page stayed on “Working…” and the expected confirmation did not appear. Browser diagnostics observed an HTTP 303 response for the action. The redirect completion problem remains under investigation; the browser acceptance journey failed and independent review and completion were not established by this run.

**Earlier isolated investigation:** the production web build displayed the confirmation with a minimal synthetic mock API, including a `WAITING_REVIEW` run. This did not establish a root cause or fix; the full browser journey had failed at that point.

Further testing reproduced the stalled confirmation using a recorded synthetic case response. An earlier candidate display change failed the full browser journey and was removed. Subsequent changes to action confirmations and test synchronization were included in the later passing local run above; the underlying cause of the original redirect behavior remains unconfirmed.

## Purpose and scope

Demonstrate one synthetic `TM_STRUCTURING` case from assignment through evidence review, draft and independent review. Separately verify denied access, an interrupted operation and its recovery, and the audit trail. Use an isolated test environment and disposable database; these tests can reset their configured schema. Never target a shared or live database.

## Release evidence still to collect

The local observations above identify the tested API revision and reported results. The following fields describe the separate, complete release packet; a local test pass does not fill them automatically.

| Field | Actual recorded value |
|---|---|
| Revision and branch | API tests: `d45b609`; isolated browser build and test: `614030f`, both on `fix/infra-validation`. The release commit and corresponding build and tests remain to be recorded. |
| Environment and operator | NOT RECORDED: isolated environment, date/time and operator |
| Web build | NOT RECORDED: exact source revision, build command and result |
| Test dependencies | NOT RECORDED: isolated database and Redis identity, browser and fixture versions; never include credentials |
| Synthetic identities and case | NOT RECORDED: role labels, fixture and case IDs; synthetic data only |
| CI / local run | API and reconciliation commands and operator-reported results are above; collect full release test counts and durable artifacts. |
| Recovery and audit | Synthetic test assertions and results are described above; preserve the detailed output and review them for the release packet. |
| Review and exceptions | NOT RECORDED: reviewer, findings, evidence locations and outstanding limitations |

## Traceable acceptance checks

| Scenario | Existing executable evidence | Record for this baseline |
|---|---|---|
| Analyst and independent reviewer complete a case in Chromium | [`test_ui_journey.py`](../../tests/browser/test_ui_journey.py) signs in as distinct roles, starts work, reviews evidence, submits a draft and records a review decision | PASS locally, operator-reported, 21 November 2026: 1 passed in 44.11 seconds on isolated revision `614030f`. The full release evidence and browser version still need recording. |
| Unauthorized and cross-tenant review or evidence access | [`test_acceptance_journey.py`](../../tests/e2e/test_acceptance_journey.py) checks self-approval denial, other-role denial and cross-tenant resource denial | PASS in the operator-reported API test at `d45b609`, 21 November 2026; no detailed test artifact was supplied. |
| Interrupted external operation and recovery | The same API-level acceptance test injects a crash around the synthetic downstream status operation, resumes with a second worker, probes and checks a single confirmed operation | PASS in the same API test. This is a synthetic mock write, not evidence of live-bank recovery. |
| Case transitions and audit integrity | The same API-level test checks key audit actions, audit-chain verification and the completed timeline | PASS in the same API test; preserve a test artifact in a future release packet. |
| Uncertain external outcome | [`test_aml_workflow.py`](../../tests/integration/test_aml_workflow.py) includes an uncertain-write and reconciliation scenario | PASS locally, operator-reported, 21 November 2026 at `d45b609`: one test passed in 30.38 seconds. The test checks the uncertain hold, operator reconciliation, resumed workflow and one mock status call. |
| Accessibility and role-specific UI | Browser test includes some role and MFA controls; the [UI work tracker](../production-ui-work-tracker.md) and [evidence plan](07-TESTING-AND-EVIDENCE-PLAN.md) cover broader assessment | NOT RUN. Automated browser checks do not replace screen-reader, keyboard, contrast and device review. |

## Execution precautions

The default pytest configuration deselects browser tests. The browser journey needs a production web build made from the **same revision**, Chromium, a running synthetic mock bank, and isolated test services. The fixture starts the API, web process and worker; see the test and project setup before running it. The documented `python scripts/tasks.py test-browser` runs the browser suite; an individual test can be selected with `python -m pytest -m browser tests/browser/test_ui_journey.py -q --tb=short` once those prerequisites and the disposable test database are configured. Record any failed, skipped or deselected checks as such.

The API test and browser test are separate demonstrations. Do not claim a single uninterrupted staging run combines their observations. For a release packet, add real outputs and artifact links, the approved image digest and configuration where applicable, and sign-off only when actual owners have reviewed them.
