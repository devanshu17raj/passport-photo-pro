# ── Stage 1: dependency builder ────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime image ─────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

COPY . .

# Pre-download the LIGHTWEIGHT rembg model (u2netp, ~4.7MB) at build time.
# Far less memory-hungry than the full u2net (176MB) — critical for 512MB RAM limit.
RUN python -c "from rembg import new_session; new_session('u2netp')" \
    && echo "✓ rembg u2netp (lightweight) model cached"

# Limit ONNX Runtime thread count — prevents memory spikes from parallel
# intra-op threads, which matters a lot on single-core / low-RAM instances.
ENV OMP_NUM_THREADS=1
ENV ORT_NUM_THREADS=1

# Create data directory for SQLite — Render disk mounts here.
# Even without a disk mount, app can still write to /app/data/
RUN mkdir -p /app/data && chmod 755 /app/data

# Run as non-root
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--timeout-graceful-shutdown", "30"]
