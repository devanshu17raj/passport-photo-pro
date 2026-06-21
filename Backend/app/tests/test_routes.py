"""
Integration tests for FastAPI routes.
Run with: pytest backend/app/tests/ -v
"""
import io
import json
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from PIL import Image

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def app():
    from main import create_app
    return create_app()


@pytest.fixture
def sample_image_bytes():
    img = Image.new("RGB", (300, 400), (180, 140, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_health(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── Presets ───────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_get_presets(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert "India" in data
    assert "USA" in data
    assert "documents" in data["India"]
    # India passport should be 35x45
    india_passport = next(d for d in data["India"]["documents"] if d["name"] == "Passport")
    assert india_passport["width_mm"] == 35
    assert india_passport["height_mm"] == 45


# ── History (empty session) ───────────────────────────────────────────────────

@pytest.mark.anyio
async def test_history_empty(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/history")
    assert resp.status_code == 200
    assert resp.json() == []


# ── Process (mocked pipeline) ─────────────────────────────────────────────────

def _make_pdf_bytes() -> bytes:
    """Generate a minimal valid PDF-like bytes for mocking."""
    img = Image.new("RGB", (100, 100), "white")
    buf = io.BytesIO()
    img.save(buf, format="PDF")
    buf.seek(0)
    return buf.read()


@pytest.mark.anyio
async def test_process_no_file(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/process")
    assert resp.status_code in (400, 422)


@pytest.mark.anyio
async def test_process_too_many_files(app, sample_image_bytes):
    files = [("photos", (f"img{i}.jpg", sample_image_bytes, "image/jpeg")) for i in range(6)]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/process", files=files)
    assert resp.status_code == 400
    assert "Maximum 5" in resp.json()["detail"]


@pytest.mark.anyio
async def test_process_invalid_dimensions(app, sample_image_bytes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/process",
            files=[("photos", ("img.jpg", sample_image_bytes, "image/jpeg"))],
            data={"width_mm": "-5", "height_mm": "45"},
        )
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_process_success(app, sample_image_bytes):
    """Full process with mocked image pipeline (skip bg removal)."""
    with patch("app.routes.photos.process_photo") as mock_process, \
         patch("app.routes.photos.build_pdf") as mock_pdf:

        processed_img = Image.new("RGB", (413, 531), (200, 190, 180))
        mock_process.return_value = processed_img
        mock_pdf.return_value = (_make_pdf_bytes(), {
            "num_pages": 1, "photos_per_row": 6,
            "rows_per_page": 4, "total_copies": 6
        })

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/process",
                files=[("photos", ("photo.jpg", sample_image_bytes, "image/jpeg"))],
                data={
                    "width_mm": "35",
                    "height_mm": "45",
                    "copies": "[6]",
                    "country": "India",
                    "document_type": "Passport",
                    "skip_bg_removal": "true",
                },
            )

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"