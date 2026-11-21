# Current portfolio status and release evidence

For the later local infrastructure branch checks, see the
[local infrastructure validation record](15-LOCAL-INFRASTRUCTURE-VALIDATION.md). Those checks
are separate from the default-branch baseline below. The later
[local CI lint check](16-LOCAL-CI-LINT-CHECK.md) identifies the exact lint scope and its limits.
The [local unit-suite observation](17-LOCAL-UNIT-SUITE-OBSERVATION.md) records the user's
unit-suite run (404 passed, 2 skipped), the later Redis pass and the focused Linux program check.
The [mutation verification follow-up](18-MUTATION-VERIFICATION.md) records the correction of a
misclassified mutation result and its focused rerun.

**Baseline checked:** 20 November 2026, UAE. This is a synthetic engineering portfolio, not a production release or institutional acceptance. This record is the entry point for current status; update it when a newer baseline is verified. Historical results remain in the [evidence register](12-TESTING-AND-EVIDENCE-REGISTER.md).

## Baseline and evidence

| Item | Recorded state and limit |
|---|---|
| Default branch revision | [`a09dd9f144eea0612b3268ec50ef2b68c160c456`](https://github.com/zenithdevelopers7-source/finagent-enterprise/commit/a09dd9f144eea0612b3268ec50ef2b68c160c456), observed at review. Later changes require their own evidence. |
| Hosted CI | [CI #16](https://github.com/zenithdevelopers7-source/finagent-enterprise/actions/runs/44532646751), triggered by that main-branch commit, completed successfully. Quality, security, web, integration and image jobs reported success. |
| Integration log | Release-blocker selection: **343 passed, 392 deselected**. Full-suite invocation: **724 passed, 11 deselected**. Deselected tests were not executed in the respective invocation. |
| Mutation testing | **82 of 82 defined mutations caught** in that run; this is limited to the selected deliberate changes and tests. |
| Images | CI built images; the job did not push, sign or deploy them. No staging deployment or release is claimed by this record. |
| Environment | GitHub-hosted runners and configured test services using synthetic fixtures; not a bank's production environment. |

The workflow artifact upload step succeeded; availability and retention should be checked on the run. This record does not assert an image digest, staging configuration, external integration, role-based acceptance or approval without the corresponding evidence.

## Synthetic demonstration and control boundaries

Start with the [workspace walkthrough](../workspace-demo-walkthrough.md), then follow the [architecture-to-code map](../02-system-architecture/06-ARCHITECTURE-TO-CODE-MAP.md) and [case study](../07-case-study/08-CASE-STUDY.md). The connected case views depend on available authorized records; the fixed-response assistant and role selector in the workspace preview are illustrative. The separate assistant candidate is disabled. Human review remains responsible for decisions.

## Open work before a release claim

1. **Acceptance and recovery:** run a repeatable synthetic analyst and independent reviewer journey, a denied-access case, a controlled processing failure and recovery, and verify the audit trail against the exact deployed revision. Use the [acceptance record](14-SYNTHETIC-ACCEPTANCE-RECORD.md) to capture role, environment, fixture IDs, times, results and artifacts.
2. **Workflow policy:** decide whether review resumptions and technical failures should consume separate budgets. The [existing observation](12-TESTING-AND-EVIDENCE-REGISTER.md#local-workflow-threshold-observation) characterizes current behavior; it does not settle policy.
3. **AI release gate:** obtain independently reviewed validation and locked release sets, agreed metrics and owners before exposing the assistant candidate. Preserve the existing promotion gate.
4. **Cloud and operations:** validate Terraform and Helm before any approved synthetic staging deployment. Record configuration, artifact digest, deployment, smoke checks, recovery and rollback; template presence is not deployment evidence.
5. **Independent assurance:** collect accessibility, performance, security, privacy and institutional governance evidence with accountable owners. Passing synthetic CI does not replace these assessments.

See [open decisions](../decisions/open-decisions.md), the [evidence plan](07-TESTING-AND-EVIDENCE-PLAN.md), and the [deployment guide](../operations/deployment.md). Release owner, approvals, image digest, deployed environment, configuration version and acceptance sign-off remain **not established**.
