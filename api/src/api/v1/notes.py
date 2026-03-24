from fastapi import APIRouter, Depends, HTTPException, Query

from src.config import Settings
from src.dependencies import get_settings, get_vault_reader, verify_api_key
from src.schemas.block import NoteBlocksResponse
from src.services.markdown_parser import MarkdownParser
from src.services.vault_reader import VaultReader

router = APIRouter(dependencies=[Depends(verify_api_key)])

_parser = MarkdownParser()


@router.get("/notes/{path:path}", response_model=NoteBlocksResponse)
async def get_note_blocks(
    path: str,
    max_blocks: int = Query(default=200, ge=1, le=500),
    vault: VaultReader = Depends(get_vault_reader),
    settings: Settings = Depends(get_settings),
) -> NoteBlocksResponse:
    try:
        content, metadata = vault.read_note(path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    if metadata.size_bytes > settings.max_note_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Note too large: {metadata.size_bytes} bytes (max {settings.max_note_size_bytes})",
        )

    blocks, truncated = _parser.parse(content, max_blocks=max_blocks)

    return NoteBlocksResponse(
        path=metadata.path,
        title=metadata.title,
        block_count=len(blocks),
        blocks=blocks,
        truncated=truncated,
    )
