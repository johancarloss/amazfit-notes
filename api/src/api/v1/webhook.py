import asyncio
import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from src.config import Settings
from src.dependencies import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/webhook/github")
async def github_webhook(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict:
    if not settings.webhook_secret:
        raise HTTPException(status_code=501, detail="Not configured")

    body = await request.body()

    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Unauthorized")

    expected = hmac.new(
        settings.webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    received = signature_header.removeprefix("sha256=")
    if not hmac.compare_digest(expected, received):
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "-C", settings.vault_path, "pull", "--ff-only",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        logger.info("Vault pull: %s", stdout.decode().strip())
        if proc.returncode != 0:
            logger.error("Vault pull failed: %s", stderr.decode().strip())
    except asyncio.TimeoutError:
        logger.error("Vault pull timed out")
        return {"status": "timeout"}

    return {"status": "ok" if proc.returncode == 0 else "error"}
