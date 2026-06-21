import io
import uuid
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.record import GenerationRecord
from app.schemas import GenerationRecordOut

router = APIRouter(tags=["history"])


def _get_sid(request: Request) -> str | None:
    return request.cookies.get("session_id")


@router.get("/history", response_model=list[GenerationRecordOut], summary="Get generation history")
async def get_history(request: Request, db: AsyncSession = Depends(get_db)):
    """Returns up to 20 most recent generations for the current session."""
    sid = _get_sid(request)
    if not sid:
        return []

    result = await db.execute(
        select(GenerationRecord)
        .where(GenerationRecord.session_id == sid)
        .order_by(GenerationRecord.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.get("/history/{record_id}/download", summary="Re-download a past PDF")
async def download_history(record_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    sid = _get_sid(request)
    if not sid:
        raise HTTPException(status_code=403, detail="No session found.")

    result = await db.execute(
        select(GenerationRecord).where(
            GenerationRecord.id == record_id,
            GenerationRecord.session_id == sid,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    if not record.pdf_data:
        raise HTTPException(status_code=404, detail="PDF data not available.")

    safe_doc = (record.document_type or "photo").replace(" ", "_").replace("/", "-")
    filename = f"passport_{safe_doc}_{record.photo_width_mm}x{record.photo_height_mm}mm.pdf"

    return StreamingResponse(
        io.BytesIO(record.pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/history/{record_id}", summary="Delete a history record")
async def delete_record(record_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    sid = _get_sid(request)
    if not sid:
        raise HTTPException(status_code=403, detail="No session found.")

    result = await db.execute(
        select(GenerationRecord).where(
            GenerationRecord.id == record_id,
            GenerationRecord.session_id == sid,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")

    await db.delete(record)
    await db.commit()
    return {"deleted": True, "id": record_id}