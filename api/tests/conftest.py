import pytest
from fastapi.testclient import TestClient

from src.config import Settings
from src.dependencies import get_settings
from src.main import app


def _test_settings() -> Settings:
    return Settings(
        vault_path="/home/ubuntu/obisidian-vault",
        api_key="test-key",
        webhook_secret="test-secret",
    )


@pytest.fixture
def settings() -> Settings:
    return _test_settings()


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_settings] = _test_settings
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-API-Key": "test-key"}
