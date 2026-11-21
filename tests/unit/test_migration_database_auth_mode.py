"""Verify Alembic selects the intended database auth mode without connecting."""

import os
import runpy
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

MIGRATION_ENV = Path(__file__).resolve().parents[2] / "src/finagent/database/migrations/env.py"


class MigrationDatabaseAuthTests(unittest.TestCase):
    def run_migration(self, variables):
        engine = MagicMock()
        context = MagicMock()
        with (
            patch.dict(os.environ, variables, clear=True),
            patch("finagent.database.session.get_engine", return_value=engine) as get_engine,
            patch("alembic.context", context),
        ):
            runpy.run_path(str(MIGRATION_ENV))
        context.run_migrations.assert_called_once()
        return get_engine

    def test_existing_migration_defaults_to_password(self):
        get_engine = self.run_migration({"FINAGENT_MIGRATION_DATABASE_URL": "synthetic-local-url"})
        get_engine.assert_called_once_with("synthetic-local-url", "password")

    def test_migration_can_inherit_application_mode(self):
        get_engine = self.run_migration(
            {
                "FINAGENT_DATABASE_URL": "synthetic-url",
                "FINAGENT_DATABASE_AUTH_MODE": "azure_workload_identity",
            }
        )
        get_engine.assert_called_once_with("synthetic-url", "azure_workload_identity")

    def test_migration_override_is_separate_from_application_mode(self):
        get_engine = self.run_migration(
            {
                "FINAGENT_MIGRATION_DATABASE_URL": "synthetic-migration-url",
                "FINAGENT_DATABASE_AUTH_MODE": "password",
                "FINAGENT_MIGRATION_DATABASE_AUTH_MODE": "azure_workload_identity",
            }
        )
        get_engine.assert_called_once_with("synthetic-migration-url", "azure_workload_identity")


if __name__ == "__main__":
    unittest.main()
