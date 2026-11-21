"""Worker process loop (prompt Â§3 worker/, Â§34 graceful drain).

Each tick: relay the outbox -> consume events (inbox dedup) and execute the runs they name ->
recovery scan (queued / retry-due / crashed-owner runs) -> periodic escalation evaluation and
notification delivery. The database is the source of truth; the queue only lowers latency, so a
lost or duplicated message can delay work but never lose or repeat it (DIR-020).
"""

from __future__ import annotations

import logging
import os
import socket
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from finagent.core.config import LOCAL_ONLY_ENVIRONMENTS, Settings
from finagent.database.models import WorkflowRun
from finagent.database.session import session_factory, transaction
from finagent.documents.runtime import build_ocr_provider, build_store, sandbox_config
from finagent.integrations.factory import BankNotificationRouter, ConnectorFactory
from finagent.integrations.notifications.port import NotificationPort, build_notifier
from finagent.orchestration.faults import FaultInjector
from finagent.services.case_service import escalation
from finagent.services.document_service.processing import (
    ProcessingConfig,
    process_pending,
)
from finagent.services.governance_service import capability_incidents
from finagent.worker.consumer import Consumer, Handler, PermanentHandlerError
from finagent.worker.events import EventEnvelope
from finagent.worker.outbox_relay import relay_batch
from finagent.worker.queue import QueuePort, build_queue
from finagent.worker.runner import RunOutcome, WorkerDeps, execute_run, find_runnable

log = logging.getLogger("finagent.worker")
CONSUMER_NAME = "workflow-dispatcher"
RUN_EVENTS = frozenset({"workflow.started.v1", "workflow.resume_requested.v1"})


def _run_exists(s: Session, env: EventEnvelope) -> None:
    try:
        run_id = uuid.UUID(str(env.payload.get("run_id")))
    except ValueError as exc:
        raise PermanentHandlerError("RUN_ID_INVALID") from exc
    found = s.scalar(
        select(WorkflowRun.id).where(WorkflowRun.tenant_id == env.tenant_ref, WorkflowRun.id == run_id)
    )
    if found is None:  # tenant in the envelope must own the run (no cross-tenant dispatch)
        raise PermanentHandlerError("RUN_NOT_FOUND_IN_TENANT")


def default_worker_id() -> str:
    return f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:6]}"


@dataclass
class Worker:
    settings: Settings
    worker_id: str = field(default_factory=default_worker_id)
    notifier: NotificationPort | None = None
    queue: QueuePort | None = None
    faults: FaultInjector = field(default_factory=FaultInjector)
    escalation_interval_s: float = 60.0
    model_provider: Any = None  # None -> built from settings (mock locally, Azure OpenAI when approved)
    stop: threading.Event = field(default_factory=threading.Event)

    def __post_init__(self) -> None:
        if self.faults.rules and self.settings.environment not in LOCAL_ONLY_ENVIRONMENTS:
            raise RuntimeError("fault injection is only allowed in local/test")
        self.factory = session_factory(
            self.settings.database_url.get_secret_value(), self.settings.database_auth_mode
        )
        if self.notifier is None and self.settings.notification_backend == "bank":
            self.notifier = BankNotificationRouter(ConnectorFactory(self.settings, self.factory))
        self.notifier = self.notifier or build_notifier(
            self.settings.notification_backend, self.settings.notification_dir
        )
        self.queue = self.queue or build_queue(
            self.settings.queue_backend,
            self.factory,
            self.settings.servicebus_namespace,
            self.settings.servicebus_queue_name,
        )
        self.deps = WorkerDeps(
            self.factory,
            self.settings,
            self.notifier,
            self.worker_id,
            self.faults,
            model_provider=self.model_provider,
        )
        self.document_store = build_store(self.settings)
        self.processing = ProcessingConfig(
            sandbox_config(self.settings),
            self.settings.document_max_attempts,
            ocr=build_ocr_provider(self.settings),
        )
        handlers: dict[str, Handler] = {t: _run_exists for t in RUN_EVENTS}
        self.consumer = Consumer(
            CONSUMER_NAME,
            self.factory,
            self.queue,
            handlers,
            self.settings.signing_key(),
            max_deliveries=self.settings.consumer_max_deliveries,
        )
        self._last_escalation = 0.0

    def tick(self) -> dict[str, Any]:
        queue = self.queue
        if queue is None:
            raise RuntimeError("worker queue not initialised")
        stats: dict[str, Any] = {"runs": []}
        relay = relay_batch(
            self.factory,
            queue,
            self.settings.signing_key(),
            max_attempts=self.settings.outbox_max_attempts,
            fault=lambda point, event_type: self.faults.hit(point, event_type),
        )
        stats["published"] = relay.published
        consumed = self.consumer.poll()
        stats["consumed"], stats["duplicates"] = consumed.processed, consumed.duplicates
        stats["dead_lettered"] = consumed.dead_lettered
        targets: list[tuple[uuid.UUID, uuid.UUID]] = []
        for env in consumed.dispatched or []:
            targets.append((env.tenant_ref, uuid.UUID(str(env.payload["run_id"]))))
        targets += [t for t in find_runnable(self.factory) if t not in targets]
        for tenant_id, run_id in targets:
            if self.stop.is_set():
                break  # drain: unfinished work stays durable and is picked up after restart
            outcome = execute_run(self.deps, tenant_id, run_id)
            if outcome is not RunOutcome.BUSY:
                stats["runs"].append((str(run_id), outcome.value))
        if not self.stop.is_set():
            stats["documents"] = process_pending(self.factory, self.document_store, self.processing)
        if time.monotonic() - self._last_escalation >= self.escalation_interval_s:
            self._last_escalation = time.monotonic()
            with transaction(self.factory) as s:
                stats["escalated"] = len(escalation.evaluate_due(s))
            with transaction(self.factory) as s:
                stats["notifications"] = escalation.deliver_notifications(s, self.deps.notifier)
            with transaction(self.factory) as s:
                stats["incident_notifications"] = capability_incidents.deliver_notifications(
                    s, self.deps.notifier
                )
        return stats

    def run_forever(self, interval_s: float = 1.0) -> None:
        log.info("worker_started", extra={"worker_id": self.worker_id})
        while not self.stop.is_set():
            try:
                stats = self.tick()
                if stats["runs"] or stats["published"]:
                    log.info("worker_tick", extra={"stats": stats})
            except Exception as exc:  # keep the loop alive; durable state is untouched
                log.error("worker_tick_failed", extra={"error_type": type(exc).__name__})
            self.stop.wait(interval_s)
        log.info("worker_stopped", extra={"worker_id": self.worker_id})
