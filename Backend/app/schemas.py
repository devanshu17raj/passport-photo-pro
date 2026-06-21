from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class PhotoDimensions(BaseModel):
    width_mm: float = Field(35.0, gt=0, le=200, description="Photo width in millimetres")
    height_mm: float = Field(45.0, gt=0, le=200, description="Photo height in millimetres")
    bg_color: str = Field("#FFFFFF", description="Background hex color")
    country: Optional[str] = Field(None, max_length=64)
    document_type: Optional[str] = Field(None, max_length=64)
    copies: list[int] = Field(default_factory=lambda: [6], description="Copy count per photo")
    skip_bg_removal: bool = False

    @field_validator("bg_color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("#") or len(v) not in (4, 7):
            return "#FFFFFF"
        return v

    @field_validator("copies")
    @classmethod
    def clamp_copies(cls, v: list[int]) -> list[int]:
        return [max(1, min(c, 30)) for c in v]


class GenerationRecordOut(BaseModel):
    id: int
    created_at: datetime
    country: Optional[str]
    document_type: Optional[str]
    photo_width_mm: float
    photo_height_mm: float
    total_copies: int
    num_pages: int

    model_config = {"from_attributes": True}


class PresetDocument(BaseModel):
    name: str
    width_mm: float
    height_mm: float
    bg_color: str
    notes: str


class CountryPreset(BaseModel):
    flag: str
    documents: list[PresetDocument]


class HealthResponse(BaseModel):
    status: str
    version: str