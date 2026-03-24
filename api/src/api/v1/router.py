from fastapi import APIRouter

from src.api.v1 import folders, health, notes, webhook

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(health.router, tags=["health"])
v1_router.include_router(folders.router, tags=["folders"])
v1_router.include_router(notes.router, tags=["notes"])
v1_router.include_router(webhook.router, tags=["webhook"])
