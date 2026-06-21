from fastapi import APIRouter
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok", "version": "1.0.0"}