from datetime import datetime
from sqlalchemy import Integer, String, Float, DateTime, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    photo_width_mm: Mapped[float] = mapped_column(Float, nullable=False)
    photo_height_mm: Mapped[float] = mapped_column(Float, nullable=False)
    total_copies: Mapped[int] = mapped_column(Integer, default=6)
    num_pages: Mapped[int] = mapped_column(Integer, default=1)
    pdf_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)