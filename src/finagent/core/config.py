"""Typed, fail-closed configuration (prompt Â§43; ADR-0008).

Startup fails when mandatory settings are missing or an unsafe combination is configured,
for example the local development token issuer outside local/test environments.
"""

from __future__ import annotations

import base64
import json
import re
from enum import StrEnum
from functools import lru_cache
from typing import Literal
from uuid import UUID

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGING = "staging"
    PRODUCTION = "production"


class AuthMode(StrEnum):
    LOCAL = "local"  # development issuer - local/test only
    ENTRA = "entra"  # Microsoft Entra ID OIDC
    GOOGLE = "google"  # first-party Google web client ID credentials


LOCAL_ONLY_ENVIRONMENTS = frozenset({Environment.LOCAL, Environment.TEST})
LOCAL_ISSUER = "finagent-local-dev"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FINAGENT_", env_file=".env", extra="ignore")

    environment: Environment
    database_url: SecretStr
    database_auth_mode: Literal["password", "azure_workload_identity"] = "password"
    auth_mode: AuthMode
    api_audience: str = "finagent-api"

    local_passkeys_enabled: bool = False
    passkey_rp_id: str = ""
    passkey_origin: str = ""
    passkey_enrollment_principals: list[str] = Field(default_factory=list)
    local_connector_auth_enabled: bool = False
    email_verification_enabled: bool = False
    gmail_sender: str | None = Field(
        default=None, pattern=r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$"
    )
    gmail_app_password: SecretStr | None = None
    email_verification_key: SecretStr | None = None
    local_totp_enabled: bool = False
    local_totp_key: SecretStr | None = None
    password_login_enabled: bool = False
    dev_jwt_secret: SecretStr | None = None

    google_web_client_id: str | None = Field(
        default=None, pattern=r"^[A-Za-z0-9_-]{1,200}\.apps\.googleusercontent\.com$"
    )

    entra_issuer: str | None = None
    entra_jwks_url: str | None = None
    entra_required_scope: str = Field(default="access_as_user", pattern=r"^[A-Za-z0-9._-]{1,100}$")

    page_size_default: int = Field(default=50, ge=1, le=100)  # NQ section 3 (PROPOSED)
    page_size_max: int = Field(default=100, ge=1, le=500)
    idempotency_retention_days: int = Field(default=30, ge=1)  # DATA-D05 local default
    approval_reject_effect: str = Field(default="REWORK", pattern="^(REWORK|CLOSE)$")  # DEC-11
    case_status_write_enabled: bool = False  # DATA-D06: OFF until approved

    # SPR-005 / SEC-D02: permissions that need an MFA-satisfied session (step-up). Local default;
    # the approved authentication policy may add to it but production cannot empty it.
    mfa_step_up_permissions: list[str] = Field(
        default_factory=lambda: [
            "approval:decide",
            "case:assign",
            "tenant:admin",
            "policy:publish",
            "export:create",
            "operation:reconcile",
            "breakglass:activate",
        ]
    )
    # FR-003 / DEC-06: delegation is explicit and time-bounded; only these roles may be delegated.
    delegable_roles: list[str] = Field(default_factory=lambda: ["ANALYST", "REVIEWER"])
    delegation_max_days: int = Field(default=30, ge=1, le=180)
    # SPR-008 / SEC-D03: break-glass is DISABLED until an owner approves the process.
    break_glass_enabled: bool = False
    break_glass_max_minutes: int = Field(default=60, ge=5, le=240)
    # NQ-028: request-rate quotas (PROPOSED). Token buckets per principal and per tenant.
    rate_limit_backend: str = Field(default="memory", pattern="^(memory|redis)$")
    redis_url: SecretStr | None = None
    rate_limit_principal_per_minute: int = Field(default=600, ge=1)
    rate_limit_principal_burst: int = Field(default=60, ge=1)
    rate_limit_tenant_per_minute: int = Field(default=3000, ge=1)
    rate_limit_tenant_burst: int = Field(default=300, ge=1)

    # Workflow runtime (P4). PROPOSED defaults: AI-D05 (limits), DATA-D05 (retries/replay).
    queue_backend: str = Field(default="postgres", pattern="^(postgres|servicebus)$")
    servicebus_namespace: str | None = None  # e.g. myns.servicebus.windows.net (managed identity)
    servicebus_queue_name: str = "finagent-events"
    lease_ttl_seconds: int = Field(default=30, ge=5, le=600)
    run_max_attempts: int = Field(default=3, ge=1, le=10)
    retry_backoff_seconds: int = Field(default=5, ge=1, le=3600)
    outbox_max_attempts: int = Field(default=10, ge=1, le=100)
    consumer_max_deliveries: int = Field(default=5, ge=1, le=50)
    max_steps_per_run: int = Field(default=12, ge=1, le=100)  # MST:AG-002 (PROPOSED, tunable)
    # Key Vault-provided in deployed environments; local/test fall back to published dev keys.
    data_encryption_key: SecretStr | None = None  # base64url, 32 bytes (AES-256-GCM)
    event_signing_key: SecretStr | None = None  # base64url, >= 32 bytes (HMAC-SHA256)
    notification_backend: str = Field(default="local", pattern="^(local|file|bank)$")
    notification_dir: str = "var/notifications"  # file backend only (local development)

    # Bank connectors (P5). DATA-D01/D04/D05 are OPEN: values are PROPOSED local defaults.
    bank_base_url: str = "http://127.0.0.1:8100"  # synthetic mock bank locally; https required elsewhere
    connector_credentials: SecretStr | None = None  # JSON {"<tenant-slug>": "<api key>"} from Key Vault
    connector_timeout_seconds: float = Field(default=5.0, gt=0, le=60)
    connector_max_attempts: int = Field(default=3, ge=1, le=6)
    connector_circuit_failures: int = Field(default=5, ge=1)
    connector_circuit_reset_seconds: float = Field(default=30.0, gt=0)
    source_max_age_hours: float = Field(default=24.0, gt=0)  # DATA-D04 freshness threshold
    document_max_bytes: int = Field(default=20 * 1024 * 1024, ge=1024)  # DIR-014 PROPOSED 20 MiB

    # Documents and evidence (P6). SEC-D07 / DATA-D04 are OPEN: PROPOSED limits.
    malware_scanner: str = Field(default="local-test", pattern="^(local-test|clamd)$")
    clamd_host: str | None = None
    clamd_port: int | None = Field(default=None, ge=1, le=65535)
    blob_backend: str = Field(default="local", pattern="^(local|azure)$")
    blob_local_root: str = "var/blobs"
    azure_blob_account_url: str | None = None
    azure_blob_container: str = "finagent-documents"
    parser_timeout_seconds: float = Field(default=60.0, gt=0, le=600)
    parser_memory_mb: int = Field(default=768, ge=64, le=8192)
    parser_max_pages: int = Field(default=200, ge=1, le=5000)
    parser_max_rows: int = Field(default=50_000, ge=1)
    parser_max_compression_ratio: int = Field(default=100, ge=2)
    parser_max_uncompressed_mb: int = Field(default=100, ge=1)
    document_max_attempts: int = Field(default=3, ge=1, le=10)
    download_link_ttl_seconds: int = Field(default=300, ge=10, le=3600)  # SPR-012 short-lived
    retention_execution_enabled: bool = False  # destructive retention disabled by default
    ocr_backend: str = Field(default="none", pattern="^(none|tesseract)$")  # tesseract is local/test only

    # Policy retrieval (P7). Local BM25 is the development adapter (ADR-0007).
    retrieval_backend: str = Field(default="local", pattern="^(local|azure)$")
    azure_search_endpoint: str | None = None
    azure_search_index: str = Field(default="finagent-policies", pattern=r"^[a-z0-9][a-z0-9-]{1,127}$")
    azure_search_api_key: SecretStr | None = None

    # Model gateway (P8). DEC-07 / AI-D03 / AI-D05 are OPEN: mock provider, PROPOSED limits.
    model_provider: str = Field(default="mock", pattern="^(mock|azure_openai)$")
    azure_openai_endpoint: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_api_key: SecretStr | None = None
    model_timeout_seconds: float = Field(default=60.0, gt=0, le=600)
    model_max_retries: int = Field(default=2, ge=0, le=5)  # classified transient errors only
    model_max_repairs: int = Field(default=1, ge=0, le=1)  # prompt Â§10: at most ONE repair
    model_retry_backoff_seconds: float = Field(default=1.0, ge=0, le=60)
    model_price_per_1k_input: str = Field(default="0", pattern=r"^\d+(\.\d+)?$")  # mock: zero cost
    model_price_per_1k_output: str = Field(default="0", pattern=r"^\d+(\.\d+)?$")
    run_token_budget: int = Field(default=150_000, ge=1)
    run_cost_budget: str = Field(default="10.00", pattern=r"^\d+(\.\d+)?$")
    tenant_monthly_cost_budget: str = Field(default="500.00", pattern=r"^\d+(\.\d+)?$")
    # AER-031..034: refuse model calls unless the current configuration hash is PROMOTED for the tenant.
    require_promoted_configuration: bool = False  # mandatory (True) outside local/test
    # SYNTHETIC structuring indicator (DEC-02 / AI-D02): not an institutional rule.
    aml_threshold_amount: str = Field(default="10000.00", pattern=r"^\d+(\.\d+)?$")
    aml_threshold_currency: str = Field(default="AED", pattern=r"^[A-Z]{3}$")
    aml_threshold_band_pct: str = Field(default="10", pattern=r"^\d+(\.\d+)?$")

    @model_validator(mode="after")
    def _fail_closed(self) -> Settings:
        if self.local_passkeys_enabled:
            if (
                self.environment not in LOCAL_ONLY_ENVIRONMENTS
                or not self.password_login_enabled
                or not self.email_verification_enabled
            ):
                raise ValueError("passkeys require local/test password sign-in and email verification")
            if not re.fullmatch(
                r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9-]+\.ts\.net", self.passkey_rp_id
            ):
                raise ValueError("private passkey RP ID must be a Tailscale device domain")
            if self.passkey_origin != "https://" + self.passkey_rp_id:
                raise ValueError("passkey origin must exactly match the configured HTTPS RP ID")
            if not self.passkey_enrollment_principals:
                raise ValueError("owner-approved enrollment principals required")
            for principal in self.passkey_enrollment_principals:
                if str(UUID(principal)) != principal:
                    raise ValueError("invalid passkey enrollment principal")
        if self.email_verification_enabled:
            if self.environment not in LOCAL_ONLY_ENVIRONMENTS or not self.password_login_enabled:
                raise ValueError("email verification requires local/test password sign-in")
            if not self.gmail_sender or not self.gmail_app_password:
                raise ValueError("Gmail sender and app credential required")
            password = self.gmail_app_password.get_secret_value()
            if len(password) != 16 or not password.isascii() or not password.isalnum():
                raise ValueError("Gmail requires its dedicated 16-character app credential")
            try:
                key = base64.b64decode(
                    self.email_verification_key.get_secret_value() if self.email_verification_key else "",
                    validate=True,
                )
            except ValueError as error:
                raise ValueError("email verification requires a base64 32-byte key") from error
            if len(key) != 32:
                raise ValueError("email verification requires a base64 32-byte key")
        if self.local_totp_enabled:
            if self.environment not in LOCAL_ONLY_ENVIRONMENTS or not self.password_login_enabled:
                raise ValueError("local TOTP requires local/test password sign-in")
            try:
                key = base64.b64decode(
                    self.local_totp_key.get_secret_value() if self.local_totp_key else "", validate=True
                )
            except ValueError as error:
                raise ValueError("local TOTP requires a base64 32-byte encryption key") from error
            if len(key) != 32:
                raise ValueError("local TOTP requires a base64 32-byte encryption key")
        if self.local_connector_auth_enabled and self.environment not in LOCAL_ONLY_ENVIRONMENTS:
            raise ValueError("local connector credentials are forbidden outside local/test")
        if self.password_login_enabled and (self.redis_url is None or self.auth_mode is AuthMode.LOCAL):
            raise ValueError("password login requires Redis and an external primary sign-in mode")
        if self.auth_mode is AuthMode.LOCAL:
            if self.environment not in LOCAL_ONLY_ENVIRONMENTS:
                raise ValueError("local auth mode is forbidden outside local/test environments")
            secret = self.dev_jwt_secret.get_secret_value() if self.dev_jwt_secret else ""
            if len(secret) < 32:
                raise ValueError("dev_jwt_secret must be at least 32 characters in local auth mode")
        if self.auth_mode is AuthMode.GOOGLE and not self.google_web_client_id:
            raise ValueError("google auth mode requires google_web_client_id")
        if self.auth_mode is AuthMode.ENTRA and not (self.entra_issuer and self.entra_jwks_url):
            raise ValueError("entra auth mode requires entra_issuer and entra_jwks_url")
        if self.environment is Environment.PRODUCTION and self.case_status_write_enabled:
            # The only business write needs a separate, recorded approval (DATA-D06), not an env var.
            raise ValueError("case_status_write_enabled cannot be set by environment in production")
        if self.page_size_default > self.page_size_max:
            raise ValueError("page_size_default exceeds page_size_max")
        if self.environment not in LOCAL_ONLY_ENVIRONMENTS and self.ocr_backend == "tesseract":
            raise ValueError("the tesseract OCR backend is local/test only")

        if self.environment not in LOCAL_ONLY_ENVIRONMENTS:
            # MFA step-up cannot be configured away outside local/test (SPR-005).
            required = {
                "approval:decide",
                "tenant:admin",
                "breakglass:activate",
                "operation:reconcile",
            }
            if not required.issubset(self.mfa_step_up_permissions):
                raise ValueError("mfa_step_up_permissions must include the privileged baseline")
        if self.rate_limit_backend == "redis" and self.redis_url is None:
            raise ValueError("rate_limit_backend=redis requires redis_url")
        forbidden = {
            "TENANT_ADMIN",
            "PLATFORM_OPERATOR",
            "AUDITOR",
            "BREAK_GLASS",
            "INTEGRATION",
        }
        if forbidden.intersection(self.delegable_roles):
            raise ValueError("administrative, audit, emergency and integration roles are not delegable")
        if self.environment not in LOCAL_ONLY_ENVIRONMENTS and not (
            self.data_encryption_key and self.event_signing_key
        ):
            raise ValueError("data_encryption_key and event_signing_key are required outside local/test")
        if self.queue_backend == "servicebus" and not self.servicebus_namespace:
            raise ValueError("queue_backend=servicebus requires servicebus_namespace")
        if self.environment not in LOCAL_ONLY_ENVIRONMENTS and self.notification_backend == "file":
            raise ValueError("the file notification sink is a local development adapter")
        if self.environment not in LOCAL_ONLY_ENVIRONMENTS:
            if not self.bank_base_url.startswith("https://"):
                raise ValueError("bank_base_url must use https outside local/test (SPR-014)")
            if self.connector_credentials is None:
                raise ValueError("connector_credentials are required outside local/test")
            if self.malware_scanner == "local-test":
                raise ValueError("the local test signature scanner is not antivirus; configure clamd")
            if self.blob_backend == "local":
                raise ValueError("local blob storage is a development adapter; configure azure")
            if self.retrieval_backend == "local":
                raise ValueError("local BM25 retrieval is a development adapter; configure azure search")
            if self.model_provider == "mock":
                raise ValueError(
                    "the mock model provider is SYNTHETIC; configure an approved model deployment"
                )
            if not self.require_promoted_configuration:
                raise ValueError("require_promoted_configuration must be true outside local/test")
        if self.model_provider == "azure_openai" and not (
            self.azure_openai_endpoint
            and self.azure_openai_endpoint.startswith("https://")
            and self.azure_openai_deployment
            and self.azure_openai_api_key
        ):
            raise ValueError("model_provider=azure_openai requires an https endpoint, deployment and api key")
        if self.retrieval_backend == "azure" and not (
            self.azure_search_endpoint
            and self.azure_search_endpoint.startswith("https://")
            and self.azure_search_api_key
        ):
            raise ValueError("retrieval_backend=azure requires an https azure_search_endpoint and api key")
        if self.malware_scanner == "clamd" and not (self.clamd_host and self.clamd_port):
            raise ValueError("malware_scanner=clamd requires clamd_host and clamd_port")
        if self.blob_backend == "azure" and not (
            self.azure_blob_account_url and self.azure_blob_account_url.startswith("https://")
        ):
            raise ValueError("blob_backend=azure requires an https azure_blob_account_url")
        return self

    def connector_credentials_map(self) -> dict[str, str]:
        if self.connector_credentials is None:
            return dict(LOCAL_DEV_CONNECTOR_CREDENTIALS)
        parsed = json.loads(self.connector_credentials.get_secret_value())
        if not isinstance(parsed, dict):
            raise ValueError("connector_credentials must be a JSON object")
        return {str(k): str(v) for k, v in parsed.items()}

    def data_key(self) -> bytes:
        return _key_bytes(self.data_encryption_key, LOCAL_DEV_DATA_KEY, exact=32)

    def signing_key(self) -> bytes:
        return _key_bytes(self.event_signing_key, LOCAL_DEV_SIGNING_KEY, exact=None)


# Published, LOCAL/TEST-ONLY keys: Settings refuses to fall back to them in any other environment.
LOCAL_DEV_DATA_KEY = "bG9jYWwtZGV2LW9ubHktZGF0YS1rZXktMzJieXRlcyE"
LOCAL_DEV_CONNECTOR_CREDENTIALS = {
    "synthetic-bank-a": "mock-key-a",
    "synthetic-bank-b": "mock-key-b",
}
LOCAL_DEV_SIGNING_KEY = "bG9jYWwtZGV2LW9ubHktZXZlbnQtc2lnbmluZy1rZXktMzJieXRlcy0w"


def _key_bytes(value: SecretStr | None, fallback: str, exact: int | None) -> bytes:
    raw = value.get_secret_value() if value else fallback
    key = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    if exact is not None and len(key) != exact:
        raise ValueError(f"key must decode to exactly {exact} bytes")
    if len(key) < 32:
        raise ValueError("key must decode to at least 32 bytes")
    return key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # values come from the environment
