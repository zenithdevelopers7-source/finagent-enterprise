# Local unit-suite observation

**Recorded:** 21 November 2026. **Revision tested:** `75afef9` on `fix/infra-validation`.
This is a partial, local result, not a passed release gate or a hosted CI result.

`python -m pytest tests/unit -q --tb=short -p no:cacheprovider` was run with Python 3.12,
the existing project dependencies and an isolated copy of the pinned WebAuthn dependencies.
A fresh, uniquely named test temporary directory was used. The result was **401 passed,
3 failed, 2 skipped and 23 subtests passed**.

The three failures were:

- `test_sandbox_isolates_parsing_with_time_and_memory_limits` in `test_documents.py`.
- Both cases of `test_real_parser_transport_returns_enforced_metadata` in
  `test_parser_network_isolation.py`. Both reported `PARSER_LINUX_ENGINE_UNAVAILABLE`.

The sandbox session could not access the Docker engine, and `wsl --status` failed due to its
logon session. An initial run also encountered a temporary directory permission error; the
fresh-directory rerun resolved that error.

## Follow-up in the user's terminal

On 21 November 2026, the user reported rerunning the two named test functions in their own
PowerShell session against `finagent-ready`: **3 passed in 4.54 seconds**, including both
parameterized parser transport cases. This is a user-reported focused result, not a complete
rerun of the unit suite or hosted CI. It shows that the three parser cases passed in that terminal;
the isolated session's runtime-access failure is not evidence of a parser defect there.

The user subsequently reported running the complete `tests/unit` selection from the same
checkout in their PowerShell session, with `FINAGENT_TEST_DATABASE_URL` deliberately unset:
**404 passed, 2 skipped and 23 subtests passed in 11.30 seconds**. The skips were the
real-Redis rate-limiter test and the Linux-only seccomp runtime test. The Redis test carries an
integration marker and was skipped because the shared test configuration also requires
`FINAGENT_TEST_DATABASE_URL`; it separately requires `FINAGENT_TEST_REDIS_URL`. This is a
user-reported local result; raw output was provided in the conversation, not retained as a
separate artifact. It does not establish a hosted CI result or Azure integration.

The user then reported running `test_redis_rate_limiter_against_real_redis` using the verified
disposable local Redis service: **1 passed in 0.08 seconds**. This focused result covers the
Redis case that the full unit-suite run had skipped. It is user-reported and does not change the
historical full-suite count.

The user also reported running the program embedded in
`test_native_network_and_process_syscalls_are_denied` inside the existing
`finagent-parser:isolated-v1` Linux image with a disposable container, disabled networking,
read-only filesystem, dropped capabilities and a non-root user. The program reported that its
network and process restrictions were confirmed. This is a user-reported **focused program
check**, not a pytest execution of the skipped Linux test or a full Linux test suite. Image
digest and raw output were not recorded, and Docker's own policies also apply to the container.

The skipped tests were the Redis rate-limiter integration test (gated by the unset
`FINAGENT_TEST_DATABASE_URL`) and a Linux-only seccomp runtime test. They were **not run**,
not passed in the original full-suite run. No test database was reset, no Azure service was
contacted and no cloud resources were created. Raw console output was not retained separately.
The Redis case has since passed separately and the Linux test program has passed in the parser
container. A full Linux pytest run and independently verified image and security evidence remain
outstanding.
