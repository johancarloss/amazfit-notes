from pathlib import Path

from fastapi import APIRouter, Depends

from src.config import Settings
from src.dependencies import get_settings

router = APIRouter()


@router.get("/health")
async def health_check(settings: Settings = Depends(get_settings)) -> dict:
    vault = Path(settings.vault_path)
    note_count = sum(1 for _ in vault.rglob("*.md")) if vault.is_dir() else 0

    return {
        "status": "ok",
        "vault_exists": vault.is_dir(),
        "note_count": note_count,
    }
