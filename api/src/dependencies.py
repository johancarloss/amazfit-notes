from functools import lru_cache

from fastapi import Depends, Header, HTTPException

from src.config import Settings
from src.services.vault_reader import VaultReader


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_vault_reader(settings: Settings = Depends(get_settings)) -> VaultReader:
    return VaultReader(
        vault_path=settings.vault_path,
        allowed_folders=settings.allowed_folders,
    )


async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
