"""Engine and session factory. Sync SQLAlchemy: FastAPI runs sync endpoints in a threadpool and
the R1 pilot load (NQ §2: 10 rps) does not justify async complexity. Revisit with load evidence."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from weakref import finalize

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker


@lru_cache(maxsize=4)
def get_engine(url: str, auth_mode: str = "password") -> Engine:
    if auth_mode == "password":
        return create_engine(url, pool_pre_ping=True, pool_size=10, max_overflow=10)
    if auth_mode != "azure_workload_identity":
        raise ValueError("Unsupported database authentication mode")
    from azure.identity import WorkloadIdentityCredential

    from finagent.database.entra_auth import create_azure_postgres_engine, validate_postgres_url

    validate_postgres_url(url)
    credential = WorkloadIdentityCredential()
    try:
        engine = create_azure_postgres_engine(url, credential, create_engine, event.listen)
        # dispose() can be followed by engine reuse; close only when the engine is no longer used.
        finalize(engine, credential.close)
        return engine
    except Exception:
        credential.close()
        raise


def session_factory(url: str, auth_mode: str = "password") -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(url, auth_mode), expire_on_commit=False)


@contextmanager
def transaction(factory: sessionmaker[Session]) -> Iterator[Session]:
    """One explicit transaction boundary: commit on success, rollback on any error."""
    session = factory()
    try:
        with session.begin():
            yield session
    finally:
        session.close()
