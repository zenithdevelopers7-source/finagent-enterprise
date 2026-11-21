# Local infrastructure and database identity validation

**Recorded:** 20 November 2026. **Scope:** synthetic, local verification of commit
`72f757c` on `fix/infra-validation`. This record does not establish production readiness,
an Azure deployment, or an independent review. Later code changes need their own validation.

| Check | Result | Practical limit |
|---|---|---|
| Database authentication unit checks | 17 passed | Synthetic credentials; SQLAlchemy and psycopg checks stop before connecting. |
| Migration authentication selection | 3 passed | Mocked Alembic context and engine; no migration executed. |
| Helm render verification | Passed | Synthetic values; no Kubernetes cluster or CSI driver. |
| Terraform validation | Passed | Provider schema validation in an isolated copy; no Azure account accessed. |
| Terraform mocked tests | 6 passed | Mock provider and simulated plans; no real Azure plan or resources. |

The Terraform validation copy's `main.tf`, `variables.tf`, `outputs.tf`, lock file and test
file matched the repository files by SHA-256 immediately after the checks. Local tools included
Terraform 1.11.4, AzureRM provider 4.81.0 and Helm 3.17.3. The Python checks used locally
available project dependencies; the full application, browser, image-build and security suites
were not rerun for this record. Raw test output was not retained as a separate artifact.

Run the focused checks from the repository root in a prepared Python environment:

```powershell
python -m unittest discover -s tests/unit -p 'test_database*auth*.py' -v
python -m unittest discover -s tests/unit -p 'test_migration_database_auth_mode.py' -v
python infra/helm/verify_render.py --helm helm
```

For Terraform, run `terraform init -backend=false`, `terraform validate`, and `terraform test`
in an isolated copy of `infra/terraform` using the pinned provider. These are local checks;
review a real plan separately before any deployment. Do not apply a configuration as part of
the checks.

Remaining work includes actual Azure identity and database access, certificate trust, credential
and token expiry behavior, identity and database role provisioning, cluster policy enforcement,
container builds and full regression testing. See the [Terraform reference](../../infra/terraform/README.md)
and [Helm reference](../../infra/helm/README.md) for current limitations.

## Linux provider checksum follow-up

GitHub Actions [run #23](https://github.com/zenithdevelopers7-source/finagent-enterprise/actions/runs/44877681587)
failed the infrastructure job at `3b015da`: Terraform installed AzureRM on Linux but its
unpacked package did not match the existing lock-file package hash. The Windows lock file did
not include an `h1` hash for the Linux package. Hosted Helm checks in that job were skipped.

The Linux `h1` hash was calculated from the official AzureRM 4.81.0 Linux archive after verifying
its ZIP SHA-256 against an existing `zh` checksum in the lock file. The same directory-hash
method reproduced the existing Windows `h1` value from the locally installed provider. The Linux
hash was added without changing the provider version. Windows backend-free initialization with
the read-only lock, validation, and all six mocked tests then passed. Terraform's own
cross-platform lock command could not complete locally because of temporary-folder access
errors; the Linux fix was not yet verified at that point.

GitHub Actions [run #24](https://github.com/zenithdevelopers7-source/finagent-enterprise/actions/runs/44878502791)
subsequently passed the infrastructure job at `1d5aa3d`: Terraform validation and all six
mock-provider tests passed, followed by Helm lint and synthetic render checks. This verifies the
Linux checksum and the configured CI checks for that revision; it does not establish an Azure
deployment or cluster behavior. Check the workflow link for the outcome of the other jobs.
