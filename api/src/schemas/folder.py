from typing import Literal

from pydantic import BaseModel


class FolderItem(BaseModel):
    name: str
    path: str
    type: Literal["folder", "note"]
    note_count: int = 0
    modified: str  # ISO 8601


class FolderListResponse(BaseModel):
    path: str
    items: list[FolderItem]
