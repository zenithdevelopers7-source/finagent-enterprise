# Production UI and system work tracker

This tracker records areas to complete and verify. A checked item requires evidence from the target environment and acceptance by the responsible owners; the presence of code, a synthetic demonstration, or a type check alone is not production acceptance. The first priority is the UI and dashboard, followed by the remaining integration and release work.

## 1. UI and dashboard
- [ ] Complete a consistent, connected experience across the workspace and existing portal.
- [ ] Verify desktop, mobile, keyboard, screen-reader, loading, empty, error, and access-denied states.
- [ ] Identify illustrative or unavailable capabilities clearly.

Current work in the integration copy includes connected case navigation, overview and document/report usability, responsive table wrappers, and shared loading, error, and not-found states. An isolated frontend production build and focused UI checks passed. A synthetic browser check at 390 × 844 passed for opening the mobile workspace menu by keyboard and closing it with Escape while restoring focus. Selected screens have been inspected with synthetic case data; a complete visual, keyboard, screen-reader, contrast, role, and high-volume acceptance pass has not been completed. The workspace still includes illustrative functions. These items remain open until the full experience is verified.

The current sign-in flows return to the overview after authentication, including after session expiry; they do not restore a selected case or deep link. The sign-in screen explains this limitation. A future return-to flow must validate same-origin destinations and be verified for local, password, Google, and Entra flows before it is presented as supported.

Earlier combined verification: 52 frontend rendering and behavior tests passed, and an optimized frontend build completed in an isolated verification copy. These checks cover selected cases, reports, evidence and navigation states; they do not replace a full browser journey or accessibility review. Transaction pagination is performed in the interface after records are loaded, so it does not establish backend performance at production volumes.

On 21 November 2026, the operator reported a successful isolated web build and **2 browser tests passed in 18.66 seconds** at revision `df02bf4cf80b04b390e10e436dc02dd8561e8fb6`. These synthetic tests check keyboard opening and closing of the mobile workspace navigation, focus return, and keyboard scrolling of the mobile transactions table at a 390 × 844 viewport. An earlier attempt had been blocked by a local database container process failure. The passing run does not establish screen-reader support, contrast, other viewport coverage, or full accessibility acceptance; no test report artifact was supplied.

## 2. Analyst investigation
- [ ] Verify the complete journey from authorized case queue through evidence, investigation, report, and submission.
- [ ] Verify assignment, blockers, escalation, rework, and reopening across relevant roles.

## 3. Transactions and risk
- [ ] Verify authorized source data, filters, currency-aware summaries, recorded indicators, and evidence drill-down.
- [ ] Verify stale, missing, conflicting, and historical data states.

## 4. Documents and evidence
- [ ] Verify upload, scanning, quarantine, extraction, corrections, versioning, and authorized viewing.
- [ ] Verify source search, conflicts, snapshots, and provenance across the full case journey.

## 5. Reports and independent review
- [ ] Verify drafting, validation, version comparison, submission, independent review, decisions, and exports.
- [ ] Verify drift, separation of duties, authentication requirements, and failure states.

## 6. Assistant and bilingual evidence
- [ ] Define approved use cases, user interaction, language coverage, and acceptance criteria.
- [ ] Evaluate grounding, retrieval, citations, injection resistance, and case and tenant isolation.
- [ ] Keep the experimental candidate disabled until its integration and release controls are approved and verified.

## 7. Identity and access
- [ ] Verify the selected live identity provider, session handling, roles, tenant and case scope, and step-up authentication.

## 8. Supervisor and operations
- [ ] Verify workload, escalations, workflow recovery, monitoring, audit, and authorized operational controls.

## 9. AI evaluation and release
- [ ] Verify evaluation datasets, metrics, review, release approval, monitoring, and rollback for the intended configuration.

## 10. Security, data, and integrations
- [ ] Verify external adapters in the intended environment; review secrets, encryption, retention, scanning, and access isolation.
- [ ] Complete independent security review and organization-specific legal and compliance review.

## 11. Test and release
- [ ] Complete end-to-end role-based acceptance, accessibility, performance, recovery, backup, and restore testing.
- [ ] Validate staging and deployment configuration, document limitations, and obtain required release approvals.

## Evidence so far

The repository documents a local synthetic end-to-end journey and targeted browser, rendering, and security checks. Connected workspace pages and UI changes have also been tested selectively. Live services, full UI acceptance, and production deployment are not established by that evidence. Consult `implementation-status.md` and the test records for the scope of earlier checks.
