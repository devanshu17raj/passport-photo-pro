import json
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import io

from app.database import get_db
from app.limiter import limiter
from app.models.record import GenerationRecord
from app.services.image_service import (
    ImageProcessingError, PhotoSpec, process_photo, build_pdf
)

router = APIRouter(tags=["photos"])


def get_session_id(request: Request) -> str:
    sid = request.cookies.get("session_id")
    if not sid:
        sid = str(uuid.uuid4())
    return sid


@router.post("/process", summary="Generate passport photo PDF")
@limiter.limit("10/minute")
async def process(
    request: Request,
    photos: list[UploadFile] = File(..., description="Photo file(s), max 5"),
    width_mm: float = Form(35.0),
    height_mm: float = Form(45.0),
    bg_color: str = Form("#FFFFFF"),
    country: str = Form(""),
    document_type: str = Form(""),
    copies: str = Form("[]"),          # JSON array of ints
    skip_bg_removal: bool = Form(False),
    db: AsyncSession = Depends(get_db),
):
    # --- Validate file count ---
    if not photos:
        raise HTTPException(status_code=400, detail="No photos uploaded.")
    if len(photos) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 photos per request.")

    # --- Validate dimensions ---
    if not (0 < width_mm <= 200) or not (0 < height_mm <= 200):
        raise HTTPException(status_code=422, detail="Invalid photo dimensions.")

    # --- Parse copies ---
    try:
        copies_list: list[int] = json.loads(copies) if copies.strip() else []
        copies_list = [max(1, min(int(c), 30)) for c in copies_list]
    except Exception:
        copies_list = []

    # Pad/trim to match file count
    while len(copies_list) < len(photos):
        copies_list.append(6)
    copies_list = copies_list[: len(photos)]

    spec = PhotoSpec(
        width_mm=width_mm,
        height_mm=height_mm,
        bg_color=bg_color if bg_color.startswith("#") else "#FFFFFF",
    )

    # --- Read & process each photo in thread pool (rembg is CPU-bound) ---
    processed_imgs = []
    for upload in photos:
        data = await upload.read()
        try:
            img = await asyncio.get_event_loop().run_in_executor(
                None, process_photo, data, spec, skip_bg_removal
            )
            processed_imgs.append(img)
        except ImageProcessingError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception:
            raise HTTPException(status_code=500, detail="Unexpected error processing image.")

    # --- Build PDF (CPU-bound → thread pool) ---
    try:
        pdf_bytes, meta = await asyncio.get_event_loop().run_in_executor(
            None, build_pdf, processed_imgs, spec, copies_list
        )
    except ImageProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # --- Persist history record ---
    session_id = get_session_id(request)
    try:
        record = GenerationRecord(
            session_id=session_id,
            country=country[:64] or None,
            document_type=document_type[:64] or None,
            photo_width_mm=width_mm,
            photo_height_mm=height_mm,
            total_copies=meta["total_copies"],
            num_pages=meta["num_pages"],
            pdf_data=pdf_bytes,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        record_id = record.id
    except Exception:
        await db.rollback()
        record_id = None

    # --- Stream PDF response ---
    safe_doc = (document_type or "photo").replace(" ", "_").replace("/", "-")
    filename = f"passport_{safe_doc}_{width_mm}x{height_mm}mm.pdf"

    response = StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Record-Id": str(record_id) if record_id else "",
        },
    )
    # Set session cookie if new
    response.set_cookie("session_id", session_id, max_age=60 * 60 * 24 * 30, httponly=True, samesite="lax")
    return response