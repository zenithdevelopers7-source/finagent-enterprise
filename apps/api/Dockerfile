# Multi-stage, non-root API image (prompt §34). Pin the base by digest in CI-built release images.
FROM python:3.12-slim AS build
WORKDIR /build
RUN python -m pip install --no-cache-dir --upgrade pip==26.2.2
COPY pyproject.toml requirements.lock ./
COPY src ./src
RUN pip install --no-cache-dir --prefix=/install -c requirements.lock ".[azure]"

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN python -m pip install --no-cache-dir --upgrade pip==26.2.2
RUN apt-get update \
 && apt-get install -y --no-install-recommends libseccomp2 \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin finagent \
 && mkdir -p /data/blobs && chown 10001:10001 /data/blobs
COPY --from=build /install /usr/local
RUN python -c "import azure.identity, azure.storage.blob, azure.servicebus"
COPY alembic.ini /app/alembic.ini
COPY src/finagent/database/migrations /app/src/finagent/database/migrations
WORKDIR /app
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health/live').status==200 else 1)"
CMD ["python", "-m", "uvicorn", "finagent.api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
