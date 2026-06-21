"""
Tests for image_service.py — no rembg calls (mocked), pure pipeline logic.
Run with: pytest backend/app/tests/ -v
"""
import io
import pytest
from unittest.mock import patch, MagicMock
from PIL import Image

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

# ── CI FIX: Fake the rembg module before app imports load it ──────────────────
sys.modules['rembg'] = MagicMock()

from app.services.image_service import (
    ImageProcessingError,
    PhotoSpec,
    validate_image,
    composite_on_bg,
    enhance,
    process_photo,
    build_pdf,
    mm_to_px,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_image_bytes(width=300, height=400, fmt="PNG") -> bytes:
    img = Image.new("RGB", (width, height), color=(180, 120, 90))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.read()


def make_rgba_bytes(width=300, height=400) -> bytes:
    img = Image.new("RGBA", (width, height), color=(180, 120, 90, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


SPEC = PhotoSpec(width_mm=35, height_mm=45)


# ── mm_to_px ─────────────────────────────────────────────────────────────────

def test_mm_to_px_india_passport():
    # 35mm at 300 DPI ≈ 413px
    assert mm_to_px(35) == 413

def test_mm_to_px_usa_passport():
    # 51mm at 300 DPI ≈ 602px
    assert mm_to_px(51) == 602

def test_mm_to_px_minimum():
    assert mm_to_px(0.01) >= 1


# ── validate_image ────────────────────────────────────────────────────────────

def test_validate_ok():
    validate_image(make_image_bytes())  # should not raise

def test_validate_too_large():
    big = b"x" * (16 * 1024 * 1024)
    with pytest.raises(ImageProcessingError, match="too large"):
        validate_image(big)

def test_validate_corrupt():
    with pytest.raises(ImageProcessingError, match="Invalid or corrupted"):
        validate_image(b"not an image at all")

def test_validate_too_small():
    with pytest.raises(ImageProcessingError, match="too small"):
        validate_image(make_image_bytes(width=50, height=50))

def test_validate_extreme_aspect_ratio():
    with pytest.raises(ImageProcessingError, match="aspect ratio"):
        validate_image(make_image_bytes(width=1000, height=100))


# ── composite_on_bg ───────────────────────────────────────────────────────────

def test_composite_white():
    img = Image.new("RGBA", (100, 100), (255, 0, 0, 128))
    result = composite_on_bg(img, "#FFFFFF")
    assert result.mode == "RGB"

def test_composite_blue_bg():
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))  # fully transparent
    result = composite_on_bg(img, "#0000FF")
    # Pixel should be blue
    r, g, b = result.getpixel((50, 50))
    assert b == 255 and r == 0 and g == 0

def test_composite_rgb_input():
    img = Image.new("RGB", (100, 100), (200, 100, 50))
    result = composite_on_bg(img, "#FFFFFF")
    assert result.mode == "RGB"


# ── enhance ──────────────────────────────────────────────────────────────────

def test_enhance_returns_image():
    img = Image.new("RGB", (200, 200), (128, 128, 128))
    result = enhance(img)
    assert isinstance(result, Image.Image)
    assert result.size == (200, 200)


# ── process_photo (bg removal mocked) ────────────────────────────────────────

def test_process_photo_skip_bg():
    data = make_rgba_bytes()
    img = process_photo(data, SPEC, skip_bg_removal=True)
    assert isinstance(img, Image.Image)
    # Should be resized to spec dimensions (with border)
    assert img.size == (SPEC.cell_w, SPEC.cell_h)

@patch("app.services.image_service.rembg_remove")
def test_process_photo_with_bg_removal(mock_rembg):
    # Mock rembg to return a known RGBA image
    result_img = Image.new("RGBA", (300, 400), (200, 180, 160, 255))
    buf = io.BytesIO()
    result_img.save(buf, format="PNG")
    mock_rembg.return_value = buf.getvalue()

    data = make_image_bytes()
    img = process_photo(data, SPEC, skip_bg_removal=False)
    assert mock_rembg.called
    assert isinstance(img, Image.Image)

def test_process_photo_bad_file():
    with pytest.raises(ImageProcessingError):
        process_photo(b"garbage", SPEC, skip_bg_removal=True)


# ── build_pdf ─────────────────────────────────────────────────────────────────

def _make_processed_photo(spec: PhotoSpec) -> Image.Image:
    """Simulate a processed photo (already resized + bordered)."""
    img = Image.new("RGB", (spec.cell_w, spec.cell_h), (200, 190, 180))
    return img

def test_build_pdf_single_photo():
    photo = _make_processed_photo(SPEC)
    pdf_bytes, meta = build_pdf([photo], SPEC, [6])
    assert pdf_bytes[:4] == b"%PDF"
    assert meta["total_copies"] == 6
    assert meta["num_pages"] >= 1

def test_build_pdf_multiple_copies_overflow():
    photo = _make_processed_photo(SPEC)
    # 30 copies should overflow onto 2+ pages
    pdf_bytes, meta = build_pdf([photo], SPEC, [30])
    assert meta["total_copies"] == 30

def test_build_pdf_multiple_photos():
    photos = [_make_processed_photo(SPEC) for _ in range(3)]
    pdf_bytes, meta = build_pdf(photos, SPEC, [4, 4, 4])
    assert meta["total_copies"] == 12

def test_build_pdf_empty():
    with pytest.raises(ImageProcessingError, match="No photos"):
        build_pdf([], SPEC, [])

def test_build_pdf_returns_valid_pdf():
    photo = _make_processed_photo(SPEC)
    pdf_bytes, _ = build_pdf([photo], SPEC, [1])
    # Basic PDF magic bytes check
    assert b"%PDF" in pdf_bytes[:10]