import hashlib
import hmac
import subprocess

from fastapi import APIRouter, Depends, HTTPException, Request

from src.config import Settings
from src.dependencies import get_settings

router = APIRouter()


@router.post("/webhook/github")
async def github_webhook(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> dict:
    if not settings.webhook_secret:
        raise HTTPException(status_code=501, detail="Webhook secret not configured")

    body = await request.body()

    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing signature")

    expected = hmac.new(
        settings.webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    received = signature_header.removeprefix("sha256=")
    if not hmac.compare_digest(expected, received):
        raise HTTPException(status_code=401, detail="Invalid signature")

    result = subprocess.run(
        ["git", "-C", settings.vault_path, "pull", "--ff-only"],
        capture_output=True,
        text=True,
        timeout=30,
    )

    return {
        "status": "ok" if result.returncode == 0 else "error",
        "output": result.stdout.strip(),
        "error": result.stderr.strip() if result.returncode != 0 else "",
    }
