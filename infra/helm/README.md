# Helm chart `finagent`

**Status: LOCAL RENDER ONLY; NOT READY TO INSTALL.** On 20 November 2026, Helm 3.17.3 linted
and rendered the default chart after two YAML syntax fixes. This did not validate a Kubernetes
cluster, identities, secrets, networking, migration, or deployment. Default values contain
placeholders. No chart was installed. Migration credentials and network-policy renders were
checked with synthetic values by `verify_render.py`.

The CI workflow now defines a Helm lint and synthetic-render job. Hosted execution of that job
remains unverified until a run on the commit containing it completes; it does not install the chart.

The reference chart describes api, worker and web workloads, a migration job, Key Vault secrets,
non-root containers, default-deny networking and workload PodDisruptionBudgets. Before any staging
attempt, address and test these blockers against the selected environment:

- The API image definition installs the Azure adapter dependencies and checks that they import
  during image build. The updated image has not been built or tested against Azure in this local
  validation. Build and scan the actual release image and test its configured adapters before use.
- The web image definition copies the workspace's public images into its standalone runtime.
  Build the release image and check those assets over HTTP before deployment; the current image
  definition has not been container-tested here.
- The chart uses the web image's non-root user ID 10003; the API, worker, and migration use
  their image user ID 10001. Verify file and mounted-secret permissions in the target cluster.
- Workload termination grace periods are configurable. The proposed worker default is 120 seconds
  because the default parser and model timeouts can each be 60 seconds; this is not a guarantee
  that every operation completes before shutdown. Choose settings using the actual configured
  timeouts and validate forced termination, lease recovery and duplicate handling in the cluster.
- The chart requires CPU and memory requests and limits for the API, worker, web and migration
  job. Values are proposals, not sizing evidence. Helm checks their presence, not whether the
  values are appropriate or sufficient; review quantities and test actual workload behavior.
- The API, worker and web each have a PodDisruptionBudget requiring one available pod during
  voluntary evictions. A single-replica deployment can therefore block a node drain; plan
  maintenance and capacity accordingly. Budgets do not prevent involuntary outages or guarantee
  availability, and their behavior has not been tested on a cluster.
- The API startup probe allows a proposed 150 seconds for its live endpoint before Kubernetes
  considers startup failed. Readiness remains a separate database check. Tune these settings from
  measured startup times and validate probe behavior in the target cluster; the web and worker
  still need independently reviewed health and monitoring strategies.

- Default deny now selects only pods labelled as part of FinAgent. The chart explicitly permits
  web-to-api traffic; web ingress and all other egress remain denied unless the operator supplies
  reviewed `networkPolicy.webIngressPeers` and per-workload `networkPolicy.egress` rules. Each
  egress rule must include destinations and ports. Define and test the required DNS, database,
  identity, secret-store and service endpoints for the chosen environment; the chart does not
  invent CIDRs or grant Internet access by default. Kubernetes policies are additive, and CNI
  enforcement and any other policies must be verified in the actual cluster. See the
  [Kubernetes network policy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
- The pre-install migration job now mounts a dedicated CSI SecretProviderClass and reads only its
  configured migration database URL from a file; it no longer depends on the application pods to
  sync application secrets. The migration SecretProviderClass is a Helm hook with an earlier
  weight than the job so Helm creates it before the pre-install or pre-upgrade job. Supply a
  separately authorized migration credential and the migrator
  workload identity. This bootstrap has only been rendered locally and must be tested on a fresh
  cluster with the Azure CSI driver. Each application workload now has an independently configured
  identity, SecretProviderClass and synced Kubernetes Secret. The web container receives only its session,
  Redis and Entra client secrets by default, rather than database or backend credentials. The
  CSI driver's [sync documentation](https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret)
  states that syncing requires a pod mounting the volume.
- Migration jobs have a proposed 600-second deadline to avoid waiting indefinitely for a secret,
  identity, network or database that is unavailable. Choose an appropriate deadline and Helm
  timeout for the environment, and test failure handling and migration recovery; a timeout does
  not by itself establish whether a migration committed changes. The migration secret class name
  must differ from the three application secret classes.
- **Database authentication is an unresolved deployment blocker:** the Terraform reference
  disables PostgreSQL password authentication. An experimental workload-identity mode exists for
  the application and migration, but is disabled by default and has not been tested with Azure.
  Set `config.FINAGENT_DATABASE_AUTH_MODE` for the API/worker and the separate
  `migration.databaseAuthMode` only in an approved test configuration. These settings can differ
  deliberately; verify that each selected mode matches its database URL and identity.
  Supplying a static URL through CSI alone does not complete identity setup. See the
  [Terraform reference](../terraform/README.md#database-authentication-remains-unverified).
- A migration bootstrap NetworkPolicy is created as an earlier hook than the migration job. It
  denies ingress and defaults to denying egress; explicitly configured migrator egress is allowed.
  The separate ordinary policy remains in effect after installation. Kubernetes policies are
  additive: other policies may grant additional traffic. CNI enforcement, required destinations,
  and policy timing must be verified in the target cluster. Helm hook resources are not managed
  like ordinary release resources; review the bootstrap policy and migration SecretProviderClass
  lifecycle and cleanup during upgrades and uninstall.
- Service accounts, workload identity bindings, required private endpoints and approved
  configuration must be supplied and verified separately. The Terraform reference defines
  separate api, worker, web and migrator identities, and creates no Key Vault secret-reader
  assignments by default. Operators must explicitly configure approved secret names for each
  identity and reconcile them with the chart's CSI values. Separate mounts alone do not restrict
  what an Azure identity can retrieve: inherited roles and other assignments also need review.
  The example is documented in the [Terraform reference](../terraform/README.md). Rendering
  does not establish that the CSI secret references or identities work.
- The optional Ingress is disabled by default. Enabling it requires an explicit controller class,
  hostname, TLS secret and allowed ingress peers. TLS termination, HTTP-to-HTTPS enforcement and
  certificate management depend on the selected controller and must be verified in the cluster.
  The web staging values contain placeholders. Supply actual approved Entra settings, HTTPS
  origin, TLS Redis session store and HTTPS API URL for the chosen environment; the application's
  local HTTP defaults are not valid for staging.

Chart 0.2.0 changes `secretProviderClass.secrets` from one flat map to separate `api`, `worker`
and `web` maps and uses separate `finagent-<workload>-kv` and `finagent-<workload>-secrets`
resources. Any previously prepared values or secret-bootstrap automation must be updated before
using this reference chart.

The following illustrates the values shape only. The namespace, labels and documentation-only
CIDR are synthetic; this is not a complete or deployable staging configuration. In particular,
DNS and the api, worker and web external dependencies remain blocked until separately configured.

```yaml
networkPolicy:
  webIngressPeers:
    - namespaceSelector:
        matchLabels: {kubernetes.io/metadata.name: synthetic-ingress}
      podSelector:
        matchLabels: {app: synthetic-ingress-controller}
  egress:
    migrator:
      - to:
          - ipBlock: {cidr: 192.0.2.0/24}
        ports:
          - {port: 5432, protocol: TCP}
```

Every peer and CIDR must be reviewed for the cluster: Kubernetes combines applicable policies,
and a broad selector or `ipBlock` can permit more traffic than intended.

```powershell
helm lint infra/helm/finagent
helm template finagent infra/helm/finagent -f my-values.yaml   # review before any install
python infra/helm/verify_render.py --helm helm  # requires PyYAML from the development dependencies
```
