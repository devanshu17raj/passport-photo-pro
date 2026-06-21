import json
import os
from functools import lru_cache
from fastapi import APIRouter

router = APIRouter(tags=["presets"])

PRESETS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "presets.json")


@lru_cache(maxsize=1)
def _load_presets() -> dict:
    with open(PRESETS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/presets", summary="Get all country/document presets")
async def get_presets():
    """Returns all supported countries and their document photo specifications."""
    return _load_presets()