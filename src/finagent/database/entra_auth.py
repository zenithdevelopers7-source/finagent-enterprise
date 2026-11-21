"""Experimental token callback for new Azure PostgreSQL connections.

The experimental engine path is opt-in and has not been validated against Azure.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol
from urllib.parse import parse_qsl, urlsplit

POSTGRES_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"


class DisposableEngine(Protocol):
    def dispose(self) -> None: ...


def validate_postgres_url(url: str) -> None:
    """Reject unsafe public-Azure connection URLs before selecting token authentication.

    This experimental policy covers Azure public-cloud DNS only; private DNS aliases and
    sovereign clouds need a separately reviewed identity and hostname-verification design.
    """
    try:
        parsed = urlsplit(url)
        hostname = parsed.hostname
        _ = parsed.port  # Reject malformed ports.
        query = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
        keys = [key for key, _ in query]
        options = dict(query)
        root_cert = options.get("sslrootcert")
        valid_cert = root_cert is None or (
            root_cert.startswith("/")
            and "\\" not in root_cert
            and "\x00" not in root_cert
            and ".." not in root_cert.split("/")
        )
        valid = (
            parsed.scheme == "postgresql+psycopg"
            and bool(parsed.username)
            and parsed.password is None
            and hostname is not None
            and hostname.endswith(".postgres.database.azure.com")
            and hostname != ".postgres.database.azure.com"
            and bool(parsed.path.strip("/"))
            and not parsed.fragment
            and len(keys) == len(set(keys))
            and set(keys) in ({"sslmode"}, {"sslmode", "sslrootcert"})
            and options.get("sslmode") == "verify-full"
            and valid_cert
        )
    except ValueError:
        valid = False
    if not valid:
        raise ValueError("Invalid Azure PostgreSQL URL for token authentication")


class TokenCredential(Protocol):
    def get_token(self, *scopes: str, **kwargs: Any) -> Any: ...


class PostgresTokenCallback:
    """Insert a freshly requested token when SQLAlchemy creates a DBAPI connection."""

    def __init__(self, credential: TokenCredential) -> None:
        self._credential = credential

    def __call__(self, dialect: Any, connection_record: Any, cargs: Any, cparams: dict[str, Any]) -> None:
        try:
            token = self._credential.get_token(POSTGRES_SCOPE).token
            if not isinstance(token, str) or not token:
                raise ValueError("empty token")
        except Exception:
            # Credential errors may contain sensitive details; do not forward them into logs.
            raise RuntimeError("Could not obtain a PostgreSQL access token") from None
        cparams["password"] = token


def attach_token_callback(
    engine: Any,
    credential: TokenCredential,
    listen: Callable[..., Any],
) -> PostgresTokenCallback:
    """Attach the experimental callback after validating the Azure-only URL.

    The caller must supply SQLAlchemy's event.listen; local engines never use this helper.
    """
    validate_postgres_url(engine.url.render_as_string(hide_password=False))
    callback = PostgresTokenCallback(credential)
    listen(engine, "do_connect", callback)
    return callback


def create_azure_postgres_engine[EngineType: DisposableEngine](
    url: str,
    credential: TokenCredential,
    create_engine: Callable[..., EngineType],
    listen: Callable[..., Any],
) -> EngineType:
    """Build an inactive-by-default Azure engine without opening a database connection.

    The caller owns the credential lifecycle.
    """
    validate_postgres_url(url)
    engine = create_engine(url, pool_pre_ping=True, pool_size=10, max_overflow=10)
    try:
        attach_token_callback(engine, credential, listen)
    except Exception:
        engine.dispose()
        raise
    return engine
