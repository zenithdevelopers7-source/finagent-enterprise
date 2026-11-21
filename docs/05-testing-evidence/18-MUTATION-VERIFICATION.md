# Mutation verification follow-up

**Recorded:** 21 November 2026. This is synthetic test evidence, not an independent security
assessment or a production approval.

GitHub Actions run [#20](https://github.com/zenithdevelopers7-source/finagent-enterprise/actions/runs/44871838676)
reported 82 of 82 mutations caught at commit `4af5e2f`. One result,
`snapshot-immutability-trigger`, ended with a pytest error. The original runner classified all
pytest exit-code-1 results as caught, including errors, so that individual result did not
establish that the intended assertion caught the mutation.

Commit `5bcdf07` changes the runner to inspect a JUnit report and classify errors, skipped
tests, missing reports and malformed reports as errors. It also narrows the snapshot mutation
to the snapshot tables. Previously it removed a document trigger required by migration 0011,
which could prevent the test from reaching its assertion.

The local classifier and mutation-shape tests reported **10 passed**. A separate synthetic
mutation was caught in an isolated source copy, with the target file restored byte-for-byte.

The user then reported running the revised `snapshot-immutability-trigger` mutation from an
isolated source copy at `5bcdf07` against the disposable `finagent_test` database. The runner
reported **1 mutation caught**, with **1 pytest failure in 14.91 seconds** and no test error or
skip in the report. This is a user-reported focused result, not a rerun of all 82 mutations.
Raw output was shared in the conversation and was not retained as a separate artifact.

The updated mutation runner still requires a complete GitHub Actions rerun. Azure connectivity,
production deployment and independent security review remain unverified.
