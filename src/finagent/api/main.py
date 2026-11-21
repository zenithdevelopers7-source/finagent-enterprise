"""FastAPI application factory (prompt §22, §42; SPR-017).

Error responses never contain stack traces, input values, provider payloads or secrets.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from finagent import __version__
from finagent.api.password_body_limit import PasswordBodyLimit
from finagent.api.routers.access_catalog import access_catalog
from finagent.api.routers.admin import admin
from finagent.api.routers.auth import auth
from finagent.api.routers.email_verification import email_verification_api
from finagent.api.routers.evidence import evidence
from finagent.api.routers.governance import governance
from finagent.api.routers.knowledge import knowledge
from finagent.api.routers.ops import ops
from finagent.api.routers.passkeys import passkey_api
from finagent.api.routers.password_auth import password_auth
from finagent.api.routers.review import review_api
from finagent.api.routers.totp_auth import totp_auth
from finagent.api.routers.v1 import api, health
from finagent.api.routers.workflows import workflows
from finagent.core.config import Settings, get_settings
from finagent.core.correlation import (
    accept_or_generate,
    get_correlation_id,
    set_correlation_id,
)
from finagent.core.errors import SAFE_MESSAGES, AppError, ErrorCode, error_body
from finagent.core.logging import configure_logging
from finagent.database.session import session_factory
from finagent.documents.runtime import build_document_scanner, build_store
from finagent.security.authentication.resolver import ResolverPolicy
from finagent.security.authentication.tokens import build_validator
from finagent.security.authorization.policy import Permission, Role
from finagent.security.rate_limit import build_rate_limiter
from finagent.services.document_service.ingest import DocumentPorts
from finagent.services.knowledge_service.retrieval import build_retriever

log = logging.getLogger("finagent.api")
MAX_JSON_BODY_BYTES = 1 * 1024 * 1024  # uploads use the document pipeline, not JSON bodies


def _json_error(
    code: ErrorCode,
    status: int,
    message: str | None = None,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    msg = message or SAFE_MESSAGES.get(code, code.value.replace("_", " ").capitalize() + ".")
    return JSONResponse(status_code=status, content=error_body(code, msg, get_correlation_id(), details))


def _is_upload(request: Request) -> bool:
    path = request.url.path
    return request.method == "POST" and (
        path == "/api/v1/documents" or (path.startswith("/api/v1/documents/") and path.endswith("/versions"))
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging()
    app = FastAPI(
        title="FinAgent Enterprise API",
        version=__version__,
        openapi_url="/api/v1/openapi.json",
        docs_url=None if settings.environment.value == "production" else "/docs",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.session_factory = session_factory(
        settings.database_url.get_secret_value(), settings.database_auth_mode
    )
    app.state.token_validator = build_validator(settings)
    app.state.resolver_policy = ResolverPolicy(
        step_up=frozenset(Permission(p) for p in settings.mfa_step_up_permissions),
        delegable_roles=frozenset(Role(r) for r in settings.delegable_roles),
        break_glass_enabled=settings.break_glass_enabled,
    )
    app.state.rate_limiter = build_rate_limiter(
        settings.rate_limit_backend,
        settings.redis_url.get_secret_value() if settings.redis_url else None,
    )
    app.state.document_ports = DocumentPorts(build_store(settings), build_document_scanner(settings))
    app.state.retriever = build_retriever(settings)

    app.add_middleware(PasswordBodyLimit)

    @app.middleware("http")
    async def correlation_and_limits(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        cid = accept_or_generate(request.headers.get("correlation-id"))
        set_correlation_id(cid)
        length = request.headers.get("content-length")
        # Document uploads stream raw bodies with their own (larger) counted limit; every other
        # body is bounded here.
        limit = settings.document_max_bytes if _is_upload(request) else MAX_JSON_BODY_BYTES
        if request.url.path == "/api/v1/auth/password/login":
            limit = 4096
        if length and length.isdigit() and int(length) > limit:
            response: Response = _json_error(ErrorCode.PAYLOAD_TOO_LARGE, 413)
        else:
            response = await call_next(request)
        response.headers["Correlation-Id"] = cid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError) -> JSONResponse:
        response = _json_error(exc.code, exc.status_code, exc.message, exc.details)
        response.headers.update(exc.headers)
        if exc.code is ErrorCode.MFA_REQUIRED:
            response.headers["WWW-Authenticate"] = 'Bearer error="insufficient_user_authentication"'
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        if any(e.get("type") == "json_invalid" for e in errors):
            return _json_error(ErrorCode.MALFORMED_REQUEST, 400, "Request body is not valid JSON.")
        # Field paths and error types only - never echo input values (DIR §3 value handling).
        fields = [{"loc": [str(p) for p in e.get("loc", ())], "type": e.get("type")} for e in errors]
        return _json_error(
            ErrorCode.SCHEMA_VALIDATION_FAILED,
            400,
            "Request failed schema validation.",
            {"errors": fields},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        mapping = {
            401: ErrorCode.UNAUTHENTICATED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            413: ErrorCode.PAYLOAD_TOO_LARGE,
            429: ErrorCode.RATE_LIMITED,
        }
        code = mapping.get(exc.status_code, ErrorCode.MALFORMED_REQUEST)
        return _json_error(code, exc.status_code)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_error", extra={"error_type": type(exc).__name__})
        return _json_error(ErrorCode.INTERNAL_ERROR, 500)

    app.include_router(auth)
    app.include_router(password_auth)
    app.include_router(email_verification_api)
    app.include_router(totp_auth)
    app.include_router(passkey_api)
    app.include_router(health)
    app.include_router(api)
    app.include_router(access_catalog)
    app.include_router(admin)
    app.include_router(workflows)
    app.include_router(evidence)
    app.include_router(knowledge)
    app.include_router(review_api)
    app.include_router(ops)
    app.include_router(governance)
    return app
