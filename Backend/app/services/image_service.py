"""
Image processing pipeline — 100% open source, no external APIs.
  - Background removal: rembg (U2-Net model, runs locally)
  - Enhancement: Pillow
  - PDF layout: Pillow's PDF export at 300 DPI (A4)
"""
import io
import logging
from dataclasses import dataclass

from PIL import Image, ImageOps, ImageEnhance
#from rembg import remove as rembg_remove
# ── PATH A: CI/CD Safety Block ───────────────────────────────────────────────
# This prevents the GitHub Actions container from crashing during test collection.
try:
    from rembg import remove as rembg_remove
except ImportError:
    # Fallback for CI/CD environments where rembg is excluded to save build time.
    # Pytest will safely mock this at runtime during testing.
    rembg_remove = None

logger = logging.getLogger(__name__)

# A4 at 300 DPI
A4_W_PX = 2480
A4_H_PX = 3508
DPI = 300
MM_TO_PX = DPI / 25.4  # ≈ 11.811 px/mm

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "BMP"}
MAX_BYTES = 15 * 1024 * 1024  # 15 MB


class ImageProcessingError(Exception):
    """Raised for user-facing image errors."""


def mm_to_px(mm: float) -> int:
    return max(1, round(mm * MM_TO_PX))


@dataclass
class PhotoSpec:
    width_mm: float
    height_mm: float
    border_px: int = 3
    bg_color: str = "#FFFFFF"
    spacing_px: int = 14
    margin_px: int = 40

    @property
    def width_px(self) -> int:
        return mm_to_px(self.width_mm)

    @property
    def height_px(self) -> int:
        return mm_to_px(self.height_mm)

    @property
    def cell_w(self) -> int:
        return self.width_px + 2 * self.border_px

    @property
    def cell_h(self) -> int:
        return self.height_px + 2 * self.border_px


# ── Validation ────────────────────────────────────────────────────────────────

def validate_image(data: bytes) -> None:
    if len(data) > MAX_BYTES:
        raise ImageProcessingError("File too large. Maximum is 15 MB.")
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception:
        raise ImageProcessingError("Invalid or corrupted image file.")

    img = Image.open(io.BytesIO(data))
    if img.format not in ALLOWED_FORMATS:
        raise ImageProcessingError(
            f"Unsupported format '{img.format}'. Upload JPEG, PNG, WEBP, or BMP."
        )
    w, h = img.size
    if w < 100 or h < 100:
        raise ImageProcessingError("Image too small — minimum 100×100 px.")
    if max(w / h, h / w) > 5:
        raise ImageProcessingError("Unusual aspect ratio. Upload a portrait/square photo.")


# ── Pipeline steps ────────────────────────────────────────────────────────────

def remove_background(data: bytes) -> Image.Image:
    """Run U2-Net via rembg. Returns RGBA image."""
    try:
        result = rembg_remove(data)
        return Image.open(io.BytesIO(result)).convert("RGBA")
    except Exception as exc:
        logger.error("rembg error: %s", exc)
        raise ImageProcessingError("Background removal failed — try a clearer, well-lit photo.")


def composite_on_bg(img: Image.Image, hex_color: str = "#FFFFFF") -> Image.Image:
    """Flatten RGBA onto solid background. Returns RGB."""
    h = hex_color.lstrip("#")
    rgb = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    bg = Image.new("RGB", img.size, rgb)
    if img.mode == "RGBA":
        bg.paste(img, mask=img.split()[3])
    else:
        bg.paste(img.convert("RGB"))
    return bg


def enhance(img: Image.Image) -> Image.Image:
    """Conservative enhancement — sharpness, contrast, brightness."""
    img = ImageEnhance.Sharpness(img).enhance(1.3)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Brightness(img).enhance(1.02)
    return img


def process_photo(data: bytes, spec: PhotoSpec, skip_bg_removal: bool = False) -> Image.Image:
    """Full pipeline: validate → bg removal → composite → enhance → resize → border."""
    validate_image(data)

    if skip_bg_removal:
        img = Image.open(io.BytesIO(data)).convert("RGBA")
    else:
        img = remove_background(data)

    img = composite_on_bg(img, spec.bg_color)
    img = enhance(img)
    img = img.resize((spec.width_px, spec.height_px), Image.LANCZOS)

    if spec.border_px > 0:
        img = ImageOps.expand(img, border=spec.border_px, fill=(200, 200, 200))

    return img


# ── Layout + PDF export ───────────────────────────────────────────────────────

def build_pdf(
    photos: list[Image.Image],
    spec: PhotoSpec,
    copies_per_photo: list[int],
) -> tuple[bytes, dict]:
    """
    Lay out photos onto A4 pages (300 DPI) and return (pdf_bytes, metadata).
    Photos flow left→right, top→bottom; overflow creates new pages automatically.
    """
    if not photos:
        raise ImageProcessingError("No photos to layout.")

    usable_w = A4_W_PX - 2 * spec.margin_px
    usable_h = A4_H_PX - 2 * spec.margin_px
    per_row = max(1, (usable_w + spec.spacing_px) // (spec.cell_w + spec.spacing_px))
    rows_per_page = max(1, (usable_h + spec.spacing_px) // (spec.cell_h + spec.spacing_px))

    # Flatten photos × copies into a single cell list
    cells: list[Image.Image] = []
    for photo, n in zip(photos, copies_per_photo):
        cells.extend([photo] * n)

    pages: list[Image.Image] = []
    page = Image.new("RGB", (A4_W_PX, A4_H_PX), "white")
    col = row = 0

    for cell in cells:
        if row >= rows_per_page:
            pages.append(page)
            page = Image.new("RGB", (A4_W_PX, A4_H_PX), "white")
            col = row = 0

        x = spec.margin_px + col * (spec.cell_w + spec.spacing_px)
        y = spec.margin_px + row * (spec.cell_h + spec.spacing_px)
        page.paste(cell, (x, y))
        col += 1
        if col >= per_row:
            col = 0
            row += 1

    pages.append(page)

    buf = io.BytesIO()
    if len(pages) == 1:
        pages[0].save(buf, format="PDF", dpi=(DPI, DPI))
    else:
        pages[0].save(
            buf, format="PDF", dpi=(DPI, DPI),
            save_all=True, append_images=pages[1:]
        )
    buf.seek(0)

    return buf.read(), {
        "num_pages": len(pages),
        "photos_per_row": per_row,
        "rows_per_page": rows_per_page,
        "total_copies": sum(copies_per_photo),
    }