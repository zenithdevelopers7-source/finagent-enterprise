# Local CI lint check

**Recorded:** 21 November 2026. **Revision checked:** `28803dc` on `fix/infra-validation`.
This is a local check, not a hosted CI result or a production approval.

The commands below match the lint task in `scripts/tasks.py` and the Makefile. With Ruff 0.17.0,
the lint check passed and the format check reported **292 files already formatted**.

```text
ruff check src tests scripts apps/worker apps/mock-bank
ruff format --check src tests scripts apps/worker apps/mock-bank
```

An earlier, broader `ruff check .` reported 83 findings in files outside this CI lint scope,
including `packages` and `typings`. That broader command is not the project's configured lint
task; its findings have not been resolved. The commands above do not certify those files.

The CI quality job also runs type checking and tests. A later local check at commit `75e06a6`,
using Python 3.12 and mypy 2.4.0, passed for **191 source files**. An earlier attempt found four
missing `webauthn` imports; the project's pinned `webauthn==3.0.1` was subsequently downloaded
from PyPI and installed in an isolated local type-check folder. The project's existing virtual
environment was not modified. Two new database identity type errors were corrected before the
successful check.

This is a local result: hosted CI, the full test suite, live Azure connectivity and production
readiness are **not verified** for this revision. Raw command output was not retained separately.
