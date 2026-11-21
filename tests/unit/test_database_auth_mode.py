"""Opt-in database identity tests; never connects to a database or Azure."""

import gc
import sys
import types
import unittest
from unittest.mock import patch

from sqlalchemy import event

from finagent.database.session import get_engine


class DatabaseAuthModeTests(unittest.TestCase):
    def tearDown(self):
        get_engine.cache_clear()

    def test_password_mode_preserves_existing_default(self):
        url = "postgresql+psycopg://local:secret@localhost/finagent_test"
        engine = get_engine(url)
        self.assertEqual(engine.url.host, "localhost")
        self.assertEqual(engine.url.password, "secret")
        engine.dispose()

    def test_unknown_mode_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            get_engine("postgresql+psycopg://localhost/db", "unknown")

    def test_azure_mode_attaches_token_before_driver_connect(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")
        scopes = []

        class Credential:
            def get_token(self, scope):
                scopes.append(scope)
                return types.SimpleNamespace(token="synthetic-token")

            def close(self):
                pass

        identity.WorkloadIdentityCredential = Credential
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        with patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}):
            engine = get_engine(url, "azure_workload_identity")

        seen = []

        def stop(dialect, record, args, params):
            seen.append(params["password"])
            raise RuntimeError("stopped before network")

        event.listen(engine, "do_connect", stop)
        try:
            with self.assertRaisesRegex(RuntimeError, "stopped before network"):
                engine.connect()
        finally:
            engine.dispose()
        self.assertEqual(seen, ["synthetic-token"])
        self.assertEqual(scopes, ["https://ossrdbms-aad.database.windows.net/.default"])

    def test_azure_mode_rejects_local_url_before_credential_creation(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")

        def never_create():
            self.fail("credential should not be created")

        identity.WorkloadIdentityCredential = never_create
        with (
            patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}),
            self.assertRaises(ValueError),
        ):
            get_engine("postgresql+psycopg://localhost/db", "azure_workload_identity")

    def test_engine_setup_failure_closes_credential(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")
        closed = []

        class Credential:
            def close(self):
                closed.append(True)

        identity.WorkloadIdentityCredential = Credential
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        with (
            patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}),
            patch(
                "finagent.database.entra_auth.create_azure_postgres_engine",
                side_effect=RuntimeError("setup failed"),
            ),
            self.assertRaisesRegex(RuntimeError, "setup failed"),
        ):
            get_engine(url, "azure_workload_identity")
        self.assertEqual(closed, [True])

    def test_credential_closes_when_cached_engine_is_no_longer_used(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")
        closed = []

        class Credential:
            def close(self):
                closed.append(True)

        class Engine:
            pass

        identity.WorkloadIdentityCredential = Credential
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        with (
            patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}),
            patch(
                "finagent.database.entra_auth.create_azure_postgres_engine",
                side_effect=lambda *args: Engine(),
            ),
        ):
            engine = get_engine(url, "azure_workload_identity")
            self.assertEqual(closed, [])
            get_engine.cache_clear()
            self.assertEqual(closed, [])
            del engine
            gc.collect()
        self.assertEqual(closed, [True])

    def test_pool_reset_preserves_credential_for_new_connections(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")
        closed, requests, observed = [], [], []

        class Credential:
            def get_token(self, scope):
                if closed:
                    raise RuntimeError("credential closed too early")
                requests.append(scope)
                return types.SimpleNamespace(token=f"synthetic-{len(requests)}")

            def close(self):
                closed.append(True)

        identity.WorkloadIdentityCredential = Credential
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        with patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}):
            engine = get_engine(url, "azure_workload_identity")

        def stop(dialect, record, args, params):
            observed.append(params["password"])
            raise RuntimeError("stopped before network")

        event.listen(engine, "do_connect", stop)
        try:
            with self.assertRaisesRegex(RuntimeError, "stopped before network"):
                engine.connect()
            engine.dispose()
            self.assertEqual(closed, [])
            with self.assertRaisesRegex(RuntimeError, "stopped before network"):
                engine.connect()
        finally:
            engine.dispose()
        self.assertEqual(observed, ["synthetic-1", "synthetic-2"])
        self.assertEqual(len(requests), 2)

    def test_failed_token_acquisition_never_reaches_driver(self):
        azure = types.ModuleType("azure")
        azure.__path__ = []
        identity = types.ModuleType("azure.identity")

        class Credential:
            def get_token(self, scope):
                raise RuntimeError("sensitive-credential-detail")

            def close(self):
                pass

        identity.WorkloadIdentityCredential = Credential
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        with patch.dict(sys.modules, {"azure": azure, "azure.identity": identity}):
            engine = get_engine(url, "azure_workload_identity")
        reached_driver = []
        event.listen(engine, "do_connect", lambda *args: reached_driver.append(True))
        try:
            with self.assertRaisesRegex(RuntimeError, "Could not obtain a PostgreSQL access token") as error:
                engine.connect()
        finally:
            engine.dispose()
        self.assertNotIn("sensitive-credential-detail", str(error.exception))
        self.assertEqual(reached_driver, [])


if __name__ == "__main__":
    unittest.main()
