from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from src.api.v1.router import v1_router
from src.config import Settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    vault = Path(settings.vault_path)
    if not vault.is_dir():
        raise RuntimeError(f"Vault not found: {vault}")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Amazfit Notes API",
        version="1.0.0",
        description="Serves Obsidian markdown notes as structured blocks for Amazfit smartwatch",
        lifespan=lifespan,
    )
    app.include_router(v1_router)
    return app


app = create_app()
