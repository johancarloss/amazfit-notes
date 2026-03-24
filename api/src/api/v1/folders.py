from fastapi import APIRouter, Depends, HTTPException

from src.dependencies import get_vault_reader, verify_api_key
from src.schemas.folder import FolderListResponse
from src.services.vault_reader import VaultReader

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/folders", response_model=FolderListResponse)
async def list_root_folders(
    vault: VaultReader = Depends(get_vault_reader),
) -> FolderListResponse:
    items = vault.list_root_folders()
    return FolderListResponse(path="/", items=items)


@router.get("/folders/{path:path}", response_model=FolderListResponse)
async def list_folder_contents(
    path: str,
    vault: VaultReader = Depends(get_vault_reader),
) -> FolderListResponse:
    try:
        items = vault.list_folder(path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    return FolderListResponse(path=path, items=items)
