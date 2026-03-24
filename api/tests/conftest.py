import os

import pytest
from fastapi.testclient import TestClient

from src.config import Settings
from src.dependencies import get_settings, get_vault_reader
from src.main import app
from src.services.vault_reader import VaultReader

# Use env var or fallback for test vault path
_TEST_VAULT = os.environ.get("TEST_VAULT_PATH", "/home/ubuntu/obisidian-vault")


def _test_settings() -> Settings:
    return Settings(
        vault_path=_TEST_VAULT,
        api_key="test-key",
        webhook_secret="test-secret",
    )


def _test_vault_reader() -> VaultReader:
    s = _test_settings()
    return VaultReader(vault_path=s.vault_path, allowed_folders=s.allowed_folders)


@pytest.fixture
def settings() -> Settings:
    return _test_settings()


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_settings] = _test_settings
    app.dependency_overrides[get_vault_reader] = _test_vault_reader
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-API-Key": "test-key"}
