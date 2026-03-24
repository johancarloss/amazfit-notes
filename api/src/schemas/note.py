from pydantic import BaseModel


class NoteMetadata(BaseModel):
    title: str
    path: str
    preview: str
    modified: str  # ISO 8601
    size_bytes: int
