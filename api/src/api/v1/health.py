from pathlib import Path

from fastapi import APIRouter, Depends

from src.config import Settings
from src.dependencies import get_settings, verify_api_key

router = APIRouter()


@router.get("/health")
async def health_check(
    settings: Settings = Depends(get_settings),
    _: None = Depends(verify_api_key),
) -> dict:
    vault = Path(settings.vault_path)

    return {
        "status": "ok",
        "vault_ok": vault.is_dir(),
    }
