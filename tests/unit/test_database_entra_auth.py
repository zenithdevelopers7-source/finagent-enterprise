"""Synthetic checks for the inactive database token callback; no Azure access required."""

import unittest
from types import SimpleNamespace

try:
    from sqlalchemy import create_engine, event
    from sqlalchemy.engine import make_url
except ImportError:
    create_engine = event = make_url = None

try:
    import psycopg
except ImportError:
    psycopg = None

from finagent.database.entra_auth import (
    POSTGRES_SCOPE,
    PostgresTokenCallback,
    attach_token_callback,
    create_azure_postgres_engine,
    validate_postgres_url,
)


class DatabaseTokenTests(unittest.TestCase):
    @unittest.skipUnless(
        create_engine is not None and psycopg is not None, "SQLAlchemy or psycopg unavailable"
    )
    def test_postgresql_driver_receives_token_before_connection(self):
        # Use the real PostgreSQL dialect and driver, but intercept before network access.
        url = (
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db"
            "?sslmode=verify-full&sslrootcert=%2Fetc%2Ffinagent%2Froot.pem"
        )
        scopes, observed = [], []

        class Credential:
            def get_token(self, scope):
                scopes.append(scope)
                return SimpleNamespace(token=f"synthetic-{len(scopes)}")

        engine = create_azure_postgres_engine(url, Credential(), create_engine, event.listen)

        def capture_and_abort(dialect, record, args, params):
            observed.append((params["password"], params["sslmode"], params["host"], params["sslrootcert"]))
            raise RuntimeError("synthetic stop before connection")

        event.listen(engine, "do_connect", capture_and_abort)
        try:
            for _ in range(2):
                with self.assertRaisesRegex(RuntimeError, "synthetic stop"):
                    engine.connect()
        finally:
            engine.dispose()
        self.assertEqual(scopes, [POSTGRES_SCOPE, POSTGRES_SCOPE])
        self.assertEqual(
            observed,
            [
                ("synthetic-1", "verify-full", "demo.postgres.database.azure.com", "/etc/finagent/root.pem"),
                ("synthetic-2", "verify-full", "demo.postgres.database.azure.com", "/etc/finagent/root.pem"),
            ],
        )

    @unittest.skipUnless(create_engine is not None, "SQLAlchemy not installed")
    def test_real_sqlalchemy_connection_event_requests_tokens(self):
        # Use SQLite's dialect only to exercise the real event dispatcher. Abort before
        # DBAPI connect, so no database or Azure service is contacted.
        engine = create_engine("sqlite://")
        engine.url = make_url(
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        )
        calls = []

        class Credential:
            def get_token(self, scope):
                calls.append(scope)
                return SimpleNamespace(token=f"synthetic-{len(calls)}")

        observed = []
        attach_token_callback(engine, Credential(), event.listen)

        def capture_and_abort(dialect, record, args, params):
            observed.append(params["password"])
            raise RuntimeError("synthetic stop before connection")

        event.listen(engine, "do_connect", capture_and_abort)
        try:
            for _ in range(2):
                with self.assertRaisesRegex(RuntimeError, "synthetic stop"):
                    engine.connect()
        finally:
            engine.dispose()
        self.assertEqual(calls, [POSTGRES_SCOPE, POSTGRES_SCOPE])
        self.assertEqual(observed, ["synthetic-1", "synthetic-2"])

    def test_engine_factory_validates_before_creation_and_attaches_callback(self):
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        engine = SimpleNamespace(url=SimpleNamespace(render_as_string=lambda **kw: url))
        credential = SimpleNamespace(get_token=lambda scope: SimpleNamespace(token="synthetic"))
        calls = []

        def create(candidate, **kwargs):
            calls.append((candidate, kwargs))
            return engine

        def listen(target, event, callback):
            calls.append((target, event, callback))

        self.assertIs(create_azure_postgres_engine(url, credential, create, listen), engine)
        self.assertEqual(calls[0][0], url)
        self.assertTrue(calls[0][1]["pool_pre_ping"])
        self.assertEqual(calls[1][0:2], (engine, "do_connect"))
        with self.assertRaises(ValueError):
            create_azure_postgres_engine("postgresql+psycopg://local/db", credential, create, listen)
        self.assertEqual(len(calls), 2)

    def test_engine_disposed_if_callback_registration_fails(self):
        url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        disposed = []
        engine = SimpleNamespace(
            url=SimpleNamespace(render_as_string=lambda **kw: url), dispose=lambda: disposed.append(True)
        )

        def fail(*args):
            raise RuntimeError("registration failed")

        with self.assertRaisesRegex(RuntimeError, "registration failed"):
            create_azure_postgres_engine(url, object(), lambda *args, **kw: engine, fail)
        self.assertEqual(disposed, [True])

    def test_registers_connection_callback_only_for_a_valid_url(self):
        registered = []
        azure_url = "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        engine = SimpleNamespace(url=SimpleNamespace(render_as_string=lambda **kw: azure_url))
        credential = SimpleNamespace(get_token=lambda scope: SimpleNamespace(token="synthetic"))
        callback = attach_token_callback(
            engine,
            credential,
            lambda *args: registered.append(args),
        )
        self.assertEqual(registered, [(engine, "do_connect", callback)])
        params = {}
        registered[0][2](None, None, [], params)
        self.assertEqual(params["password"], "synthetic")

        with self.assertRaises(ValueError):
            local_url = "postgresql+psycopg://local/db"
            local_engine = SimpleNamespace(url=SimpleNamespace(render_as_string=lambda **kw: local_url))
            attach_token_callback(local_engine, credential, lambda *args: registered.append(args))
        self.assertEqual(len(registered), 1)

    def test_validate_azure_url_rejects_credential_and_tls_downgrades(self):
        validate_postgres_url(
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full"
        )
        validate_postgres_url(
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db"
            "?sslrootcert=%2Fetc%2Ffinagent%2Froot.pem&sslmode=verify-full"
        )
        for url in (
            "postgresql+psycopg://identity:secret@demo.postgres.database.azure.com/db?sslmode=verify-full",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=require",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full&host=evil.test",
            "postgresql+psycopg://identity@evil.test/db?sslmode=verify-full",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full&sslmode=disable",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full&sslrootcert=relative.pem",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full&sslrootcert=/etc/../bad.pem",
            "postgresql+psycopg://identity@demo.postgres.database.azure.com/db?sslmode=verify-full&sslrootcert=/a&sslrootcert=/b",
        ):
            with self.subTest(url=url), self.assertRaisesRegex(ValueError, "Invalid Azure"):
                validate_postgres_url(url)

    def test_new_connections_request_tokens_independently(self):
        class Credential:
            def __init__(self):
                self.calls = []

            def get_token(self, scope):
                self.calls.append(scope)
                return SimpleNamespace(token=f"synthetic-{len(self.calls)}")

        credential = Credential()
        callback = PostgresTokenCallback(credential)
        first, second = {}, {}
        callback(None, None, [], first)
        callback(None, None, [], second)
        self.assertEqual(credential.calls, [POSTGRES_SCOPE, POSTGRES_SCOPE])
        self.assertEqual((first["password"], second["password"]), ("synthetic-1", "synthetic-2"))

    def test_failure_does_not_replace_password_or_expose_credential_error(self):
        class Credential:
            def get_token(self, scope):
                raise ValueError("sensitive-example")

        params = {"password": "original"}
        with self.assertRaisesRegex(RuntimeError, "Could not obtain") as error:
            PostgresTokenCallback(Credential())(None, None, [], params)
        self.assertNotIn("sensitive-example", str(error.exception))
        self.assertEqual(params["password"], "original")

    def test_empty_token_is_rejected(self):
        credential = SimpleNamespace(get_token=lambda scope: SimpleNamespace(token=""))
        with self.assertRaises(RuntimeError):
            PostgresTokenCallback(credential)(None, None, [], {})


if __name__ == "__main__":
    unittest.main()
