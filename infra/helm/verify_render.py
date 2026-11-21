"""Check the migration bootstrap in a synthetic Helm render (no cluster required)."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import yaml


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--helm", default="helm", help="Helm executable")
    args = parser.parse_args()
    chart = Path(__file__).resolve().parent / "finagent"
    command = [
        args.helm,
        "template",
        "finagent",
        str(chart),
        "--set",
        "workloadIdentity.clientIdMigrator=synthetic-migrator-id",
        "--set",
        "migration.databaseUrlSecretName=synthetic-migration-secret",
        "--set",
        "workloadIdentity.clientIdApi=synthetic-api-id",
        "--set",
        "workloadIdentity.clientIdWorker=synthetic-worker-id",
        "--set",
        "workloadIdentity.clientIdWeb=synthetic-web-id",
    ]
    result = subprocess.run(command, check=True, capture_output=True, text=True)  # noqa: S603
    documents = [item for item in yaml.safe_load_all(result.stdout) if item]
    assert not any(item.get("kind") == "Ingress" for item in documents), "ingress must default to disabled"
    config = next(item for item in documents if item.get("kind") == "ConfigMap")["data"]
    assert config["FINAGENT_DATABASE_AUTH_MODE"] == "password"
    assert config["FINAGENT_WEB_AUTH_MODE"] == "entra"
    assert config["FINAGENT_WEB_ORIGIN"].startswith("https://")
    assert config["FINAGENT_API_URL"].startswith("https://")
    jobs = [item for item in documents if item.get("kind") == "Job"]
    assert len(jobs) == 1
    job = jobs[0]
    assert job["metadata"]["annotations"]["helm.sh/hook"] == "pre-install,pre-upgrade"
    assert job["spec"]["activeDeadlineSeconds"] == 600
    pod = job["spec"]["template"]["spec"]
    assert pod["serviceAccountName"] == "finagent-migrator"
    container = pod["containers"][0]
    for section in ("requests", "limits"):
        assert all(container["resources"][section].get(key) for key in ("cpu", "memory"))
    migration_env = {item["name"]: item["value"] for item in container["env"]}
    assert migration_env["FINAGENT_MIGRATION_DATABASE_AUTH_MODE"] == "password"
    assert container["securityContext"]["runAsUser"] == 10001
    assert not container.get("envFrom"), "migration must not import application secrets"
    assert any(m["name"] == "migration-secret" and m["readOnly"] for m in container["volumeMounts"])
    volume = next(v for v in pod["volumes"] if v["name"] == "migration-secret")
    class_name = volume["csi"]["volumeAttributes"]["secretProviderClass"]
    classes = [item for item in documents if item.get("kind") == "SecretProviderClass"]
    migration_class = next(item for item in classes if item["metadata"]["name"] == class_name)
    annotations = migration_class["metadata"]["annotations"]
    assert annotations["helm.sh/hook"] == "pre-install,pre-upgrade"
    job_weight = int(job["metadata"]["annotations"].get("helm.sh/hook-weight", "0"))
    assert int(annotations["helm.sh/hook-weight"]) < job_weight
    assert annotations["helm.sh/hook-delete-policy"] == "before-hook-creation"
    params = migration_class["spec"]["parameters"]
    assert params["clientID"] == "synthetic-migrator-id"
    objects = yaml.safe_load(params["objects"])["array"]
    assert len(objects) == 1
    secret = yaml.safe_load(objects[0])
    assert secret["objectName"] == "synthetic-migration-secret"
    assert secret["objectAlias"] == "migration-database-url"
    assert "FINAGENT_MIGRATION_DATABASE_URL" in container["args"][0]
    assert 'test -n "$FINAGENT_MIGRATION_DATABASE_URL"' in container["args"][0]
    assert container["command"] == ["/bin/sh", "-ec"]

    policies = {d["metadata"]["name"]: d["spec"] for d in documents if d["kind"] == "NetworkPolicy"}
    bootstrap = next(
        d
        for d in documents
        if d["kind"] == "NetworkPolicy" and d["metadata"]["name"] == "finagent-migrator-bootstrap"
    )
    assert bootstrap["metadata"]["annotations"]["helm.sh/hook"] == "pre-install,pre-upgrade"
    assert int(bootstrap["metadata"]["annotations"]["helm.sh/hook-weight"]) < job_weight
    assert bootstrap["spec"]["podSelector"]["matchLabels"] == {
        "app": "finagent-migrator",
        "app.kubernetes.io/part-of": "finagent",
    }
    assert bootstrap["spec"]["ingress"] == [] and bootstrap["spec"]["egress"] == []
    assert policies["finagent-default-deny"]["podSelector"]["matchLabels"] == {
        "app.kubernetes.io/part-of": "finagent"
    }
    assert job["spec"]["template"]["metadata"]["labels"]["app.kubernetes.io/part-of"] == "finagent"
    deployments = [d for d in documents if d["kind"] == "Deployment"]
    assert len(deployments) == 3
    budgets = {d["metadata"]["name"]: d["spec"] for d in documents if d["kind"] == "PodDisruptionBudget"}
    assert set(budgets) == {"finagent-api", "finagent-worker", "finagent-web"}
    for name, budget in budgets.items():
        assert budget["minAvailable"] == 1
        assert budget["selector"]["matchLabels"] == {"app": name, "app.kubernetes.io/part-of": "finagent"}
    assert all(
        d["spec"]["template"]["metadata"]["labels"]["app.kubernetes.io/part-of"] == "finagent"
        for d in deployments
    )
    expected_web = {
        "FINAGENT_WEB_SESSION_SECRET",
        "FINAGENT_WEB_AUTH_REDIS_URL",
        "FINAGENT_ENTRA_WEB_CLIENT_SECRET",
    }
    expected_backend = {
        "FINAGENT_DATABASE_URL",
        "FINAGENT_DATA_ENCRYPTION_KEY",
        "FINAGENT_EVENT_SIGNING_KEY",
        "FINAGENT_CONNECTOR_CREDENTIALS",
        "FINAGENT_AZURE_SEARCH_API_KEY",
        "FINAGENT_AZURE_OPENAI_API_KEY",
    }
    classes_by_name = {item["metadata"]["name"]: item for item in classes}
    assert set(classes_by_name) == {"finagent-api-kv", "finagent-worker-kv", "finagent-web-kv", class_name}
    for deployment in deployments:
        name = deployment["metadata"]["name"].removeprefix("finagent-")
        spec = deployment["spec"]["template"]["spec"]
        assert spec["terminationGracePeriodSeconds"] == (120 if name == "worker" else 30)
        assert spec["serviceAccountName"] == f"finagent-{name}"
        workload = spec["containers"][0]
        for section in ("requests", "limits"):
            assert all(workload["resources"][section].get(key) for key in ("cpu", "memory"))
        assert workload["securityContext"]["runAsUser"] == (10003 if name == "web" else 10001)
        if name == "api":
            assert workload["startupProbe"]["httpGet"] == {"path": "/health/live", "port": 8000}
            assert workload["startupProbe"]["periodSeconds"] == 5
            assert workload["startupProbe"]["failureThreshold"] == 30
            assert workload["readinessProbe"]["httpGet"]["path"] == "/health/ready"
        secret_ref = next(v["secretRef"]["name"] for v in workload["envFrom"] if "secretRef" in v)
        assert secret_ref == f"finagent-{name}-secrets"
        volume_ref = next(
            v["csi"]["volumeAttributes"]["secretProviderClass"] for v in spec["volumes"] if "csi" in v
        )
        assert volume_ref == f"finagent-{name}-kv"
        workload_class = classes_by_name[volume_ref]
        assert workload_class["spec"]["parameters"]["clientID"] == f"synthetic-{name}-id"
        synced = workload_class["spec"]["secretObjects"][0]
        assert synced["secretName"] == secret_ref
        keys = {entry["key"] for entry in synced["data"]}
        assert keys == (expected_web if name == "web" else expected_backend)
        requested = yaml.safe_load(workload_class["spec"]["parameters"]["objects"])["array"]
        object_names = {yaml.safe_load(item)["objectName"] for item in requested}
        assert object_names == {entry["objectName"] for entry in synced["data"]}
    assert policies["finagent-web-ingress"]["ingress"] == []
    for role in ("api", "worker", "migrator"):
        assert policies[f"finagent-{role}-egress"]["egress"] == []
    web_egress = policies["finagent-web-egress"]["egress"]
    assert len(web_egress) == 1
    assert web_egress[0]["ports"] == [{"port": 8000, "protocol": "TCP"}]
    assert web_egress[0]["to"][0]["podSelector"]["matchLabels"]["app"] == "finagent-api"

    peer = {"namespaceSelector": {"matchLabels": {"name": "synthetic-ingress"}}}
    egress = {"to": [{"ipBlock": {"cidr": "192.0.2.0/24"}}], "ports": [{"port": 5432, "protocol": "TCP"}]}
    configured = subprocess.run(  # noqa: S603
        [
            *command,
            "--set-json",
            f"networkPolicy.webIngressPeers={json.dumps([peer])}",
            "--set-json",
            f"networkPolicy.egress.migrator={json.dumps([egress])}",
            "--set-json",
            f"networkPolicy.egress.web={json.dumps([egress])}",
            "--set",
            "ingress.enabled=true",
            "--set",
            "ingress.className=synthetic-controller",
            "--set",
            "ingress.host=finagent.example.test",
            "--set",
            "ingress.tlsSecretName=synthetic-tls",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    configured_docs = [item for item in yaml.safe_load_all(configured.stdout) if item]
    configured_policies = {
        d["metadata"]["name"]: d["spec"] for d in configured_docs if d["kind"] == "NetworkPolicy"
    }
    assert configured_policies["finagent-web-ingress"]["ingress"][0]["from"] == [peer]
    assert configured_policies["finagent-web-ingress"]["ingress"][0]["ports"][0]["port"] == 3000
    assert configured_policies["finagent-migrator-egress"]["egress"] == [egress]
    assert configured_policies["finagent-migrator-bootstrap"]["egress"] == [egress]
    assert len(configured_policies["finagent-web-egress"]["egress"]) == 2
    assert configured_policies["finagent-web-egress"]["egress"][1] == egress
    ingress = next(d for d in configured_docs if d["kind"] == "Ingress")
    assert ingress["spec"]["ingressClassName"] == "synthetic-controller"
    assert ingress["spec"]["tls"] == [{"hosts": ["finagent.example.test"], "secretName": "synthetic-tls"}]
    route = ingress["spec"]["rules"][0]
    assert route["host"] == "finagent.example.test"
    assert route["http"]["paths"][0]["backend"]["service"] == {"name": "finagent-web", "port": {"number": 80}}
    for invalid in (
        "migration.resources.limits.cpu=null",
        "migration.resources.requests=null",
        "api.resources.requests.memory=null",
        "worker.resources.requests.cpu=null",
        "web.resources.limits.memory=null",
        "web.resources=null",
        'config.FINAGENT_DATABASE_AUTH_MODE="invalid"',
        'migration.databaseAuthMode="invalid"',
        "worker.terminationGracePeriodSeconds=0",
        "worker.terminationGracePeriodSeconds=3601",
        "migration.activeDeadlineSeconds=0",
        "migration.activeDeadlineSeconds=86401",
        'migration.secretProviderClassName="finagent-api-kv"',
        "secretProviderClass.secrets.web=null",
        "networkPolicy.webIngressPeers=[{}]",
        'networkPolicy.egress.api=[{"to":[{}],"ports":[{"port":443}]}]',
        'networkPolicy.egress.api=[{"to":[{"ipBlock":{"cidr":"192.0.2.0/24"}}]}]',
        'networkPolicy.egress.api=[{"to":[{"ipBlock":{"cidr":"192.0.2.0/24"}}],"ports":[{}]}]',
    ):
        rejected = subprocess.run(  # noqa: S603
            [*command, "--set-json", invalid], capture_output=True, text=True, check=False
        )
        assert rejected.returncode != 0, f"unsafe rule unexpectedly accepted: {invalid}"
    for invalid, expected in (
        (["--set", "ingress.enabled=true"], "ingress.className is required"),
        (
            [
                "--set",
                "ingress.enabled=true",
                "--set",
                "ingress.className=synthetic",
                "--set",
                "ingress.host=*.example.test",
                "--set",
                "ingress.tlsSecretName=synthetic",
                "--set-json",
                f"networkPolicy.webIngressPeers={json.dumps([peer])}",
            ],
            "without wildcards",
        ),
        (
            [
                "--set",
                "ingress.enabled=true",
                "--set",
                "ingress.className=synthetic",
                "--set",
                "ingress.host=finagent.example.test",
                "--set",
                "ingress.tlsSecretName=synthetic",
            ],
            "networkPolicy.webIngressPeers is required",
        ),
        (
            [
                "--set",
                "ingress.enabled=true",
                "--set",
                "ingress.className=synthetic",
                "--set",
                "ingress.host=finagent.example.test",
                "--set-json",
                f"networkPolicy.webIngressPeers={json.dumps([peer])}",
            ],
            "ingress.tlsSecretName is required",
        ),
    ):
        rejected = subprocess.run([*command, *invalid], capture_output=True, text=True, check=False)  # noqa: S603
        assert rejected.returncode != 0, f"unsafe ingress unexpectedly accepted: {invalid}"
        assert expected in rejected.stderr
    print("Helm checks passed: resources, secrets, migration, ingress and network (synthetic; no cluster).")


if __name__ == "__main__":
    main()
