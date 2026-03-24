from pydantic import BaseModel


class FolderItem(BaseModel):
    name: str
    path: str
    type: str  # "folder" or "note"
    note_count: int = 0
    modified: str  # ISO 8601


class FolderListResponse(BaseModel):
    path: str
    items: list[FolderItem]
