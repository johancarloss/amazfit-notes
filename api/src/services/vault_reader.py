from datetime import datetime, timezone
from pathlib import Path

from src.schemas.folder import FolderItem
from src.schemas.note import NoteMetadata


class VaultReader:
    def __init__(self, vault_path: str, allowed_folders: list[str]) -> None:
        self._vault = Path(vault_path).resolve()
        self._allowed = allowed_folders

        if not self._vault.is_dir():
            raise ValueError(f"Vault path does not exist: {self._vault}")

    def _validate_path(self, relative_path: str) -> Path:
        """Resolve path and ensure it's within vault and allowed folders."""
        cleaned = relative_path.strip("/")
        if not cleaned:
            raise ValueError("Empty path")

        resolved = (self._vault / cleaned).resolve()

        if not str(resolved).startswith(str(self._vault)):
            raise PermissionError(f"Path traversal blocked: {relative_path}")

        top_folder = cleaned.split("/")[0]
        if top_folder not in self._allowed:
            raise PermissionError(f"Folder not allowed: {top_folder}")

        return resolved

    def _get_modified(self, path: Path) -> str:
        """Get file modification time as ISO 8601."""
        mtime = path.stat().st_mtime
        return datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

    def _count_notes(self, folder: Path) -> int:
        """Count .md files recursively in a folder."""
        return sum(1 for f in folder.rglob("*.md") if f.is_file())

    def _extract_title(self, content: str, filename: str) -> str:
        """Extract title from first H1 heading or fall back to filename."""
        for line in content.split("\n"):
            stripped = line.strip()
            if stripped.startswith("# ") and not stripped.startswith("##"):
                return stripped[2:].strip()
        return filename.removesuffix(".md")

    def _extract_preview(self, content: str, max_chars: int = 120) -> str:
        """Extract first non-heading, non-empty line as preview."""
        for line in content.split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and stripped != "---":
                text = stripped.lstrip("- ").lstrip("> ").lstrip("* ")
                return text[:max_chars]
        return ""

    def list_root_folders(self) -> list[FolderItem]:
        """List allowed top-level folders."""
        items: list[FolderItem] = []
        for folder_name in self._allowed:
            folder_path = self._vault / folder_name
            if folder_path.is_dir():
                items.append(
                    FolderItem(
                        name=folder_name,
                        path=folder_name,
                        type="folder",
                        note_count=self._count_notes(folder_path),
                        modified=self._get_modified(folder_path),
                    )
                )
        return items

    def list_folder(self, relative_path: str) -> list[FolderItem]:
        """List contents of a folder (subfolders + .md files)."""
        folder = self._validate_path(relative_path)

        if not folder.is_dir():
            raise FileNotFoundError(f"Not a folder: {relative_path}")

        items: list[FolderItem] = []

        entries = sorted(folder.iterdir(), key=lambda p: (p.is_file(), p.name))
        for entry in entries:
            rel = str(entry.relative_to(self._vault))

            if entry.is_dir() and not entry.name.startswith("."):
                items.append(
                    FolderItem(
                        name=entry.name,
                        path=rel,
                        type="folder",
                        note_count=self._count_notes(entry),
                        modified=self._get_modified(entry),
                    )
                )
            elif entry.is_file() and entry.suffix == ".md":
                content = entry.read_text(encoding="utf-8")
                items.append(
                    FolderItem(
                        name=self._extract_title(content, entry.name),
                        path=rel,
                        type="note",
                        modified=self._get_modified(entry),
                    )
                )

        return items

    def read_note(self, relative_path: str) -> tuple[str, NoteMetadata]:
        """Read .md file content and metadata."""
        note_path = self._validate_path(relative_path)

        if not note_path.is_file():
            raise FileNotFoundError(f"Note not found: {relative_path}")

        if note_path.suffix != ".md":
            raise ValueError(f"Not a markdown file: {relative_path}")

        content = note_path.read_text(encoding="utf-8")
        stat = note_path.stat()

        metadata = NoteMetadata(
            title=self._extract_title(content, note_path.name),
            path=str(note_path.relative_to(self._vault)),
            preview=self._extract_preview(content),
            modified=self._get_modified(note_path),
            size_bytes=stat.st_size,
        )

        return content, metadata
