from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    vault_path: str  # Required — set via AMAZFIT_VAULT_PATH in .env
    api_key: str     # Required — set via AMAZFIT_API_KEY in .env
    webhook_secret: str = ""
    host: str = "127.0.0.1"
    port: int = 8100
    watch_folder: str = "Watch"
    allowed_folders: list[str] = ["Watch", "Diarios", "Projetos"]
    max_note_size_bytes: int = 100_000
    max_blocks: int = 200

    model_config = {"env_prefix": "AMAZFIT_", "env_file": ".env"}
